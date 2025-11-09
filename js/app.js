// Aplicación principal - VERSION COMPLETAMENTE CORREGIDA
class App {
    constructor() {
        this.currentSection = 'inicio';
        this.init();
    }

    init() {
        console.log('🚀 Inicializando aplicación...');
        this.setupEventListeners();
        this.setupModals();
        this.setupDataSync();
        this.initializeManagers();
        this.showSection('inicio');
        console.log('✅ Aplicación inicializada correctamente');
    }

    initializeManagers() {
        // Asegurar que los managers estén disponibles globalmente
        window.auth = auth;
        window.doctorsManager = doctorsManager;
        window.shiftsManager = shiftsManager;
        window.calendarManager = calendarManager;
        
        console.log('👥 Managers inicializados:', {
            auth: !!auth,
            doctors: !!doctorsManager,
            shifts: !!shiftsManager,
            calendar: !!calendarManager
        });
    }

    setupDataSync() {
        // Sincronizar datos entre pestañas y dispositivos
        window.addEventListener('storage', (e) => {
            console.log('🔄 Cambio en almacenamiento detectado:', e.key);
            if (e.key === 'doctors' || e.key === 'shifts' || e.key === 'currentUser') {
                console.log('🔄 Actualizando datos por cambio en localStorage...');
                this.refreshCurrentSection();
                // Forzar actualización de todos los managers
                this.forceDataRefresh();
                // Notificar a otros componentes
                window.dispatchEvent(new CustomEvent('dataSynced', {
                    detail: { key: e.key, source: 'storage' }
                }));
            }
        });

        // Evento personalizado para sincronización interna
        window.addEventListener('dataUpdated', (e) => {
            console.log('🔄 Actualización de datos interna:', e.detail?.key);
            this.refreshCurrentSection();
            this.forceDataRefresh();
            // Forzar sincronización cruzada entre managers
            this.crossSyncData(e.detail?.key);
        });

        // Evento personalizado para forzar actualización completa
        window.addEventListener('forceRefresh', () => {
            console.log('🔄 Forzando actualización completa desde evento personalizado');
            this.forceRefresh();
        });

        // Sincronización periódica cada 5 segundos para asegurar consistencia
        setInterval(() => {
            this.checkDataConsistency();
        }, 5000);
    }

