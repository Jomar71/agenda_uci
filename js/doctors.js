// Gestión de médicos - VERSION CORREGIDA
class DoctorsManager {
    constructor() {
        this.currentPhoto = null;
        this.init();
    }

    init() {
        this.loadDoctors();
        this.setupSearch();
        this.setupAddButton();
    }

    loadDoctors() {
        const doctors = storage.getDoctors();
        this.renderDoctors(doctors);
        this.updateStats();
    }

    renderDoctors(doctors) {
        const grid = document.getElementById('doctors-grid');
        if (!grid) return;

        let html = '';

        if (doctors.length === 0) {
            html = `
                <div class="text-center" style="grid-column: 1/-1; padding: 2rem;">
                    <p>No hay médicos registrados.</p>
                    ${auth.isLoggedIn && auth.userRole === 'admin' ? 
                        '<button class="btn btn-primary mt-1" onclick="doctors.openDoctorModal()">Agregar Primer Médico</button>' : 
                        ''
                    }
                </div>
            `;
        } else {
            // MOSTRAR MÉDICOS EXISTENTES
            html = doctors.map(doctor => `
                <div class="doctor-card">
                    <div class="doctor-photo">
                        <img src="${doctor.photo}" alt="${doctor.name}" 
                             onerror="this.src='assets/images/default-doctor.jpg'">
                    </div>
                    <h3>${doctor.name}</h3>
                    <span class="doctor-specialty">${doctor.specialty}</span>
                    <div class="doctor-contact">
                        <i class="fas fa-envelope"></i> ${doctor.email}
                    </div>
                    <div class="doctor-contact">
                        <i class="fas fa-phone"></i> ${doctor.phone}
                    </div>
                    <div class="doctor-actions">
                        <button class="btn btn-primary" onclick="doctors.viewShifts(${doctor.id})">
                            <i class="fas fa-calendar"></i> Ver Turnos
                        </button>
                        ${auth.isLoggedIn && auth.userRole === 'admin' ? `
                            <button class="btn btn-secondary" onclick="doctors.openDoctorModal(${doctor.id})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-danger" onclick="doctors.deleteDoctor(${doctor.id})">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            // AGREGAR BOTÓN PARA NUEVO MÉDICO (SOLO ADMIN)
            if (auth.isLoggedIn && auth.userRole === 'admin') {
                html += `
                    <div class="doctor-card add-doctor-card" onclick="doctors.openDoctorModal()">
                        <div class="add-doctor-content">
                            <i class="fas fa-plus-circle"></i>
                            <h3>Agregar Médico</h3>
                            <p>Click para agregar un nuevo médico al sistema</p>
                        </div>
                    </div>
                `;
            }
        }

        grid.innerHTML = html;
    }

    setupAddButton() {
        // El botón ahora se renderiza dinámicamente en renderDoctors
    }

    setupSearch() {
        const search = document.getElementById('doctor-search');
        const filter = document.getElementById('specialty-filter');

        if (search) {
            search.addEventListener('input', (e) => {
                this.filterDoctors(e.target.value, filter?.value);
            });
        }

        if (filter) {
            filter.addEventListener('change', (e) => {
                this.filterDoctors(search?.value, e.target.value);
            });
        }
    }

    filterDoctors(searchTerm = '', specialty = '') {
        const doctors = storage.getDoctors();
        const filtered = doctors.filter(doctor => {
            const matchesSearch = !searchTerm || 
                doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSpecialty = !specialty || doctor.specialty === specialty;
            return matchesSearch && matchesSpecialty;
        });
        
        const grid = document.getElementById('doctors-grid');
        if (!grid) return;

        let html = filtered.map(doctor => `
            <div class="doctor-card">
                <div class="doctor-photo">
                    <img src="${doctor.photo}" alt="${doctor.name}" 
                         onerror="this.src='assets/images/default-doctor.jpg'">
                </div>
                <h3>${doctor.name}</h3>
                <span class="doctor-specialty">${doctor.specialty}</span>
                <div class="doctor-contact">
                    <i class="fas fa-envelope"></i> ${doctor.email}
                </div>
                <div class="doctor-contact">
                    <i class="fas fa-phone"></i> ${doctor.phone}
                </div>
                <div class="doctor-actions">
                    <button class="btn btn-primary" onclick="doctors.viewShifts(${doctor.id})">
                        <i class="fas fa-calendar"></i> Ver Turnos
                    </button>
                    ${auth.isLoggedIn && auth.userRole === 'admin' ? `
                        <button class="btn btn-secondary" onclick="doctors.openDoctorModal(${doctor.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger" onclick="doctors.deleteDoctor(${doctor.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Agregar botón de "Agregar Médico" incluso cuando hay filtros (solo admin)
        if (auth.isLoggedIn && auth.userRole === 'admin') {
            html += `
                <div class="doctor-card add-doctor-card" onclick="doctors.openDoctorModal()">
                    <div class="add-doctor-content">
                        <i class="fas fa-plus-circle"></i>
                        <h3>Agregar Médico</h3>
                        <p>Click para agregar un nuevo médico al sistema</p>
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
    }

    openDoctorModal(doctorId = null) {
        if (!auth.isLoggedIn || auth.userRole !== 'admin') {
            this.showNotification('Solo administradores pueden gestionar médicos', 'error');
            return;
        }

        const modal = document.getElementById('doctor-modal');
        const title = document.getElementById('doctor-modal-title');
        
        if (!modal || !title) return;

        // Resetear foto temporal
        this.currentPhoto = null;

        if (doctorId) {
            // Modo edición
            const doctor = storage.getDoctors().find(d => d.id === doctorId);
            if (doctor) {
                title.textContent = 'Editar Médico';
                this.fillForm(doctor);
            }
        } else {
            // Modo creación
            title.textContent = 'Nuevo Médico';
            this.clearForm();
        }

        modal.style.display = 'block';
    }

    fillForm(doctor) {
        document.getElementById('doctor-id').value = doctor.id;
        document.getElementById('doctor-name').value = doctor.name;
        document.getElementById('doctor-specialty').value = doctor.specialty;
        document.getElementById('doctor-email').value = doctor.email;
        document.getElementById('doctor-phone').value = doctor.phone;
        document.getElementById('doctor-username').value = doctor.username;
        document.getElementById('doctor-password').value = '';
        document.getElementById('doctor-password').placeholder = 'Dejar vacío para no cambiar';
        
        // Mostrar foto actual
        this.updatePhotoPreview(doctor.photo);
    }

    clearForm() {
        document.getElementById('doctor-form').reset();
        document.getElementById('doctor-id').value = '';
        document.getElementById('doctor-password').placeholder = 'Contraseña requerida';
        document.getElementById('doctor-password').required = true;
        this.updatePhotoPreview('assets/images/default-doctor.jpg');
    }

    updatePhotoPreview(photoUrl) {
        const preview = document.getElementById('doctor-photo-preview');
        if (preview) {
            preview.innerHTML = `<img src="${photoUrl}" alt="Preview" style="max-width: 150px; border-radius: 10px;">`;
        }
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentPhoto = e.target.result;
                this.updatePhotoPreview(this.currentPhoto);
            };
            reader.readAsDataURL(file);
        }
    }

    saveDoctor() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return false;
        }

        const doctorData = {
            id: formData.id ? parseInt(formData.id) : null,
            name: formData.name,
            specialty: formData.specialty,
            email: formData.email,
            phone: formData.phone,
            username: formData.username
        };

        // Manejar contraseña
        if (formData.password) {
            doctorData.password = formData.password;
        }

        // Manejar foto
        if (this.currentPhoto) {
            doctorData.photo = this.currentPhoto;
        }

        const saved = storage.saveDoctor(doctorData);
        if (saved) {
            this.loadDoctors();
            this.closeDoctorModal();
            this.showNotification(
                formData.id ? 'Médico actualizado' : 'Médico creado', 
                'success'
            );
            return true;
        } else {
            this.showNotification('Error al guardar', 'error');
            return false;
        }
    }

    getFormData() {
        return {
            id: document.getElementById('doctor-id').value,
            name: document.getElementById('doctor-name').value,
            specialty: document.getElementById('doctor-specialty').value,
            email: document.getElementById('doctor-email').value,
            phone: document.getElementById('doctor-phone').value,
            username: document.getElementById('doctor-username').value,
            password: document.getElementById('doctor-password').value
        };
    }

    validateForm(data) {
        if (!data.name || !data.specialty || !data.email || !data.phone || !data.username) {
            this.showNotification('Todos los campos son requeridos', 'error');
            return false;
        }

        if (!data.id && !data.password) {
            this.showNotification('La contraseña es requerida para nuevos médicos', 'error');
            return false;
        }

        // Verificar username único
        const doctors = storage.getDoctors();
        const existing = doctors.find(d => d.username === data.username && d.id !== parseInt(data.id));
        if (existing) {
            this.showNotification('El nombre de usuario ya existe', 'error');
            return false;
        }

        return true;
    }

    deleteDoctor(id) {
        if (!auth.isLoggedIn || auth.userRole !== 'admin') {
            this.showNotification('No tiene permisos', 'error');
            return;
        }

        if (confirm('¿Eliminar este médico y todos sus turnos?')) {
            storage.deleteDoctor(id);
            this.loadDoctors();
            this.showNotification('Médico eliminado', 'success');
        }
    }

    viewShifts(doctorId) {
        app.showSection('turnos');
        this.showNotification('Vista de turnos del médico');
    }

    closeDoctorModal() {
        const modal = document.getElementById('doctor-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentPhoto = null;
    }

    updateStats() {
        const stats = storage.getStatistics();
        const element = document.getElementById('total-doctors');
        if (element) {
            element.textContent = stats.totalDoctors;
        }
    }

    showNotification(message, type = 'info') {
        // Notificación simple
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            border-radius: 5px;
            z-index: 1000;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
}

const doctors = new DoctorsManager();