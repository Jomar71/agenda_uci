// Gestión de médicos
class DoctorsManager {
    constructor() {
        this.currentFilter = '';
        this.currentSpecialty = '';
        this.init();
    }

    init() {
        this.loadDoctors();
        this.setupEventListeners();
        this.updateStatistics();
    }

    loadDoctors() {
        const doctors = storage.getDoctors();
        this.renderDoctors(doctors);
        this.updateSpecialtyFilter(doctors);
    }

    renderDoctors(doctors) {
        const grid = document.getElementById('doctors-grid');
        
        if (doctors.length === 0) {
            grid.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1;">
                    <p>No hay médicos registrados.</p>
                    ${auth.hasRole('admin') ? '<button class="btn btn-primary mt-1" onclick="doctors.openDoctorModal()">Agregar Primer Médico</button>' : ''}
                </div>
            `;
            return;
        }

        grid.innerHTML = doctors
            .filter(doctor => this.filterDoctor(doctor))
            .map(doctor => this.createDoctorCard(doctor))
            .join('');
    }

    createDoctorCard(doctor) {
        const shifts = storage.getShiftsByDoctor(doctor.id);
        const nextShift = shifts
            .filter(shift => new Date(shift.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

        return `
            <div class="doctor-card" data-id="${doctor.id}">
                <h3>${doctor.name}</h3>
                <span class="doctor-specialty">${doctor.specialty}</span>
                <div class="doctor-contact">
                    <i class="fas fa-envelope"></i> ${doctor.email}
                </div>
                <div class="doctor-contact">
                    <i class="fas fa-phone"></i> ${doctor.phone}
                </div>
                ${nextShift ? `
                    <div class="doctor-contact">
                        <i class="fas fa-calendar-alt"></i> 
                        Próximo turno: ${this.formatDate(nextShift.date)} (${nextShift.type})
                    </div>
                ` : ''}
                <div class="doctor-actions">
                    <button class="btn btn-primary" onclick="doctors.viewDoctorShifts(${doctor.id})">
                        <i class="fas fa-calendar"></i> Ver Turnos
                    </button>
                    ${auth.hasRole('admin') ? `
                        <button class="btn btn-secondary" onclick="doctors.openDoctorModal(${doctor.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    filterDoctor(doctor) {
        const matchesSearch = !this.currentFilter || 
            doctor.name.toLowerCase().includes(this.currentFilter.toLowerCase()) ||
            doctor.specialty.toLowerCase().includes(this.currentFilter.toLowerCase());
        
        const matchesSpecialty = !this.currentSpecialty || 
            doctor.specialty === this.currentSpecialty;
        
        return matchesSearch && matchesSpecialty;
    }

    updateSpecialtyFilter(doctors) {
        const filter = document.getElementById('specialty-filter');
        const specialties = [...new Set(doctors.map(d => d.specialty))].sort();
        
        filter.innerHTML = `
            <option value="">Todas las especialidades</option>
            ${specialties.map(specialty => 
                `<option value="${specialty}">${specialty}</option>`
            ).join('')}
        `;
    }

    setupEventListeners() {
        // Búsqueda
        document.getElementById('doctor-search').addEventListener('input', (e) => {
            this.currentFilter = e.target.value;
            this.loadDoctors();
        });

        // Filtro por especialidad
        document.getElementById('specialty-filter').addEventListener('change', (e) => {
            this.currentSpecialty = e.target.value;
            this.loadDoctors();
        });
    }

    openDoctorModal(doctorId = null) {
        if (!auth.hasRole('admin')) {
            auth.showNotification('No tiene permisos para esta acción', 'error');
            return;
        }

        const modal = document.getElementById('doctor-modal');
        const title = document.getElementById('doctor-modal-title');
        const form = document.getElementById('doctor-form');

        if (doctorId) {
            // Modo edición
            const doctor = storage.getDoctors().find(d => d.id === doctorId);
            if (doctor) {
                title.textContent = 'Editar Médico';
                document.getElementById('doctor-id').value = doctor.id;
                document.getElementById('doctor-name').value = doctor.name;
                document.getElementById('doctor-specialty').value = doctor.specialty;
                document.getElementById('doctor-email').value = doctor.email;
                document.getElementById('doctor-phone').value = doctor.phone;
                document.getElementById('doctor-username').value = doctor.username;
                document.getElementById('doctor-password').value = '';
                document.getElementById('doctor-password').placeholder = 'Dejar vacío para no cambiar';
            }
        } else {
            // Modo creación
            title.textContent = 'Nuevo Médico';
            form.reset();
            document.getElementById('doctor-id').value = '';
            document.getElementById('doctor-password').placeholder = 'Contraseña requerida';
        }

        modal.style.display = 'block';
    }

    saveDoctor(formData) {
        const doctor = {
            id: formData.get('id') ? parseInt(formData.get('id')) : null,
            name: formData.get('name'),
            specialty: formData.get('specialty'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            username: formData.get('username')
        };

        // Manejar contraseña
        const password = formData.get('password');
        if (password) {
            doctor.password = password;
        } else if (!doctor.id) {
            // Nueva contraseña requerida para médicos nuevos
            auth.showNotification('La contraseña es requerida para nuevos médicos', 'error');
            return false;
        }

        // Validaciones
        if (!this.validateDoctor(doctor)) {
            return false;
        }

        const savedDoctor = storage.saveDoctor(doctor);
        this.loadDoctors();
        this.updateStatistics();
        auth.showNotification(
            doctor.id ? 'Médico actualizado correctamente' : 'Médico creado correctamente',
            'success'
        );
        return true;
    }

    validateDoctor(doctor) {
        // Verificar username único
        const doctors = storage.getDoctors();
        const existing = doctors.find(d => 
            d.username === doctor.username && d.id !== doctor.id
        );
        
        if (existing) {
            auth.showNotification('El nombre de usuario ya está en uso', 'error');
            return false;
        }

        // Validaciones básicas
        if (!doctor.name || !doctor.specialty || !doctor.email || !doctor.username) {
            auth.showNotification('Todos los campos son requeridos', 'error');
            return false;
        }

        return true;
    }

    deleteDoctor(doctorId) {
        if (!auth.hasRole('admin')) {
            auth.showNotification('No tiene permisos para esta acción', 'error');
            return;
        }

        if (confirm('¿Está seguro de que desea eliminar este médico? También se eliminarán todos sus turnos.')) {
            storage.deleteDoctor(doctorId);
            this.loadDoctors();
            this.updateStatistics();
            auth.showNotification('Médico eliminado correctamente', 'success');
        }
    }

    viewDoctorShifts(doctorId) {
        // Navegar a la sección de turnos y filtrar por médico
        app.showSection('turnos');
        // Aquí se podría implementar filtrado específico en el calendario
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES');
    }

    updateStatistics() {
        const stats = storage.getStatistics();
        document.getElementById('total-doctors').textContent = stats.totalDoctors;
    }
}

// Instancia global del gestor de médicos
const doctors = new DoctorsManager();