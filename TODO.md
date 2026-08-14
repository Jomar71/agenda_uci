# Estado del Proyecto

## ✅ Refactorización completada (revisión integral)

### Arquitectura
- [x] Reescrito `index.html`: HTML semántico, accesible y sin estilos inline masivos.
- [x] Consolidado el CSS en `css/styles.css` (se eliminaron `styles-dashboard.css` y `responsive.css`).
- [x] Capa de datos unificada en `js/services/data-manager.js` (Firestore + fallback a localStorage).
- [x] Helpers compartidos en `js/utils.js` (tipos de turno, fechas locales, escape, hash de contraseñas).

### Correcciones principales
- [x] Bug de fechas UTC: se sustituyó `toISOString().split('T')[0]` por formato local (`formatDateLocal`).
- [x] Colores de turnos estandarizados: `Día`, `Noche`, `Especial / UCI` (con compatibilidad de tipos antiguos).
- [x] Sincronización en tiempo real: suscripciones en cola que se activan al conectar Firebase.
- [x] Contraseñas nunca en texto plano: almacenadas como hash SHA-256 (con compatibilidad de verificación legada).
- [x] Protección XSS: `escapeHtml()` en toda inserción dinámica de contenido.
- [x] `.gitignore` ignora `js/firebase-config.js` (claves reales nunca se suben).
- [x] Eliminados archivos legacy muertos: `storage.js`, `firebase-service.js`, `firebase-service-simple.js`, `firestore-service.js`, `realtime-sync.js`, `doctors_new.js`, `data/*.json`.
- [x] Seed automático de datos demo en modo local (3 médicos, 5 turnos).
- [x] Navegación por hash, menú móvil (drawer), banner diagnóstico y backup JSON.
- [x] Validación de sintaxis con `node --check` en los 11 módulos JS (todo OK).
- [x] Verificación de IDs (estáticos + dinámicos), balance de etiquetas HTML y clases CSS.
- [x] Servidor local probado: todos los recursos responden 200.

### Pendiente
- [ ] Prueba visual/manual en navegador (desktop, tablet, móvil) con datos reales.
- [ ] Reglas de Firestore en consola para habilitar la nube (si se desea).
