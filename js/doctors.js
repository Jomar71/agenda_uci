/**
 * DoctorsManager - Gestión de médicos.
 * CRUD completo con fotos, búsqueda, filtros y sincronización en tiempo real.
 */

import { dataManager } from './services/data-manager.js';
import {
    escapeHtml, hashPassword, debounce,
    DOCTOR_COLORS, computeInitials, getDoctorColor, getDoctorInitials, getContrastColor
} from './utils.js';

export class DoctorsManager {
    constructor(authManager) {
        this.auth = authManager;
        this.doctors = [];
        this.currentPhoto = null;
        this.init();
    }

    async init() {
        console.log('👨‍⚕️ DoctorsManager: Initializing...');

        this.setupEventListeners();

        await this.loadDoctors();

        dataManager.subscribe('doctors', () => {
            console.log('🔥 Doctors update received');
            this.loadDoctors();
        });

        // Recargar cuando Firebase conecte o falle (modo local)
        window.addEventListener('uci_firebase_online', () => this.loadDoctors());
        window.addEventListener('uci_firebase_permissions_error', () => this.loadDoctors());

        // Sincronización entre pestañas en modo local
        window.addEventListener('storage', (e) => {
            if (e.key === 'doctors') this.loadDoctors();
        });
    }

    async loadDoctors() {
        try {
            this.doctors = await dataManager.getAll('doctors');
            this.updateSpecialtyFilter();
            this.renderDoctors();
            this.updateStats();
            if (window.app) window.app.hideLoading();
        } catch (error) {
            console.error('Error loadDoctors:', error);
        }
    }

    getDoctors() {
        return this.doctors;
    }

    getDoctorById(id) {
        if (id === null || id === undefined) return null;
        const target = String(id).trim();
        return this.doctors.find(d => String(d.id).trim() === target);
    }

