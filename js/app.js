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
        this.loadSampleData(); // Cargar datos de ejemplo para demo
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
        document.querySelector('.mobile-menu-btn').addEventListener('click', () => {
            document.querySelector('.nav').classList.toggle('active');
        });

        // Botón de login
        document.getElementById('login-btn').addEventListener('click', () => {
            this.openLoginModal();
        });

        // Botón de logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            auth.logout();
        });

        // Forms
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('doctor-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveDoctor();
        });

        document.getElementById('shift-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveShift();
        });

        // Botones de cancelar
        document.getElementById('cancel-doctor').addEventListener('click', () => {
            this.closeDoctorModal();
        });

        document.getElementById('cancel-shift').addEventListener('click', () => {
            shifts.closeShiftModal();
        });

        // Botón eliminar turno
        document.getElementById('delete-shift').addEventListener('click', () => {
            const shiftId = document.getElementById('shift-id').value;
            if (shiftId) {
                shifts.deleteShift(parseInt(shiftId));
            }
        });

        // Panel de administración
        document.getElementById('manage-doctors').addEventListener('click', () => {
            this.showSection('medicos');
        });

        document.getElementById('manage-shifts').addEventListener('click', () => {
            this.showSection('turnos');
        });

        document.getElementById('backup-data').addEventListener('click', () => {
            this.downloadBackup();
        });
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
                e.target.closest('.modal').style.display = 'none';
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
        document.getElementById(sectionName).classList.add('active');
        
        // Activar link correspondiente
        document.querySelector(`[href="#${sectionName}"]`).classList.add('active');

        // Cerrar menú móvil si está abierto
        document.querySelector('.nav').classList.remove('active');

        this.currentSection = sectionName;

        // Acciones específicas por sección
        switch(sectionName) {
            case 'inicio':
                calendar.renderMonthlyPreview();
                doctors.updateStatistics();
                break;
            case 'medicos':
                doctors.loadDoctors();
                break;
            case 'turnos':
                shifts.renderCalendar();
                break;
        }
    }

    openLoginModal() {
        document.getElementById('login-modal').style.display = 'block';
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (auth.login(username, password)) {
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('login-form').reset();
        }
    }

    handleSaveDoctor() {
        const formData = new FormData(document.getElementById('doctor-form'));
        if (doctors.saveDoctor(formData)) {
            this.closeDoctorModal();
        }
    }

    handleSaveShift() {
        const formData = new FormData(document.getElementById('shift-form'));
        if (shifts.saveShift(formData)) {
            shifts.closeShiftModal();
        }
    }

    closeDoctorModal() {
        document.getElementById('doctor-modal').style.display = 'none';
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
                    createdAt: new Date().toISOString()
                }
            ];

            sampleDoctors.forEach(doctor => storage.saveDoctor(doctor));

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

            doctors.loadDoctors();
            calendar.renderMonthlyPreview();
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Funciones globales para acceso desde HTML
window.openLoginModal = () => app.openLoginModal();
window.openDoctorModal = (id) => doctors.openDoctorModal(id);