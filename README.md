# Agenda Médica UCI - Sistema de Gestión de Turnos

Sistema web para la gestión de turnos médicos en Unidades de Cuidados Intensivos. Funciona con **Firebase Firestore** (sincronización en tiempo real) y con **modo local** (localStorage) como respaldo automático. Diseño responsive para desktop, tablet y móvil.

## 🚀 Características

- **Sincronización en tiempo real** con Firebase Firestore (con fallback automático a modo local)
- **Gestión de médicos**: CRUD completo con fotos, especialidades, usuario y contraseña (hash)
- **Gestión de turnos**: tipos `Día`, `Noche` y `Especial / UCI` con horas automáticas
- **Calendario mensual** interactivo con leyenda y colores por tipo de turno
- **Vista de turnos por semana** con navegación entre periodos
- **Autenticación por roles**: administrador y médicos con permisos diferenciados
- **Reportes en PDF**: reporte mensual, historial por médico y certificado laboral, personales para cada médico
- **Backup** de datos en JSON descargable
- **Diseño responsive** optimizado para móvil, tablet y desktop
- **Tema claro / oscuro** con botón de cambio en el encabezado (se guarda la preferencia)
- **Modo offline**: funciona sin conexión usando localStorage

## 🔐 Credenciales (demo)

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin` | `admin123` |
| Médico (demo) | `jperez` / `mgarcia` / `clopez` | `medico123` |

> En modo local se crean automáticamente 3 médicos de ejemplo y 5 turnos la primera vez.

## 👤 Roles y permisos

| Acción | Administrador | Médico |
| --- | :---: | :---: |
| Ver panel de control y calendario | ✅ | ✅ |
| Ver médicos del equipo | ✅ | — |
| Ver turnos (mensual / semanal / diario) | ✅ | ✅ |
| Crear / editar / eliminar turnos | ✅ | — |
| Gestionar médicos (crear / editar / eliminar) | ✅ | — |
| Generar reportes y certificados PDF | ✅ (de cualquier médico) | ✅ (solo los propios) |
| Descargar backup de datos (JSON) | ✅ | — |

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES Modules)
- **Backend**: Firebase Firestore (CDN) + localStorage como fallback
- **Iconos**: Font Awesome 6 (local, sin CDN)
- **PDF**: jsPDF + jsPDF-autotable (local, sin CDN)

> Todos los recursos externos (iconos y PDF) están incluidos localmente, por lo que la aplicación funciona incluso sin conexión a internet (excepto la nube de Firebase).

## 📁 Estructura del proyecto

```
index.html                      # Página principal (semántica y accesible)
css/styles.css                  # Hoja de estilos única (base + responsive)
js/app.js                       # Orquestador principal + panel de control
js/utils.js                     # Helpers: tipos de turno, fechas locales, hash, escape
js/auth.js                      # Sesión, login, menús (escritorio y móvil), notificaciones
js/doctors.js                   # CRUD de médicos (solo admin)
js/shifts.js                    # CRUD de turnos (solo admin)
js/calendar.js                  # Vista previa mensual del panel de inicio
js/firebase-config.js           # Configuración real de Firebase (ignorada por git)
js/firebase-config.example.js   # Plantilla de configuración
js/services/data-manager.js     # Capa de datos unificada (Firestore + localStorage)
js/modules/pdf-generator.js     # Generación de reportes PDF
js/modules/reports.js           # Botones de documentos y selección de médico
assets/fontawesome/             # Font Awesome 6 local (iconos sin CDN)
assets/vendor/                  # jsPDF + autotable local
```

## 🔥 Configuración de Firebase (opcional)

La aplicación funciona sin Firebase usando el modo local automático. Para activar la nube:

1. Ve a [Firebase Console](https://console.firebase.google.com), crea un proyecto y habilita **Firestore Database**.
2. Copia `js/firebase-config.example.js` a `js/firebase-config.js` y pega tu configuración:

```javascript
const firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

3. Ajusta las **reglas de Firestore** para permitir lectura/escritura a tus colecciones (`doctors`, `shifts`). Si las reglas bloquean el acceso, la app muestra un banner y cae automáticamente a modo local.

> ⚠️ `js/firebase-config.js` está en `.gitignore`: nunca subas tus claves reales al repositorio.

## ▶️ Cómo ejecutar

Debido al uso de ES Modules, abre la app con un servidor local (no `file://`):

```bash
python -m http.server 8080
# o
npx serve
```

Luego visita `http://localhost:8080`.

## 👤 Roles

- **Administrador**: gestiona médicos y turnos, genera reportes y descarga backups.
- **Médico**: consulta el panel, ve los turnos y descarga documentos (reportes y certificados). No puede modificar datos.
