// Aplicación principal - VERSION MEJORADA
class App {
    constructor() {
        this.currentSection = 'inicio';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupModals();
        this.setupDataSync();
        this.showSection('inicio');
        this.initializeManagers();
    }

    initializeManagers() {
        // Asegurar que los managers estén disponibles globalmente
        window.auth = auth;
        window.doctorsManager = doctorsManager;
        window.shiftsManager = shiftsManager;
        window.calendarManager = calendarManager;
    }

    setupDataSync() {
        // Sincronizar datos entre pestañas
        window.addEventListener('storage', (e) => {
            if (e.key === 'doctors' || e.key === 'shifts' || e.key === 'currentUser') {
                this.refreshCurrentSection();
            }
        });

        // Evento personalizado para sincronización interna
        window.addEventListener('dataUpdated', () => {
            this.refreshCurrentSection();
        });
    }

    setupEventListeners() {
        // Navegación principal
        this.setupNavigation();
        
        // Menú móvil
        this.setupMobileMenu();
        
        // Botones de administración
        this.setupAdminButtons();
    }

    setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
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
            });
        }

        // Cerrar menú al hacer clic en un link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
            });
        });
    }

    setupAdminButtons() {
        // Backup de datos
        const backupBtn = document.getElementById('backup-data');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                if (window.shiftsManager) {
                    window.shiftsManager.exportToExcel();
                }
            });
        }

        // Gestión desde admin panel
        const manageDoctorsBtn = document.getElementById('manage-doctors');
        const manageShiftsBtn = document.getElementById('manage-shifts');
        
        if (manageDoctorsBtn) {
            manageDoctorsBtn.addEventListener('click', () => {
                this.showSection('medicos');
            });
        }
        
        if (manageShiftsBtn) {
            manageShiftsBtn.addEventListener('click', () => {
                this.showSection('turnos');
            });
        }
    }

    setupModals() {
        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    showSection(sectionName) {
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
    }

    refreshCurrentSection() {
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
        if (window.doctorsManager) window.doctorsManager.loadDoctors();
        if (window.shiftsManager) window.shiftsManager.renderCalendar();
        if (window.calendarManager) window.calendarManager.renderMonthlyPreview();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Funciones globales para acceso desde HTML
window.openLoginModal = () => auth.openLoginModal();
window.openDoctorModal = (id) => doctorsManager.openDoctorModal(id);
window.openShiftModal = (id, date) => shiftsManager.openShiftModal(id, date);

// Función de debug para desarrollo
window.debugData = () => {
    console.log('Médicos:', doctorsManager.getDoctors());
    console.log('Turnos:', shiftsManager.getShifts());
    console.log('Usuario actual:', auth.getCurrentUser());
};