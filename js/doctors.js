// Gestión de médicos - VERSION COMPLETAMENTE CORREGIDA
class DoctorsManager {
    constructor() {
        this.doctors = [];
        this.currentPhoto = null;
        this.init();
    }

    init() {
        console.log('👨‍⚕️ Inicializando gestor de médicos...');
        this.loadDoctors();
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('🔧 Configurando eventos de médicos...');
        
        // Botones del formulario de médico
        const saveDoctorBtn = document.getElementById('save-doctor-btn');
        const cancelDoctorBtn = document.getElementById('cancel-doctor-btn');
        
        if (saveDoctorBtn) {
            saveDoctorBtn.addEventListener('click', () => this.saveDoctor());
            console.log('✅ Botón guardar médico configurado');
        } else {
            console.error('❌ No se encontró el botón guardar médico');
        }
        
        if (cancelDoctorBtn) {
            cancelDoctorBtn.addEventListener('click', () => this.closeDoctorModal());
            console.log('✅ Botón cancelar médico configurado');
        }

        // Subida de foto
        const doctorPhotoInput = document.getElementById('doctor-photo');
        if (doctorPhotoInput) {
            doctorPhotoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
            console.log('✅ Input de foto configurado');
        }

        // Búsqueda y filtros
        const searchInput = document.getElementById('doctor-search');
        const specialtyFilter = document.getElementById('specialty-filter');
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterDoctors());
        }
        
        if (specialtyFilter) {
            specialtyFilter.addEventListener('change', () => this.filterDoctors());
        }
        
        // Navegación desde admin
        const manageDoctorsBtn = document.getElementById('manage-doctors');
        if (manageDoctorsBtn) {
            manageDoctorsBtn.addEventListener('click', () => {
                document.querySelector('[href="#medicos"]').click();
            });
        }
    }

    loadDoctors() {
        console.log('📂 Cargando médicos desde almacenamiento...');
        this.doctors = this.getDoctorsFromStorage();
        this.updateSpecialtyFilter();
        this.renderDoctors();
        this.updateStats();
        console.log(`✅ ${this.doctors.length} médicos cargados`);
    }

    getDoctorsFromStorage() {
        try {
            const stored = localStorage.getItem('doctors');
            if (stored) {
                const doctors = JSON.parse(stored);
                console.log('📋 Médicos cargados del localStorage:', doctors.length);
                return doctors;
            }
        } catch (error) {
            console.error('❌ Error cargando médicos:', error);
        }
        
        // Datos de ejemplo si no hay datos
        console.log('📝 Creando datos de ejemplo...');
        const sampleDoctors = [
            {
                id: 1,
                name: 'Dr. Carlos Rodríguez',
                specialty: 'Cardiología',
                email: 'c.rodriguez@uci.com',
                phone: '+34 600 111 222',
                username: 'crodriguez',
                password: 'doctor123',
                photo: null,
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
                photo: null,
                createdAt: new Date().toISOString()
            }
        ];
        
        // Guardar datos de ejemplo
        this.saveDoctorsToStorage(sampleDoctors);
        return sampleDoctors;
    }

    saveDoctorsToStorage(doctorsToSave = null) {
        const doctors = doctorsToSave || this.doctors;
        try {
            localStorage.setItem('doctors', JSON.stringify(doctors));
            console.log('💾 Médicos guardados en localStorage:', doctors.length);
            return true;
        } catch (error) {
            console.error('❌ Error guardando médicos:', error);
            auth.showNotification('Error al guardar los datos de médicos', 'error');
            return false;
        }
    }

    renderDoctors(doctorsToRender = null) {
        const grid = document.getElementById('doctors-grid');
        if (!grid) {
            console.error('❌ No se encontró el grid de médicos');
            return;
        }

        const doctors = doctorsToRender || this.doctors;
        console.log('🎨 Renderizando médicos:', doctors.length);

        let html = '';

        if (doctors.length === 0) {
            html = `
                <div class="no-doctors" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-user-md" style="font-size: 3rem; color: #bdc3c7; margin-bottom: 1rem;"></i>
                    <h3 style="color: #7f8c8d; margin-bottom: 1rem;">No hay médicos registrados</h3>
                    ${auth.isAdmin() ? 
                        '<button class="btn btn-primary" onclick="doctorsManager.openDoctorModal()">Agregar Primer Médico</button>' : 
                        '<p style="color: #95a5a6;">Contacte al administrador para agregar médicos</p>'
                    }
                </div>
            `;
        } else {
            doctors.forEach(doctor => {
                html += this.createDoctorCard(doctor);
            });

            // Botón para agregar médico (solo admin)
            if (auth.isAdmin()) {
                html += `
                    <div class="doctor-card add-doctor-card" onclick="doctorsManager.openDoctorModal()">
                        <div class="add-doctor-content">
                            <i class="fas fa-user-plus"></i>
                            <h3>Agregar Médico</h3>
                            <p>Click para agregar un nuevo médico</p>
                        </div>
                    </div>
                `;
            }
        }

        grid.innerHTML = html;
        this.attachCardEvents();
        console.log('✅ Médicos renderizados correctamente');
    }

    createDoctorCard(doctor) {
        const photoHTML = doctor.photo ? 
            `<img src="${doctor.photo}" alt="${doctor.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
            `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #ecf0f1; border-radius: 50%;">
                <i class="fas fa-user-md" style="font-size: 2rem; color: #95a5a6;"></i>
             </div>`;

        return `
            <div class="doctor-card" data-id="${doctor.id}">
                <div class="doctor-photo">
                    ${photoHTML}
                </div>
                <h3>${doctor.name}</h3>
                <span class="doctor-specialty">${doctor.specialty}</span>
                <div class="doctor-contact">
                    <i class="fas fa-envelope"></i>
                    <span>${doctor.email}</span>
                </div>
                <div class="doctor-contact">
                    <i class="fas fa-phone"></i>
                    <span>${doctor.phone}</span>
                </div>
                <div class="doctor-actions">
                    <button class="btn btn-primary view-shifts-btn" data-id="${doctor.id}">
                        <i class="fas fa-calendar"></i> Ver Turnos
                    </button>
                    ${auth.isAdmin() ? `
                        <button class="btn btn-secondary edit-doctor-btn" data-id="${doctor.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger delete-doctor-btn" data-id="${doctor.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachCardEvents() {
        console.log('🔗 Adjuntando eventos a tarjetas de médicos...');
        
        // Botón ver turnos
        document.querySelectorAll('.view-shifts-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const doctorId = parseInt(e.target.closest('.view-shifts-btn').dataset.id);
                console.log('👀 Ver turnos del médico:', doctorId);
                this.viewDoctorShifts(doctorId);
            });
        });

        // Botón editar (solo admin)
        if (auth.isAdmin()) {
            document.querySelectorAll('.edit-doctor-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const doctorId = parseInt(e.target.closest('.edit-doctor-btn').dataset.id);
                    console.log('✏️ Editando médico:', doctorId);
                    this.openDoctorModal(doctorId);
                });
            });

            document.querySelectorAll('.delete-doctor-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const doctorId = parseInt(e.target.closest('.delete-doctor-btn').dataset.id);
                    console.log('🗑️ Eliminando médico:', doctorId);
                    this.deleteDoctor(doctorId);
                });
            });
        }
        
        console.log('✅ Eventos de tarjetas configurados');
    }

    openDoctorModal(doctorId = null) {
        if (!auth.isAdmin()) {
            auth.showNotification('Solo los administradores pueden gestionar médicos', 'error');
            return;
        }

        const modal = document.getElementById('doctor-modal');
        const title = document.getElementById('doctor-modal-title');
        
        if (!modal || !title) {
            console.error('❌ No se encontró el modal de médico');
            return;
        }

        // Resetear foto temporal
        this.currentPhoto = null;

        if (doctorId) {
            // Modo edición
            const doctor = this.doctors.find(d => d.id === doctorId);
            if (doctor) {
                title.textContent = 'Editar Médico';
                this.fillForm(doctor);
                console.log('📝 Abriendo modal para editar médico:', doctor.name);
            }
        } else {
            // Modo creación
            title.textContent = 'Nuevo Médico';
            this.clearForm();
            console.log('🆕 Abriendo modal para nuevo médico');
        }

        modal.style.display = 'block';
    }

    closeDoctorModal() {
        const modal = document.getElementById('doctor-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentPhoto = null;
        console.log('📭 Modal de médico cerrado');
    }

    fillForm(doctor) {
        console.log('📝 Llenando formulario con datos del médico:', doctor.name);
        
        document.getElementById('doctor-id').value = doctor.id;
        document.getElementById('doctor-name').value = doctor.name;
        document.getElementById('doctor-specialty').value = doctor.specialty;
        document.getElementById('doctor-email').value = doctor.email;
        document.getElementById('doctor-phone').value = doctor.phone;
        document.getElementById('doctor-username').value = doctor.username;
        document.getElementById('doctor-password').value = '';
        document.getElementById('doctor-password').placeholder = 'Dejar vacío para no cambiar';
        document.getElementById('doctor-password').required = false;
        
        // Mostrar foto actual
        this.updatePhotoPreview(doctor.photo);
    }

    clearForm() {
        document.getElementById('doctor-form').reset();
        document.getElementById('doctor-id').value = '';
        document.getElementById('doctor-password').placeholder = 'Contraseña requerida';
        document.getElementById('doctor-password').required = true;
        this.updatePhotoPreview(null);
        console.log('🧹 Formulario limpiado');
    }

    updatePhotoPreview(photoUrl) {
        const preview = document.getElementById('doctor-photo-preview');
        if (!preview) return;

        if (photoUrl) {
            preview.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${photoUrl}" alt="Foto actual" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #3498db;">
                    <small>Foto actual</small>
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div style="color: #95a5a6; text-align: center; padding: 1rem;">
                    <i class="fas fa-user-md" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>No hay foto seleccionada</div>
                </div>
            `;
        }
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📸 Procesando upload de foto:', file.name);

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            auth.showNotification('Por favor selecciona un archivo de imagen válido (JPG, PNG, GIF)', 'error');
            event.target.value = '';
            return;
        }

        // Validar tamaño (máximo 2MB)
        if (file.size > 2 * 1024 * 1024) {
            auth.showNotification('La imagen debe ser menor a 2MB', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentPhoto = e.target.result;
            this.updatePhotoPreview(this.currentPhoto);
            console.log('✅ Foto cargada correctamente');
        };
        reader.onerror = () => {
            auth.showNotification('Error al leer la imagen', 'error');
            event.target.value = '';
            console.error('❌ Error leyendo la imagen');
        };
        reader.readAsDataURL(file);
    }

    saveDoctor() {
        console.log('💾 Intentando guardar médico...');
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            console.error('❌ Validación de formulario falló');
            return false;
        }

        const doctorData = {
            name: formData.name.trim(),
            specialty: formData.specialty.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            username: formData.username.trim()
        };

        // Manejar contraseña
        if (formData.password) {
            doctorData.password = formData.password;
        }

        // Manejar foto
        if (this.currentPhoto) {
            doctorData.photo = this.currentPhoto;
        } else if (formData.id) {
            // Mantener foto existente si estamos editando
            const existingDoctor = this.doctors.find(d => d.id === parseInt(formData.id));
            doctorData.photo = existingDoctor?.photo || null;
        }

        let successMessage = '';

        if (formData.id) {
            // Actualizar médico existente
            const index = this.doctors.findIndex(d => d.id === parseInt(formData.id));
            if (index !== -1) {
                doctorData.id = parseInt(formData.id);
                doctorData.createdAt = this.doctors[index].createdAt;
                
                // Mantener contraseña si no se cambió
                if (!formData.password) {
                    doctorData.password = this.doctors[index].password;
                }
                
                this.doctors[index] = doctorData;
                successMessage = 'Médico actualizado correctamente';
                console.log('✅ Médico actualizado:', doctorData.name);
            }
        } else {
            // Crear nuevo médico
            doctorData.id = this.generateDoctorId();
            doctorData.createdAt = new Date().toISOString();
            this.doctors.push(doctorData);
            successMessage = 'Médico creado correctamente';
            console.log('✅ Nuevo médico creado:', doctorData.name);
        }

        if (this.saveDoctorsToStorage()) {
            this.loadDoctors();
            this.closeDoctorModal();
            auth.showNotification(successMessage, 'success');
            return true;
        } else {
            auth.showNotification('Error al guardar los cambios', 'error');
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
        console.log('🔍 Validando formulario...', data);
        
        // Validar campos requeridos
        const requiredFields = ['name', 'specialty', 'email', 'phone', 'username'];
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                auth.showNotification(`El campo ${field} es requerido`, 'error');
                return false;
            }
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            auth.showNotification('Por favor ingresa un email válido', 'error');
            return false;
        }

        // Para nuevos médicos, validar contraseña
        if (!data.id && !data.password) {
            auth.showNotification('La contraseña es requerida para nuevos médicos', 'error');
            return false;
        }

        // Verificar username único
        const existingDoctor = this.doctors.find(d => 
            d.username === data.username && d.id !== parseInt(data.id || 0)
        );
        if (existingDoctor) {
            auth.showNotification('El nombre de usuario ya está en uso', 'error');
            return false;
        }

        console.log('✅ Validación de formulario exitosa');
        return true;
    }

    deleteDoctor(id) {
        if (!auth.isAdmin()) {
            auth.showNotification('No tiene permisos para eliminar médicos', 'error');
            return;
        }

        const doctor = this.doctors.find(d => d.id === id);
        if (!doctor) {
            console.error('❌ Médico no encontrado para eliminar:', id);
            return;
        }

        // Verificar si el médico tiene turnos
        const shifts = window.shiftsManager?.getShifts() || [];
        const doctorShifts = shifts.filter(shift => shift.doctorId === id);

        let confirmMessage = `¿Estás seguro de eliminar al Dr. ${doctor.name}?`;
        if (doctorShifts.length > 0) {
            confirmMessage += `\n\nEste médico tiene ${doctorShifts.length} turno(s) asignado(s) que también serán eliminados.`;
        }

        if (confirm(confirmMessage)) {
            // Eliminar médico
            this.doctors = this.doctors.filter(d => d.id !== id);
            
            // Eliminar turnos del médico si existe el gestor de turnos
            if (window.shiftsManager && doctorShifts.length > 0) {
                const updatedShifts = shifts.filter(shift => shift.doctorId !== id);
                window.shiftsManager.saveShifts(updatedShifts);
                console.log(`🗑️ Eliminados ${doctorShifts.length} turnos del médico`);
            }

            if (this.saveDoctorsToStorage()) {
                this.loadDoctors();
                auth.showNotification('Médico eliminado correctamente', 'success');
                console.log('✅ Médico eliminado:', doctor.name);
            }
        }
    }

    viewDoctorShifts(doctorId) {
        console.log('📅 Navegando a turnos del médico:', doctorId);
        
        // Navegar a la sección de turnos
        const turnosLink = document.querySelector('[href="#turnos"]');
        if (turnosLink) {
            turnosLink.click();
        }
        
        auth.showNotification(`Mostrando turnos del médico seleccionado`, 'info');
        
        // En una implementación más avanzada, aquí filtrarías el calendario
        // para mostrar solo los turnos de este médico
        setTimeout(() => {
            if (window.shiftsManager) {
                // Podrías implementar un filtro específico aquí
                console.log('🔍 Filtrando turnos para médico:', doctorId);
            }
        }, 500);
    }

    filterDoctors() {
        const searchTerm = document.getElementById('doctor-search')?.value.toLowerCase() || '';
        const specialty = document.getElementById('specialty-filter')?.value || '';

        const filtered = this.doctors.filter(doctor => {
            const matchesSearch = doctor.name.toLowerCase().includes(searchTerm) ||
                                doctor.specialty.toLowerCase().includes(searchTerm) ||
                                doctor.email.toLowerCase().includes(searchTerm);
            const matchesSpecialty = !specialty || doctor.specialty === specialty;
            
            return matchesSearch && matchesSpecialty;
        });

        this.renderDoctors(filtered);
    }

    updateSpecialtyFilter() {
        const filter = document.getElementById('specialty-filter');
        if (!filter) return;

        const specialties = [...new Set(this.doctors.map(doctor => doctor.specialty))];
        const currentValue = filter.value;

        filter.innerHTML = '<option value="">Todas las especialidades</option>';
        specialties.forEach(specialty => {
            const option = document.createElement('option');
            option.value = specialty;
            option.textContent = specialty;
            filter.appendChild(option);
        });

        // Restaurar valor anterior si existe
        if (currentValue && specialties.includes(currentValue)) {
            filter.value = currentValue;
        }
        
        console.log('✅ Filtro de especialidades actualizado:', specialties.length);
    }

    generateDoctorId() {
        const maxId = this.doctors.reduce((max, doctor) => Math.max(max, doctor.id), 0);
        return maxId + 1;
    }

    updateStats() {
        const element = document.getElementById('total-doctors');
        if (element) {
            element.textContent = this.doctors.length;
            console.log('📊 Estadísticas actualizadas:', this.doctors.length, 'médicos');
        }
    }

    getDoctors() {
        return this.doctors;
    }

    getDoctorById(id) {
        return this.doctors.find(doctor => doctor.id === id);
    }

    getDoctorByUsername(username) {
        return this.doctors.find(doctor => doctor.username === username);
    }
}

// Instancia global
const doctorsManager = new DoctorsManager();