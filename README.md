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
- **Autenticación**: Sistema personalizado con roles
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

## 🚀 Instalación y Uso

### Prerrequisitos
- Navegador web moderno con soporte para ES6+
- Conexión a internet para sincronización en tiempo real
- Firebase project configurado (opcional, funciona con localStorage)

### Instalación
1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/agenda-uci.git
cd agenda-uci
```

2. Abre `index.html` en tu navegador web

### Configuración de Firebase (Opcional)
Si deseas usar sincronización en tiempo real:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Firestore Database
3. Copia las credenciales en `js/config.js`
4. Actualiza las reglas de seguridad en Firestore

## 📁 Estructura del Proyecto

```
agenda-uci/
├── index.html              # Página principal
├── css/
│   ├── styles.css         # Estilos principales
│   └── responsive.css     # Estilos responsive
├── js/
│   ├── app.js            # Aplicación principal
│   ├── auth.js           # Sistema de autenticación
│   ├── doctors.js        # Gestión de médicos
│   ├── shifts.js         # Gestión de turnos
│   ├── calendar.js       # Calendario mensual
│   ├── firestore-service.js # Servicio de Firebase
│   ├── firebase-config.js   # Configuración de Firebase
│   └── config.js         # Credenciales de Firebase
├── .gitignore            # Archivos ignorados por Git
├── README.md             # Este archivo
└── TODO.md              # Lista de tareas pendientes
```

## 🔐 Credenciales de Acceso

### Administrador
- Usuario: `admin`
- Contraseña: `admin123`

### Médicos de Ejemplo
Los médicos se crean automáticamente al iniciar la aplicación por primera vez.

## 📱 Responsive Design

El sistema está optimizado para:
- **Desktop**: > 1024px
- **Tablet**: 768px - 1024px
- **Mobile Grande**: 480px - 768px
- **Mobile**: < 480px

### Características Responsive
- Menú móvil con hamburguesa
- Modales adaptativos
- Calendarios con scroll horizontal en móviles
- Botones táctiles de 44px mínimo
- Tipografía escalable
- Optimización para iOS (evita zoom en inputs)

## 🔄 Sincronización en Tiempo Real

### Funcionamiento
- **Online**: Usa Firebase Firestore para sincronización instantánea
- **Offline**: Usa localStorage como fallback
- **Multi-pestaña**: Sincronización automática entre pestañas abiertas

### Eventos de Sincronización
- `shiftsRealtimeUpdate`: Cambios en turnos
- `doctorsRealtimeUpdate`: Cambios en médicos
- `dataUpdated`: Actualización general de datos
- `forceRefresh`: Actualización forzada

## 📊 Backup y Reportes

### Funcionalidad de Backup
- Exportación automática de reportes mensuales
- Formato CSV compatible con Excel
- Incluye horas trabajadas por médico
- Estadísticas de turnos por tipo

### Ubicación del Backup
Los archivos se descargan automáticamente en la carpeta de descargas del navegador.

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Firebase no funciona**
   - Verifica que `js/config.js` tenga las credenciales correctas
   - Asegúrate de que Firestore esté habilitado en Firebase Console

2. **Sincronización no funciona**
   - Verifica la conexión a internet
   - Revisa la consola del navegador por errores
   - Los datos se guardan localmente si Firebase falla

3. **Problemas en móviles**
   - Asegúrate de que el viewport esté configurado correctamente
   - Verifica que los botones sean lo suficientemente grandes

### Debug
Usa las funciones de debug disponibles en la consola:
```javascript
debugData();           // Muestra todos los datos actuales
clearDevelopmentData(); // Limpia todos los datos (solo desarrollo)
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

- **Autor**: Tu Nombre
- **Email**: tu-email@ejemplo.com
- **GitHub**: [tu-usuario](https://github.com/tu-usuario)

## 🔄 Versiones

### v1.0.0
- ✅ Sistema básico de gestión de turnos
- ✅ Autenticación con roles
- ✅ Calendario mensual
- ✅ Sincronización con Firebase
- ✅ Diseño responsive completo
- ✅ Backup automático

### Próximas Versiones
- [ ] Notificaciones push
- [ ] API REST para integración externa
- [ ] Dashboard con estadísticas avanzadas
- [ ] Modo oscuro manual
- [ ] Integración con calendario externo (Google Calendar, Outlook)
