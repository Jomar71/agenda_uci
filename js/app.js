// Aplicación principal
class App {
    constructor() {
        this.currentSection = 'inicio';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupModals();
        this.showSection('inicio');
        this.loadSampleData();
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

        // Forms - CORREGIDO: Solo prevenir envío normal
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
                e.preventDefault(); // Solo prevenir envío normal
            });
        }

        const shiftForm = document.getElementById('shift-form');
        if (shiftForm) {
            shiftForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveShift(e);
            });
        }

        // Botones de cancelar
        const cancelDoctorBtn = document.getElementById('cancel-doctor');
        if (cancelDoctorBtn) {
            cancelDoctorBtn.addEventListener('click', () => {
                this.closeDoctorModal();
            });
        }

        const cancelShiftBtn = document.getElementById('cancel-shift');
        if (cancelShiftBtn) {
            cancelShiftBtn.addEventListener('click', () => {
                shifts.closeShiftModal();
            });
        }

        // Botón eliminar turno
        const deleteShiftBtn = document.getElementById('delete-shift');
        if (deleteShiftBtn) {
            deleteShiftBtn.addEventListener('click', () => {
                const shiftId = document.getElementById('shift-id').value;
                if (shiftId) {
                    shifts.deleteShift(parseInt(shiftId));
                }
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
                    doctors.updateStatistics();
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

    handleSaveShift(e) {
        e.preventDefault();
        const form = document.getElementById('shift-form');
        if (form) {
            const formData = new FormData(form);
            if (shifts.saveShift(formData)) {
                shifts.closeShiftModal();
            }
        }
    }

    closeDoctorModal() {
        const modal = document.getElementById('doctor-modal');
        if (modal) {
            modal.style.display = 'none';
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
                },
                {
                    id: 3,
                    name: 'Dr. Javier Martínez',
                    specialty: 'Traumatología',
                    email: 'j.martinez@uci.com',
                    phone: '+34 600 555 666',
                    username: 'jmartinez',
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
            for (let i = 0; i < 10; i++) {
                const shiftDate = new Date(today);
                shiftDate.setDate(today.getDate() + i);
                
                const shift = {
                    doctorId: (i % 3) + 1,
                    date: shiftDate.toISOString().split('T')[0],
                    type: ['guardia', 'consulta', 'emergencia'][i % 3],
                    startTime: '08:00',
                    endTime: '16:00',
                    notes: i % 2 === 0 ? 'Turno regular' : 'Guardia especial'
                };
                
                storage.saveShift(shift);
            }
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.auth = auth;
    window.doctors = doctors;
    window.shifts = shifts;
    window.storage = storage;
});

// Funciones globales para acceso desde HTML
window.openLoginModal = () => app.openLoginModal();
window.openDoctorModal = (id) => doctors.openDoctorModal(id);