# Agenda Médica UCI - Sistema de Gestión de Turnos

Sistema especializado para la gestión de turnos médicos en Unidades de Cuidados Intensivos, con sincronización en tiempo real y diseño responsive.

## 🚀 Características

- **Sincronización en Tiempo Real**: Usando Firebase Firestore para sincronización automática entre dispositivos
- **Gestión de Médicos**: CRUD completo de médicos con fotos y especialidades
- **Gestión de Turnos**: Sistema completo de turnos con diferentes tipos (guardia, consulta, emergencia, descanso)
- **Calendario Interactivo**: Vista mensual, semanal y diaria con drag & drop
- **Sistema de Autenticación**: Roles de administrador y médico con permisos diferenciados
- **Diseño Responsive**: Optimizado para móviles, tablets y desktop
- **Backup Automático**: Exportación de reportes en formato Excel
- **Modo Offline**: Funciona sin conexión usando localStorage como fallback

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Firestore (Realtime Database)
- **Autenticación**: Firebase Authentication
- **Storage**: Firebase Storage para imágenes
- **UI/UX**: Diseño responsive con CSS Grid y Flexbox
- **Iconos**: Font Awesome 6
- **Charts**: Implementación nativa (sin librerías externas)

## 📱 Funcionalidades

### Para Administradores
- Gestión completa de médicos (crear, editar, eliminar)
- Gestión completa de turnos
- Backup de datos en Excel
- Panel de administración
- Acceso a todas las funcionalidades

### Para Médicos
- Visualización de turnos asignados
- Edición de turnos propios
- Vista de calendario personal
- Perfil médico

### Funcionalidades Generales
- Calendario mensual en la página de inicio
- Búsqueda y filtrado de médicos
- Notificaciones en tiempo real
- Sincronización automática entre pestañas
- Modo oscuro automático (basado en preferencias del sistema)

## 🔥 Configuración de Firebase

### 1. Crear Proyecto Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Haz clic en "Crear proyecto"
3. Sigue los pasos del asistente
4. Habilita Google Analytics (opcional)

### 2. Configurar Firestore Database
1. En Firebase Console, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Elige modo "prueba" para desarrollo
4. Selecciona la ubicación más cercana

### 3. Configurar Authentication (Opcional)
1. Ve a "Authentication" → "Comenzar"
2. Habilita "Email/contraseña"
3. Configura otros proveedores si es necesario

### 4. Obtener Configuración
1. Ve a ⚙️ → "Configuración del proyecto"
2. En "Tus apps", haz clic en "Agregar app" → Web
3. Registra tu app y copia la configuración

### 5. Configurar Archivo Local
1. Copia `js/firebase-config.example.js` a `js/firebase-config.js`
2. Reemplaza los valores con tu configuración real de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "tu-api-key-real",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};