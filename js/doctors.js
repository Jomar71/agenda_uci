
import { dataManager } from './services/data-manager.js';

export class DoctorsManager {
    constructor(authManager) {
        this.auth = authManager;
        this.doctors = [];
        this.currentPhoto = null;
        this.init();
    }

    async init() {
        console.log('👨‍⚕️ DoctorsManager: Initializing...');
        await this.loadDoctors();
        this.setupEventListeners();

        // Subscribe to real-time updates
        dataManager.subscribe('doctors', (changes) => {
            console.log('🔥 Doctors update received');
            this.loadDoctors();
        });

        // RE-LOAD when Firebase connects (in case we started in local mode)
        window.addEventListener('uci_firebase_online', async () => {
            console.log('🔄 DoctorsManager: Firebase ONLINE, re-loading doctors...');
            await this.loadDoctors();
        });
    }

    async loadDoctors() {
        try {
            this.doctors = await dataManager.getAll('doctors');
            this.updateSpecialtyFilter();
            this.renderDoctors();
            this.updateStats();
            console.log(`✅ Loaded ${this.doctors.length} doctors`);
        } catch (error) {
            console.error('Error loadDoctors:', error);
        }
    }

    getDoctors() {
        return this.doctors;
    }

    getDoctorById(id) {
        if (!id) return null;
        const targetId = id.toString().trim();
        return this.doctors.find(d => d.id.toString().trim() === targetId);
    }

    setupEventListeners() {
        // Modal Buttons
        const saveDoctorBtn = document.getElementById('save-doctor-btn');
        if (saveDoctorBtn) {
            // Standard approach without cloning unless absolutely necessary
            // For now, let's just ensure we add it once using a flag or just replacement
            saveDoctorBtn.onclick = () => this.saveDoctor();
        }

        const cancelDoctorBtn = document.getElementById('cancel-doctor-btn');
        if (cancelDoctorBtn) {
            cancelDoctorBtn.onclick = () => this.closeDoctorModal();
        }

        // Filters
        const searchInput = document.getElementById('doctor-search');
        if (searchInput) searchInput.oninput = () => this.filterDoctors();

        const specialtyFilter = document.getElementById('specialty-filter');
        if (specialtyFilter) specialtyFilter.onchange = () => this.filterDoctors();

        // Photo Upload
        const doctorPhotoInput = document.getElementById('doctor-photo');
        if (doctorPhotoInput) {
            doctorPhotoInput.onchange = (e) => this.handlePhotoUpload(e);
        }

        // EVENT DELEGATION for Doctors Grid (Persistent)
        const grid = document.getElementById('doctors-grid');
        if (grid && !grid.dataset.listenerAttached) {
            grid.addEventListener('click', (e) => {
                const target = e.target;

                // Handle Add Doctor (Special Card)
                const addCard = target.closest('.add-doctor-card');
                if (addCard) {
                    console.log('Delegation: Add Doctor');
                    this.openDoctorModal();
                    return;
                }

                // Handle View Shifts
                const viewBtn = target.closest('.view-shifts-btn');
                if (viewBtn) {
                    const id = viewBtn.dataset.id;
                    console.log('Delegation: View Shifts', id);
                    document.querySelector('[href="#turnos"]').click();
                    // We might need to tell ShiftsManager to filter, but navigation is first
                    return;
                }

                // Handle Edit (Admin only)
                const editBtn = target.closest('.edit-doctor-btn');
                if (editBtn && this.auth.isAdmin()) {
                    const id = editBtn.dataset.id;
                    console.log('Delegation: Edit Doctor', id);
                    this.openDoctorModal(id);
                    return;
                }

                // Handle Delete (Admin only)
                const deleteBtn = target.closest('.delete-doctor-btn');
                if (deleteBtn && this.auth.isAdmin()) {
                    const id = deleteBtn.dataset.id;
                    console.log('Delegation: Delete Doctor', id);
                    this.deleteDoctor(id);
                    return;
                }
            });
            grid.dataset.listenerAttached = 'true';
        }
    }