    setupEventListeners() {
        const doctorForm = document.getElementById('doctor-form');
        if (doctorForm) {
            doctorForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveDoctor();
            });
        }

        const cancelBtn = document.getElementById('cancel-doctor-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeDoctorModal());

        // Filtros con debounce
        const searchInput = document.getElementById('doctor-search');
        if (searchInput) searchInput.addEventListener('input', debounce(() => this.filterDoctors(), 250));

        const specialtyFilter = document.getElementById('specialty-filter');
        if (specialtyFilter) specialtyFilter.addEventListener('change', () => this.filterDoctors());

        // Foto
        const photoInput = document.getElementById('doctor-photo');
        if (photoInput) photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));

        // Autocompletar iniciales desde el nombre al salir del campo
        const nameInput = document.getElementById('doctor-name');
        const initialsInput = document.getElementById('doctor-initials');
        if (nameInput && initialsInput) {
            nameInput.addEventListener('blur', () => {
                if (!initialsInput.value.trim() && nameInput.value.trim()) {
                    initialsInput.value = computeInitials(nameInput.value);
                }
            });
        }

        // Delegación de eventos en la grilla (persistente)
        const grid = document.getElementById('doctors-grid');
        if (grid && !grid.dataset.listenerAttached) {
            grid.addEventListener('click', (e) => {
                const addCard = e.target.closest('.add-doctor-card');
                if (addCard && this.auth.isAdmin()) {
                    this.openDoctorModal();
                    return;
                }

                const viewBtn = e.target.closest('.view-shifts-btn');
                if (viewBtn) {
                    this.viewDoctorShifts(viewBtn.dataset.id);
                    return;
                }

                const editBtn = e.target.closest('.edit-doctor-btn');
                if (editBtn && this.auth.isAdmin()) {
                    this.openDoctorModal(editBtn.dataset.id);
                    return;
                }

                const deleteBtn = e.target.closest('.delete-doctor-btn');
                if (deleteBtn && this.auth.isAdmin()) {
                    this.deleteDoctor(deleteBtn.dataset.id);
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
                <div class="no-doctors">
                    <i class="fas fa-user-md" aria-hidden="true"></i>
                    <h3>No hay médicos registrados</h3>
                    ${this.auth.isAdmin()
                        ? '<button class="btn btn-primary" id="add-first-doctor">Agregar Primer Médico</button>'
                        : '<p class="text-muted">Contacte al administrador para agregar médicos</p>'}
                </div>`;
        } else {
            doctors.forEach(doctor => {
                html += this.createDoctorCard(doctor);
            });

            if (this.auth.isAdmin()) {
                html += `
                    <div class="doctor-card add-doctor-card" role="button" tabindex="0" aria-label="Agregar médico">
                        <div class="add-doctor-content">
                            <i class="fas fa-user-plus" aria-hidden="true"></i>
                            <h3>Agregar Médico</h3>
                            <p>Haz clic para agregar un nuevo médico</p>
                        </div>
                    </div>`;
            }
        }

        grid.innerHTML = html;

        const addFirstBtn = document.getElementById('add-first-doctor');
        if (addFirstBtn) addFirstBtn.addEventListener('click', () => this.openDoctorModal());
    }

    createDoctorCard(doctor) {
        const photoHTML = doctor.photo
            ? `<img src="${escapeHtml(doctor.photo)}" alt="${escapeHtml(doctor.name)}" loading="lazy">`
            : `<div class="placeholder-photo"><i class="fas fa-user-md" aria-hidden="true"></i></div>`;

        const color = getDoctorColor(doctor);
        const initials = getDoctorInitials(doctor);

        return `
            <div class="doctor-card" data-id="${escapeHtml(doctor.id)}">
                <div class="doctor-photo-wrapper" style="border-color: ${color};">
                    ${photoHTML}
                </div>
                <div class="doctor-info">
                    <h3>${escapeHtml(doctor.name)}</h3>
                    <div class="doctor-color-chip" title="Color e iniciales en el calendario">
                        <span class="chip-color" style="background-color: ${color};"></span>
                        <span class="chip-text">${escapeHtml(initials)}</span>
                    </div>
                    <span class="badge">${escapeHtml(doctor.specialty)}</span>
                    <p><i class="fas fa-envelope" aria-hidden="true"></i> ${escapeHtml(doctor.email)}</p>
                    <p><i class="fas fa-phone" aria-hidden="true"></i> ${escapeHtml(doctor.phone)}</p>
                </div>
                <div class="doctor-actions">
                    <button class="btn btn-sm btn-outline view-shifts-btn" data-id="${escapeHtml(doctor.id)}" title="Ver turnos">
                        <i class="fas fa-calendar" aria-hidden="true"></i> Turnos
                    </button>
                    ${this.auth.isAdmin() ? `
                        <button class="btn btn-sm btn-secondary edit-doctor-btn" data-id="${escapeHtml(doctor.id)}" title="Editar médico">
                            <i class="fas fa-edit" aria-hidden="true"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-doctor-btn" data-id="${escapeHtml(doctor.id)}" title="Eliminar médico">
                            <i class="fas fa-trash" aria-hidden="true"></i>
                        </button>
                    ` : ''}
                </div>
            </div>`;
    }

    openDoctorModal(id = null) {
        if (!this.auth.isAdmin()) {
            this.auth.showNotification('Solo los administradores pueden gestionar médicos', 'warning');
            return;
        }

        const modal = document.getElementById('doctor-modal');
        const title = document.getElementById('doctor-modal-title');
        this.currentPhoto = null;

        const passwordInput = document.getElementById('doctor-password');
        const passwordHint = document.getElementById('doctor-password-hint');

        if (id) {
            const doctor = this.getDoctorById(id);
            if (doctor) {
                title.textContent = 'Editar Médico';
                this.fillForm(doctor);
                if (passwordInput) {
                    passwordInput.required = false;
                    passwordInput.placeholder = 'Dejar vacío para no cambiar';
                }
                if (passwordHint) passwordHint.textContent = 'Deja vacío para mantener la contraseña actual';
            }
        } else {
            title.textContent = 'Nuevo Médico';
            this.clearForm();
            if (passwordInput) {
                passwordInput.required = true;
                passwordInput.placeholder = 'Contraseña requerida';
            }
            if (passwordHint) passwordHint.textContent = 'Para nuevos médicos, la contraseña es obligatoria';
        }

        this.renderColorPalette(document.getElementById('doctor-color')?.value || null);

        this.auth.openModal(modal);
    }

    /** Renderiza la paleta de colores del médico en el formulario. */
    renderColorPalette(selected = null) {
        const palette = document.getElementById('doctor-color-palette');
        if (!palette) return;

        const colors = [...DOCTOR_COLORS];
        if (selected) {
            const normalized = String(selected).toLowerCase();
            if (!colors.some(c => c.toLowerCase() === normalized)) colors.unshift(selected);
        }

        palette.innerHTML = colors.map(color => {
            const active = selected && String(color).toLowerCase() === String(selected).toLowerCase();
            return `<button type="button" class="color-swatch ${active ? 'active' : ''}" data-color="${color}"
                style="--swatch: ${color};" aria-label="Color ${color}" title="Color ${color}"></button>`;
        }).join('');

        palette.querySelectorAll('.color-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                const input = document.getElementById('doctor-color');
                if (input) input.value = sw.dataset.color;
            });
        });
    }

    closeDoctorModal() {
        this.auth.closeModal(document.getElementById('doctor-modal'));
    }

    async saveDoctor() {
        const formData = this.getFormData();
        if (!await this.validateForm(formData)) return;

        const existing = formData.id ? this.getDoctorById(formData.id) : null;

        const doctorData = {
            name: formData.name.trim(),
            specialty: formData.specialty.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            username: formData.username.trim(),
            initials: formData.initials.trim() || computeInitials(formData.name.trim()),
            color: formData.color || getDoctorColor(existing, this.doctors.length),
            photo: this.currentPhoto || existing?.photo || null
        };

        // Contraseña: almacenar solo su hash, nunca en texto plano
        if (formData.password) {
            doctorData.passwordHash = await hashPassword(formData.password);
        } else if (existing?.passwordHash) {
            doctorData.passwordHash = existing.passwordHash;
        } else if (existing?.password) {
            doctorData.passwordHash = await hashPassword(existing.password);
        }

        try {
            const id = await dataManager.save('doctors', doctorData, formData.id || null);
            if (id) {
                this.closeDoctorModal();
                this.auth.showNotification('Médico guardado correctamente', 'success');
                await this.loadDoctors();
            }
        } catch (error) {
            console.error('Error saveDoctor:', error);
            this.auth.showNotification('Error al guardar: ' + (error.message || 'Error de conexión'), 'error');
        }
    }

    async deleteDoctor(id) {
        const finalId = String(id || '').trim();
        if (!finalId || finalId === 'undefined') {
            this.auth.showNotification('ID de médico inválido', 'error');
            return;
        }

        const doctor = this.getDoctorById(finalId);
        const message = doctor
            ? `¿Eliminar al ${doctor.name}? Esta acción no se puede deshacer.`
            : '¿Eliminar a este médico? Esta acción no se puede deshacer.';

        if (!confirm(message)) return;

        try {
            // Eliminar también los turnos asociados al médico
            const shifts = await dataManager.getAll('shifts');
            const doctorShifts = shifts.filter(s => String(s.doctorId).trim() === finalId);
            for (const shift of doctorShifts) {
                await dataManager.delete('shifts', shift.id);
            }

            const success = await dataManager.delete('doctors', finalId);
            if (success) {
                this.auth.showNotification('Médico eliminado', 'success');
            } else {
                this.auth.showNotification('Error al eliminar del servidor', 'error');
            }
            await this.loadDoctors();
        } catch (error) {
            console.error('Error deleteDoctor:', error);
            this.auth.showNotification('Error al eliminar médico', 'error');
        }
    }

    viewDoctorShifts(doctorId) {
        const link = document.querySelector('[href="#turnos"]');
        if (link) link.click();
        const doctor = this.getDoctorById(doctorId);
        this.auth.showNotification(
            `Turnos de ${doctor ? doctor.name : 'médico seleccionado'}`,
            'info'
        );
    }

    // ==================== Helpers de formulario ====================

    fillForm(doctor) {
        document.getElementById('doctor-id').value = doctor.id || '';
        document.getElementById('doctor-name').value = doctor.name || '';
        document.getElementById('doctor-specialty').value = doctor.specialty || '';
        document.getElementById('doctor-email').value = doctor.email || '';
        document.getElementById('doctor-phone').value = doctor.phone || '';
        document.getElementById('doctor-username').value = doctor.username || '';
        document.getElementById('doctor-password').value = '';
        document.getElementById('doctor-initials').value = doctor.initials || '';
        document.getElementById('doctor-color').value = doctor.color || '';
        this.updatePhotoPreview(doctor.photo);
    }

    clearForm() {
        document.getElementById('doctor-form').reset();
        document.getElementById('doctor-id').value = '';
        document.getElementById('doctor-initials').value = '';
        document.getElementById('doctor-color').value = '';
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
            password: document.getElementById('doctor-password').value,
            initials: document.getElementById('doctor-initials').value,
            color: document.getElementById('doctor-color').value
        };
    }

    async validateForm(data) {
        if (!data.name.trim() || !data.specialty.trim() || !data.username.trim()) {
            this.auth.showNotification('Nombre, especialidad y usuario son obligatorios', 'warning');
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
            this.auth.showNotification('Ingresa un email válido', 'warning');
            return false;
        }

        // Contraseña obligatoria solo para médicos nuevos
        if (!data.id && !data.password) {
            this.auth.showNotification('La contraseña es obligatoria para nuevos médicos', 'warning');
            return false;
        }

        // Usuario único
        const duplicate = this.doctors.find(d =>
            String(d.username).toLowerCase() === data.username.trim().toLowerCase() &&
            String(d.id) !== String(data.id)
        );
        if (duplicate) {
            this.auth.showNotification('El nombre de usuario ya está en uso', 'warning');
            return false;
        }

        return true;
    }

    updatePhotoPreview(src) {
        const preview = document.getElementById('doctor-photo-preview');
        const statusText = document.getElementById('photo-status-text');

        if (src) {
            preview.innerHTML = `<img src="${src}" alt="Vista previa de la foto">`;
            if (statusText) statusText.textContent = 'Foto seleccionada';
        } else {
            preview.innerHTML = `<i class="fas fa-user-md photo-upload-icon" aria-hidden="true"></i>`;
            if (statusText) statusText.textContent = 'No hay foto seleccionada';
        }
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.auth.showNotification('Selecciona un archivo de imagen válido', 'warning');
            e.target.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            this.auth.showNotification('La imagen debe ser menor a 2MB', 'warning');
            e.target.value = '';
            return;
        }

        const statusText = document.getElementById('photo-status-text');
        if (statusText) statusText.textContent = 'Procesando imagen...';

        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX) {
                        height *= MAX / width;
                        width = MAX;
                    }
                } else if (height > MAX) {
                    width *= MAX / height;
                    height = MAX;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                this.currentPhoto = canvas.toDataURL('image/jpeg', 0.7);
                this.updatePhotoPreview(this.currentPhoto);
                if (statusText) statusText.textContent = 'Foto lista';
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    }

    filterDoctors() {
        const term = document.getElementById('doctor-search').value.toLowerCase();
        const specialty = document.getElementById('specialty-filter').value;

        const filtered = this.doctors.filter(d =>
            (String(d.name).toLowerCase().includes(term) ||
                String(d.specialty).toLowerCase().includes(term) ||
                String(d.email).toLowerCase().includes(term)) &&
            (!specialty || d.specialty === specialty)
        );
        this.renderDoctors(filtered);
    }

    updateSpecialtyFilter() {
        const select = document.getElementById('specialty-filter');
        if (!select) return;
        const specialties = [...new Set(this.doctors.map(d => d.specialty).filter(Boolean))];
        const current = select.value;
        select.innerHTML = '<option value="">Todas las especialidades</option>' +
            specialties.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
        if (current && specialties.includes(current)) select.value = current;
    }

    updateStats() {
        const el = document.getElementById('stat-doctors');
        if (el) el.textContent = this.doctors.length;
        if (window.app) window.app.renderHomeDashboard();
    }
}