    setupEventListeners() {
        console.log('🔧 Configurando eventos principales...');
        
        // Navegación principal
        this.setupNavigation();
        
        // Menú móvil
        this.setupMobileMenu();
        
        // Botones de administración
        this.setupAdminButtons();
        
        console.log('✅ Eventos principales configurados');
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                console.log('🧭 Navegando a sección:', section);
                this.showSection(section);
            });
        });
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const nav = document.querySelector('.nav');

        if (mobileMenuBtn && nav) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                nav.classList.toggle('active');
                console.log('📱 Menú móvil:', nav.classList.contains('active') ? 'abierto' : 'cerrado');

                // Cambiar icono del botón
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    if (nav.classList.contains('active')) {
                        icon.className = 'fas fa-times';
                    } else {
                        icon.className = 'fas fa-bars';
                    }
                }
            });
        }

        // Cerrar menú al hacer clic en un link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (nav) {
                    nav.classList.remove('active');
                    console.log('📱 Menú móvil cerrado por navegación');

                    // Resetear icono del botón
                    const icon = mobileMenuBtn?.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-bars';
                    }
                }
            });
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (nav && !nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                nav.classList.remove('active');
                console.log('📱 Menú móvil cerrado por click fuera');

                // Resetear icono del botón
                const icon = mobileMenuBtn?.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });

        // Cerrar menú al cambiar el tamaño de la ventana (pasar a desktop)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && nav) {
                nav.classList.remove('active');
                console.log('📱 Menú móvil cerrado por resize a desktop');

                // Resetear icono del botón
                const icon = mobileMenuBtn?.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });
    }

    setupAdminButtons() {
        // Backup de datos
        const backupBtn = document.getElementById('backup-data');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                console.log('💾 Solicitando backup...');
                if (window.shiftsManager) {
                    window.shiftsManager.exportToExcel();
                } else {
                    console.error('❌ shiftsManager no disponible');
                    auth.showNotification('Error: Sistema de turnos no disponible', 'error');
                }
            });
        }

        // Gestión desde admin panel
        const manageDoctorsBtn = document.getElementById('manage-doctors');
        const manageShiftsBtn = document.getElementById('manage-shifts');
        
        if (manageDoctorsBtn) {
            manageDoctorsBtn.addEventListener('click', () => {
                console.log('👨‍⚕️ Navegando a gestión de médicos desde admin');
                this.showSection('medicos');
            });
        }
        
        if (manageShiftsBtn) {
            manageShiftsBtn.addEventListener('click', () => {
                console.log('📅 Navegando a gestión de turnos desde admin');
                this.showSection('turnos');
            });
        }
    }

    setupModals() {
        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                console.log('📭 Modal cerrado por click fuera');
            }
        });

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                console.log('📭 Modal cerrado con ESC');
            }
        });
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showSection(sectionName) {
        console.log('🎯 Mostrando sección:', sectionName);
        
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remover active de todos los links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Mostrar sección seleccionada
        const sectionElement = document.getElementById(sectionName);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }

        // Activar link correspondiente
        const linkElement = document.querySelector(`[href="#${sectionName}"]`);
        if (linkElement) {
            linkElement.classList.add('active');
        }

        this.currentSection = sectionName;

        // Ejecutar acciones específicas por sección
        this.refreshCurrentSection();
        
        console.log('✅ Sección activada:', sectionName);
    }

    refreshCurrentSection() {
        console.log('🔄 Refrescando sección actual:', this.currentSection);
        
        switch(this.currentSection) {
            case 'inicio':
                if (window.calendarManager) {
                    window.calendarManager.renderMonthlyPreview();
                }
                if (window.doctorsManager) {
                    window.doctorsManager.updateStats();
                }
                break;
            case 'medicos':
                if (window.doctorsManager) {
                    window.doctorsManager.loadDoctors();
                }
                break;
            case 'turnos':
                if (window.shiftsManager) {
                    window.shiftsManager.renderCalendar();
                }
                break;
        }
    }

    // Método para forzar actualización (útil para debugging)
    forceRefresh() {
        console.log('🔄 Forzando actualización completa...');
        this.forceDataRefresh();
    }

    // Método para forzar actualización de datos en todos los managers
    forceDataRefresh() {
        console.log('🔄 Forzando actualización de datos...');

        // Actualizar médicos
        if (window.doctorsManager) {
            window.doctorsManager.loadDoctors();
            console.log('✅ Médicos actualizados');
        }

        // Actualizar turnos
        if (window.shiftsManager) {
            window.shiftsManager.loadShifts();
            window.shiftsManager.renderCalendar();
            console.log('✅ Turnos actualizados');
        }

        // Actualizar calendario mensual
        if (window.calendarManager) {
            window.calendarManager.renderMonthlyPreview();
            console.log('✅ Calendario actualizado');
        }

        // Actualizar estadísticas
        if (window.doctorsManager) {
            window.doctorsManager.updateStats();
            console.log('✅ Estadísticas actualizadas');
        }

        // Disparar evento personalizado para notificar a otros componentes
        window.dispatchEvent(new CustomEvent('dataRefreshed', {
            detail: { timestamp: Date.now() }
        }));
    }

    // Método para sincronización cruzada entre managers
    crossSyncData(changedKey) {
        console.log('🔄 Sincronización cruzada para:', changedKey);

        if (changedKey === 'doctors') {
            // Si cambiaron médicos, actualizar turnos que dependen de ellos
            if (window.shiftsManager) {
                window.shiftsManager.loadShifts();
                window.shiftsManager.renderCalendar();
                console.log('✅ Turnos sincronizados por cambio en médicos');
            }
            // Actualizar calendario mensual
            if (window.calendarManager) {
                window.calendarManager.renderMonthlyPreview();
                console.log('✅ Calendario sincronizado por cambio en médicos');
            }
        } else if (changedKey === 'shifts') {
            // Si cambiaron turnos, actualizar calendario
            if (window.calendarManager) {
                window.calendarManager.renderMonthlyPreview();
                console.log('✅ Calendario sincronizado por cambio en turnos');
            }
        }
    }

    // Método para verificar consistencia de datos periódicamente
    checkDataConsistency() {
        try {
            const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
            const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');

            // Verificar que los turnos tengan médicos válidos
            const doctorIds = new Set(doctors.map(d => d.id));
            const invalidShifts = shifts.filter(s => !doctorIds.has(s.doctorId));

            if (invalidShifts.length > 0) {
                console.warn('⚠️ Encontrados turnos con médicos inválidos:', invalidShifts.length);
                // Limpiar turnos inválidos
                const validShifts = shifts.filter(s => doctorIds.has(s.doctorId));
                localStorage.setItem('shifts', JSON.stringify(validShifts));
                console.log('✅ Turnos inválidos limpiados');

                // Notificar actualización
                window.dispatchEvent(new CustomEvent('dataUpdated', {
                    detail: { key: 'shifts', action: 'consistency-fix' }
                }));
            }
        } catch (error) {
            console.error('❌ Error en verificación de consistencia:', error);
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando aplicación...');
    window.app = new App();
});

// Funciones globales para acceso desde HTML
window.openLoginModal = () => {
    console.log('🔓 Abriendo modal de login');
    auth.openLoginModal();
};

window.openDoctorModal = (id) => {
    console.log('👨‍⚕️ Abriendo modal de médico:', id);
    doctorsManager.openDoctorModal(id);
};

window.openShiftModal = (id, date) => {
    console.log('📅 Abriendo modal de turno:', {id, date});
    shiftsManager.openShiftModal(id, date);
};

// Función de debug para desarrollo
window.debugData = () => {
    console.group('🔍 DEBUG - Datos Actuales');
    console.log('Médicos:', doctorsManager?.getDoctors());
    console.log('Turnos:', shiftsManager?.getShifts());
    console.log('Usuario actual:', auth?.getCurrentUser());
    console.log('Almacenamiento doctors:', localStorage.getItem('doctors'));
    console.log('Almacenamiento shifts:', localStorage.getItem('shifts'));
    console.log('Almacenamiento currentUser:', localStorage.getItem('currentUser'));
    console.groupEnd();
};

// Función para limpiar datos de desarrollo
window.clearDevelopmentData = () => {
    if (confirm('¿Estás seguro de limpiar todos los datos? Esto es solo para desarrollo.')) {
        localStorage.clear();
        location.reload();
    }
};