    renderDoctors(doctorsToRender = null) {
        const grid = document.getElementById('doctors-grid');
        if (!grid) return;

        const doctors = doctorsToRender || this.doctors;
        let html = '';

        if (doctors.length === 0) {
            html = `
                <div class="no-doctors animate__animated animate__fadeIn">
                    <i class="fas fa-user-md"></i>
                    <h3>No hay médicos registrados</h3>
                    ${this.auth.isAdmin() ?
                    '<button class="btn btn-primary" onclick="window.app.doctors.openDoctorModal()">Agregar Primer Médico</button>' :
                    '<p>Contacte al administrador</p>'}
                </div>
            `;
        } else {
            doctors.forEach(doctor => {
                html += this.createDoctorCard(doctor);
            });

            if (this.auth.isAdmin()) {
                html += `
                    <div class="doctor-card add-doctor-card animate__animated animate__fadeIn" onclick="window.app.doctors.openDoctorModal()">
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
        // No need to call attachCardEvents here anymore if using delegation on parent
    }

    createDoctorCard(doctor) {
        const photoHTML = doctor.photo ?
            `<img src="${doctor.photo}" alt="${doctor.name}">` :
            `<div class="placeholder-photo"><i class="fas fa-user-md"></i></div>`;

        return `
            <div class="doctor-card animate__animated animate__fadeIn" data-id="${doctor.id}">
                <div class="doctor-photo-wrapper">${photoHTML}</div>
                <div class="doctor-info">
                    <h3>${doctor.name}</h3>
                    <span class="badge badge-primary">${doctor.specialty}</span>
                    <p><i class="fas fa-envelope"></i> ${doctor.email}</p>
                    <p><i class="fas fa-phone"></i> ${doctor.phone}</p>
                </div>
                <div class="doctor-actions">
                    <button class="btn btn-sm btn-outline view-shifts-btn" data-id="${doctor.id}">
                        <i class="fas fa-calendar"></i> Turnos
                    </button>
                    ${this.auth.isAdmin() ? `
                        <button class="btn btn-sm btn-secondary edit-doctor-btn" data-id="${doctor.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-doctor-btn" data-id="${doctor.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Removing old attachCardEvents since we use delegation now
    attachCardEvents() {
        // Method kept for compatibility but empty
    }

    openDoctorModal(id = null) {
        console.log('📝 DoctorsManager: Opening modal for ID:', id);
        const modal = document.getElementById('doctor-modal');
        const title = document.getElementById('doctor-modal-title');
        this.currentPhoto = null;

        if (id && id !== 'undefined') {
            const doctor = this.getDoctorById(id);
            console.log('🔍 Found doctor:', doctor);
            if (doctor) {
                title.textContent = 'Editar Médico';
                this.fillForm(doctor);
            }
        } else {
            title.textContent = 'Nuevo Médico';
            this.clearForm();
        }
        modal.style.display = 'block';
    }

    closeDoctorModal() {
        document.getElementById('doctor-modal').style.display = 'none';
    }

    async saveDoctor() {
        const formData = this.getFormData();
        if (!this.validateForm(formData)) return;

        const doctorData = {
            ...formData,
            photo: this.currentPhoto || (formData.id ? this.getDoctorById(formData.id)?.photo : null)
        };

        // Don't save password if empty in edit mode
        if (!doctorData.password && doctorData.id) {
            delete doctorData.password;
        }

        try {
            const id = await dataManager.save('doctors', doctorData, doctorData.id ? doctorData.id : null);
            if (id) {
                this.closeDoctorModal();
                this.auth.showNotification('Médico guardado correctamente', 'success');
                // Real-time subscription will trigger reload, but we can do it manually for extra safety
                await this.loadDoctors();
            } else {
                throw new Error('No se recibió ID del servidor');
            }
        } catch (error) {
            console.error('Error in saveDoctor:', error);
            this.auth.showNotification('Error al guardar: ' + (error.message || 'Error de conexión'), 'error');
        }
    }

    async deleteDoctor(id) {
        if (!id || id === 'undefined') {
            console.error('❌ Cannot delete doctor: invalid ID');
            return;
        }

        if (confirm('¿Eliminar médico?')) {
            try {
                const success = await dataManager.delete('doctors', id);
                if (success) {
                    this.auth.showNotification('Médico eliminado', 'success');
                    await this.loadDoctors();
                } else {
                    this.auth.showNotification('Error al eliminar', 'error');
                }
            } catch (error) {
                console.error('Error deleteDoctor:', error);
                this.auth.showNotification('Error al eliminar', 'error');
            }
        }
    }

    // Helpers
    fillForm(doctor) {
        document.getElementById('doctor-id').value = doctor.id;
        document.getElementById('doctor-name').value = doctor.name;
        document.getElementById('doctor-specialty').value = doctor.specialty;
        document.getElementById('doctor-email').value = doctor.email;
        document.getElementById('doctor-phone').value = doctor.phone;
        document.getElementById('doctor-username').value = doctor.username;
        this.updatePhotoPreview(doctor.photo);
    }

    clearForm() {
        document.getElementById('doctor-form').reset();
        document.getElementById('doctor-id').value = '';
        this.updatePhotoPreview(null);
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
        if (!data.name || !data.specialty || !data.username) {
            this.auth.showNotification('Campos requeridos faltantes', 'error');
            return false;
        }
        return true;
    }

    updatePhotoPreview(src) {
        const previewContainer = document.getElementById('doctor-photo-preview');
        const statusText = document.getElementById('photo-status-text');

        if (src) {
            previewContainer.innerHTML = `<img src="${src}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border: 2px solid #3b82f6;">`;
            if (statusText) statusText.textContent = 'Foto seleccionada';
        } else {
            previewContainer.innerHTML = `<i class="fas fa-user-md photo-upload-icon"></i>`;
            if (statusText) statusText.textContent = 'No hay foto seleccionada';
        }
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                this.currentPhoto = evt.target.result;
                this.updatePhotoPreview(this.currentPhoto);
            };
            reader.readAsDataURL(file);
        }
    }

    filterDoctors() {
        const term = document.getElementById('doctor-search').value.toLowerCase();
        const specialty = document.getElementById('specialty-filter').value;

        const filtered = this.doctors.filter(d =>
            (d.name.toLowerCase().includes(term) || d.specialty.toLowerCase().includes(term)) &&
            (!specialty || d.specialty === specialty)
        );
        this.renderDoctors(filtered);
    }

    updateSpecialtyFilter() {
        const select = document.getElementById('specialty-filter');
        const specialties = [...new Set(this.doctors.map(d => d.specialty))];
        const current = select.value;
        select.innerHTML = '<option value="">Todas las especialidades</option>' +
            specialties.map(s => `<option value="${s}">${s}</option>`).join('');
        select.value = current;
    }

    updateStats() {
        const el = document.getElementById('total-doctors');
        if (el) el.textContent = this.doctors.length;
    }
}
