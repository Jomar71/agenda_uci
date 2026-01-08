
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
    }

    async loadDoctors() {
        this.doctors = await dataManager.getAll('doctors');
        this.updateSpecialtyFilter();
        this.renderDoctors();
        this.updateStats();
        console.log(`✅ Loaded ${this.doctors.length} doctors`);
    }

    getDoctors() {
        return this.doctors;
    }

    getDoctorById(id) {
        if (!id) return null;
        const targetId = id.toString();
        return this.doctors.find(d => d.id.toString() === targetId);
    }

    setupEventListeners() {
        // Buttons
        const saveDoctorBtn = document.getElementById('save-doctor-btn');
        const cancelDoctorBtn = document.getElementById('cancel-doctor-btn');
        if (saveDoctorBtn) saveDoctorBtn.addEventListener('click', () => this.saveDoctor());
        if (cancelDoctorBtn) cancelDoctorBtn.addEventListener('click', () => this.closeDoctorModal());

        // Photo Upload
        const doctorPhotoInput = document.getElementById('doctor-photo');
        if (doctorPhotoInput) doctorPhotoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));

        // Filters
        const searchInput = document.getElementById('doctor-search');
        if (searchInput) searchInput.addEventListener('input', () => this.filterDoctors());

        const specialtyFilter = document.getElementById('specialty-filter');
        if (specialtyFilter) specialtyFilter.addEventListener('change', () => this.filterDoctors());


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
        this.attachCardEvents();
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

    attachCardEvents() {
        document.querySelectorAll('.view-shifts-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.view-shifts-btn').dataset.id;
                // navigate and filter logic
                document.querySelector('[href="#turnos"]').click();
                // We should probably trigger a filter event here or call a method on ShiftsManager if we had access
                // For now just navigate
            });
        });

        if (this.auth.isAdmin()) {
            document.querySelectorAll('.edit-doctor-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.closest('.edit-doctor-btn').dataset.id;
                    this.openDoctorModal(id);
                });
            });

            document.querySelectorAll('.delete-doctor-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.closest('.delete-doctor-btn').dataset.id;
                    this.deleteDoctor(id);
                });
            });
        }
    }

    openDoctorModal(id = null) {
        const modal = document.getElementById('doctor-modal');
        const title = document.getElementById('doctor-modal-title');
        this.currentPhoto = null;

        if (id) {
            const doctor = this.getDoctorById(id);
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
            await dataManager.save('doctors', doctorData, doctorData.id ? doctorData.id : null);
            this.closeDoctorModal();
            this.auth.showNotification('Médico guardado correctamente', 'success');
            await this.loadDoctors();
        } catch (error) {
            console.error(error);
            this.auth.showNotification('Error al guardar', 'error');
        }
    }

    async deleteDoctor(id) {
        if (confirm('¿Eliminar médico? Se borrarán sus turnos asignados.')) {
            await dataManager.delete('doctors', id);
            // TODO: Delete shifts for this doctor
            this.auth.showNotification('Médico eliminado', 'success');
            await this.loadDoctors();
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
