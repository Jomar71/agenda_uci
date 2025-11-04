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
        // Sincronizar datos entre pestañas
        window.addEventListener('storage', (e) => {
            console.log('🔄 Cambio en almacenamiento detectado:', e.key);
            if (e.key === 'doctors' || e.key === 'shifts' || e.key === 'currentUser') {
                this.refreshCurrentSection();
            }
        });

        // Evento personalizado para sincronización interna
        window.addEventListener('dataUpdated', (e) => {
            console.log('🔄 Actualización de datos interna:', e.detail?.key);
            this.refreshCurrentSection();
        });
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
            mobileMenuBtn.addEventListener('click', () => {
                nav.classList.toggle('active');
                console.log('📱 Menú móvil:', nav.classList.contains('active') ? 'abierto' : 'cerrado');
            });
        }

        // Cerrar menú al hacer clic en un link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (nav) {
                    nav.classList.remove('active');
                    console.log('📱 Menú móvil cerrado por navegación');
                }
            });
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
        if (window.doctorsManager) {
            window.doctorsManager.loadDoctors();
            console.log('✅ Médicos actualizados');
        }
        if (window.shiftsManager) {
            window.shiftsManager.renderCalendar();
            console.log('✅ Turnos actualizados');
        }
        if (window.calendarManager) {
            window.calendarManager.renderMonthlyPreview();
            console.log('✅ Calendario actualizado');
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