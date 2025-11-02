// Aplicación principal - VERSION MEJORADA CON SINCRONIZACIÓN
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
        this.loadSampleData();
    }

    setupDataSync() {
        // Escuchar cambios en los datos para actualizar todas las secciones
        window.addEventListener('dataUpdated', (e) => {
            console.log('Datos actualizados, refrescando interfaz...', e.detail.key);
            
            // Actualizar estadísticas
            if (typeof doctors !== 'undefined') {
                doctors.updateStats();
            }
            
            // Actualizar calendario de inicio
            if (typeof calendar !== 'undefined') {
                calendar.renderMonthlyPreview();
            }
            
            // Actualizar lista de médicos si estamos en esa sección
            if (this.currentSection === 'medicos' && typeof doctors !== 'undefined') {
                doctors.loadDoctors();
            }
            
            // Actualizar calendario de turnos si estamos en esa sección
            if (this.currentSection === 'turnos' && typeof shifts !== 'undefined') {
                shifts.renderCalendar();
            }
        });

        // También escuchar el evento storage estándar
        window.addEventListener('storage', (e) => {
            if (e.key === 'doctors' || e.key === 'shifts') {
                window.dispatchEvent(new CustomEvent('dataUpdated', { 
                    detail: { key: e.key } 
                }));
            }
        });
    }

    setupEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

        // Menú móvil
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const nav = document.querySelector('.nav');
                if (nav) {
                    nav.classList.toggle('active');
                }
            });
        }

        // Botón de login
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.openLoginModal();
            });
        }

        // Botón de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.logout();
            });
        }

        // Forms
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e);
            });
        }

        const doctorForm = document.getElementById('doctor-form');
        if (doctorForm) {
            doctorForm.addEventListener('submit', (e) => {
                e.preventDefault();
            });
        }

        const shiftForm = document.getElementById('shift-form');
        if (shiftForm) {
            shiftForm.addEventListener('submit', (e) => {
                e.preventDefault();
                shifts.saveShift();
            });
        }

        // Botones de cancelar
        const cancelDoctorBtn = document.getElementById('cancel-doctor');
        if (cancelDoctorBtn) {
            cancelDoctorBtn.addEventListener('click', () => {
                doctors.closeDoctorModal();
            });
        }

        // Panel de administración
        const manageDoctorsBtn = document.getElementById('manage-doctors');
        if (manageDoctorsBtn) {
            manageDoctorsBtn.addEventListener('click', () => {
                this.showSection('medicos');
            });
        }

        const manageShiftsBtn = document.getElementById('manage-shifts');
        if (manageShiftsBtn) {
            manageShiftsBtn.addEventListener('click', () => {
                this.showSection('turnos');
            });
        }

        const backupDataBtn = document.getElementById('backup-data');
        if (backupDataBtn) {
            backupDataBtn.addEventListener('click', () => {
                this.downloadBackup();
            });
        }

        // Botón agregar turno
        const addShiftBtn = document.getElementById('add-shift-btn');
        if (addShiftBtn) {
            addShiftBtn.addEventListener('click', () => {
                shifts.openShiftModal();
            });
        }
    }

    setupModals() {
        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (e) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Botones de cerrar modales
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
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

        // Cerrar menú móvil si está abierto
        const navElement = document.querySelector('.nav');
        if (navElement) {
            navElement.classList.remove('active');
        }

        this.currentSection = sectionName;

        // Acciones específicas por sección
        switch(sectionName) {
            case 'inicio':
                if (typeof calendar !== 'undefined') {
                    calendar.renderMonthlyPreview();
                }
                if (typeof doctors !== 'undefined') {
                    doctors.updateStats();
                }
                break;
            case 'medicos':
                if (typeof doctors !== 'undefined') {
                    doctors.loadDoctors();
                }
                break;
            case 'turnos':
                if (typeof shifts !== 'undefined') {
                    shifts.renderCalendar();
                }
                break;
        }
    }

    openLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (auth.login(username, password)) {
            const modal = document.getElementById('login-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            const form = document.getElementById('login-form');
            if (form) {
                form.reset();
            }
        }
    }

    downloadBackup() {
        if (!auth.hasRole('admin')) {
            auth.showNotification('Solo los administradores pueden descargar backups', 'error');
            return;
        }

        const data = storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-uci-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        auth.showNotification('Backup descargado correctamente', 'success');
    }

    loadSampleData() {
        // Cargar datos de ejemplo si no hay datos
        const existingDoctors = storage.getDoctors();
        if (existingDoctors.length === 0) {
            console.log('Cargando datos de ejemplo...');

            const sampleDoctors = [
                {
                    id: 1,
                    name: 'Dr. Carlos Rodríguez',
                    specialty: 'Cardiología',
                    email: 'c.rodriguez@uci.com',
                    phone: '+34 600 111 222',
                    username: 'crodriguez',
                    password: 'doctor123',
                    photo: 'assets/images/default-doctor.jpg',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    name: 'Dra. María López',
                    specialty: 'Neurología',
                    email: 'm.lopez@uci.com',
                    phone: '+34 600 333 444',
                    username: 'mlopez',
                    password: 'doctor123',
                    photo: 'assets/images/default-doctor.jpg',
                    createdAt: new Date().toISOString()
                }
            ];

            sampleDoctors.forEach(doctor => {
                storage.saveDoctor(doctor);
            });

            // Crear algunos turnos de ejemplo
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const shiftDate = new Date(today);
                shiftDate.setDate(today.getDate() + i);
                
                const shift = {
                    doctorId: (i % 2) + 1,
                    date: shiftDate.toISOString().split('T')[0],
                    type: ['guardia', 'consulta', 'emergencia', 'descanso'][i % 4],
                    startTime: '08:00',
                    endTime: '16:00',
                    notes: `Turno ejemplo ${i + 1}`
                };
                
                storage.saveShift(shift);
            }

            console.log('Datos de ejemplo cargados correctamente');
        }
    }

    // Método para forzar sincronización (útil para debugging)
    forceRefresh() {
        if (typeof doctors !== 'undefined') doctors.loadDoctors();
        if (typeof shifts !== 'undefined') shifts.renderCalendar();
        if (typeof calendar !== 'undefined') calendar.renderMonthlyPreview();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.auth = auth;
    window.doctors = doctors;
    window.shifts = shifts;
    window.storage = storage;
    window.calendar = calendar;
});

// Funciones globales para acceso desde HTML
window.openLoginModal = () => app.openLoginModal();
window.openDoctorModal = (id) => doctors.openDoctorModal(id);

// Función de debug para ver datos actuales
window.debugData = () => {
    console.log('Médicos:', storage.getDoctors());
    console.log('Turnos:', storage.getShifts());
};