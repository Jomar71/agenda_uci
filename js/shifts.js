/**
 * ShiftsManager - Gestión de turnos.
 * Vistas mensual, semanal y diaria con sincronización en tiempo real.
 */

import { dataManager } from './services/data-manager.js';
import {
    escapeHtml, getShiftType, formatDateLocal, todayLocal,
    getDoctorColor, getDoctorInitials, getContrastColor
} from './utils.js';

export class ShiftsManager {
    constructor(authManager, doctorsManager) {
        this.auth = authManager;
        this.doctorsManager = doctorsManager;
        this.shifts = [];
        this.currentDate = new Date();
        this.currentView = 'month';
        this.init();
    }

    async init() {
        console.log('📅 ShiftsManager: Initializing...');
        await this.loadShifts();
        this.setupEventListeners();
        this.renderCalendar();

        dataManager.subscribe('shifts', async () => {
            await this.loadShifts();
            this.renderCalendar();
        });

        window.addEventListener('uci_firebase_online', async () => {
            await this.loadShifts();
            this.renderCalendar();
        });

        // Sincronización entre pestañas (modo local)
        window.addEventListener('storage', (e) => {
            if (e.key === 'shifts') {
                this.loadShifts().then(() => this.renderCalendar());
            }
        });
    }

    async loadShifts() {
        try {
            this.shifts = await dataManager.getAll('shifts');
            if (window.app) window.app.renderHomeDashboard();
        } catch (error) {
            console.error('Error loadShifts:', error);
        }
    }

    getShifts() {
        return this.shifts;
    }

    /**
     * Turnos visibles según el rol:
     * - Médico: solo sus propios turnos.
     * - Administrador / visitante: todos los turnos.
     */
    getVisibleShifts() {
        if (this.auth?.isLoggedIn && !this.auth.isAdmin()) {
            const userId = this.auth.currentUser?.id;
            return this.shifts.filter(s => String(s.doctorId).trim() === String(userId).trim());
        }
        return this.shifts;
    }

    setupEventListeners() {
        document.getElementById('prev-period')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('next-period')?.addEventListener('click', () => this.navigate(1));

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderCalendar();
            });
        });

        document.getElementById('add-shift-btn')?.addEventListener('click', () => this.openShiftModal());
        document.getElementById('save-shift-btn')?.addEventListener('click', () => this.saveShift());
        document.getElementById('cancel-shift-btn')?.addEventListener('click', () => this.closeShiftModal());
        document.getElementById('delete-shift-btn')?.addEventListener('click', () => this.deleteShift());

        // Horas automáticas según tipo
        document.getElementById('shift-type')?.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'mañana') {
                document.getElementById('shift-start').value = '07:00';
                document.getElementById('shift-end').value = '19:00';
            } else if (type === 'noche') {
                document.getElementById('shift-start').value = '19:00';
                document.getElementById('shift-end').value = '07:00';
            }
        });

        // Delegación de eventos en la vista de calendario (persistente)
        // Los médicos solo pueden consultar: solo el admin abre el modal de edición
        const container = document.getElementById('calendar-view');
        if (container && !container.dataset.listenerAttached) {
            container.addEventListener('click', (e) => {
                if (!this.auth.isAdmin()) return;

                const addBtn = e.target.closest('.daily-add-shift');
                if (addBtn) {
                    this.openShiftModal(null, addBtn.dataset.date);
                    return;
                }

                const pill = e.target.closest('.shift-pill');
                if (pill) {
                    this.openShiftModal(pill.dataset.id);
                    return;
                }

                const card = e.target.closest('.daily-shift-card');
                if (card) {
                    this.openShiftModal(card.dataset.id);
                    return;
                }

                const day = e.target.closest('.calendar-day');
                if (day && !e.target.closest('.shift-pill')) {
                    this.openShiftModal(null, day.dataset.date);
                    return;
                }

                const cell = e.target.closest('.day-cell');
                if (cell) {
                    this.openShiftModal(null, cell.dataset.date);
                    return;
                }
            });
            container.dataset.listenerAttached = 'true';
        }
    }

    navigate(direction) {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        }
        this.renderCalendar();
    }

    renderCalendar() {
        const container = document.getElementById('calendar-view');
        if (!container) return;

        const periodText = document.getElementById('current-period');
        let html = '';

        if (this.currentView === 'month') {
            html = this.renderMonthView();
            if (periodText) {
                periodText.textContent = this.currentDate
                    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                    .toUpperCase();
            }
        } else if (this.currentView === 'week') {
            html = this.renderWeekView();
            if (periodText) {
                const start = this.getStartOfWeek(this.currentDate);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                const fmt = { day: 'numeric', month: 'short' };
                periodText.textContent = `Semana del ${start.toLocaleDateString('es-ES', fmt)} al ${end.toLocaleDateString('es-ES', fmt)}`;
            }
        } else {
            html = this.renderDayView();
            if (periodText) {
                periodText.textContent = this.currentDate.toLocaleDateString('es-ES', { dateStyle: 'full' });
            }
        }

        container.innerHTML = html;
    }

    getStartOfWeek(date) {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    }

    getShiftsForDate(dateStr) {
        return this.getVisibleShifts().filter(s => s.date === dateStr);
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const start = new Date(firstDay);
        start.setDate(start.getDate() - start.getDay());

        let html = `
            <div class="calendar-grid-header">
                ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => `<div>${d}</div>`).join('')}
            </div>
            <div class="calendar-month-grid">`;

        let current = new Date(start);
        for (let i = 0; i < 42; i++) {
            const isToday = formatDateLocal(current) === todayLocal();
            const isOtherMonth = current.getMonth() !== month;
            const dateStr = formatDateLocal(current);
            const shifts = this.getShiftsForDate(dateStr);

            html += `
                <div class="calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <span class="day-number">${current.getDate()}</span>
                    <div class="day-shifts">
                        ${shifts.slice(0, 2).map(s => this.renderShiftPill(s)).join('')}
                        ${shifts.length > 2 ? `<span class="more-shifts">+${shifts.length - 2}</span>` : ''}
                    </div>
                </div>`;
            current.setDate(current.getDate() + 1);
        }

        html += `</div>
            ${this.renderLegend()}`;

        return html;
    }

    renderWeekView() {
        const startOfWeek = this.getStartOfWeek(this.currentDate);

        let html = `
            <div class="calendar-grid-header">
                ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => `<div>${d}</div>`).join('')}
            </div>
            <div class="calendar-week-grid">`;

        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            const dateStr = formatDateLocal(current);
            const isToday = dateStr === todayLocal();
            const shifts = this.getShiftsForDate(dateStr);

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <span class="day-number">${current.getDate()}</span>
                    <div class="day-shifts">
                        ${shifts.map(s => this.renderShiftPill(s)).join('')}
                        ${shifts.length === 0 ? '<small class="text-muted">Sin turnos</small>' : ''}
                    </div>
                </div>`;
        }

        html += `</div>${this.renderLegend()}`;

        return html;
    }

    renderDayView() {
        const dateStr = formatDateLocal(this.currentDate);
        const shifts = this.getShiftsForDate(dateStr);

        let html = `
            <div class="daily-view-container">
                <div class="daily-header">
                    <h4>Turnos del ${this.currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                    ${this.auth.isAdmin() ? `
                        <button class="btn btn-sm btn-primary daily-add-shift" data-date="${dateStr}">
                            <i class="fas fa-plus" aria-hidden="true"></i> Añadir Turno
                        </button>` : ''}
                </div>
                <div class="daily-shifts-list">`;

        if (shifts.length === 0) {
            html += '<p class="no-shifts">No hay turnos registrados para este día.</p>';
        } else {
            html += shifts.map(s => {
                const doctor = this.doctorsManager.getDoctorById(s.doctorId);
                const type = getShiftType(s.type);
                const color = getDoctorColor(doctor);
                const textColor = getContrastColor(color);
                const initials = getDoctorInitials(doctor);
                return `
                    <div class="daily-shift-card" data-id="${escapeHtml(s.id)}" role="button" tabindex="0"
                        style="--doctor-color: ${color};">
                        <div class="shift-time">
                            <span class="doctor-initials-badge" style="background-color: ${color}; color: ${textColor};"
                                title="${doctor ? escapeHtml(doctor.name) : 'Médico no asignado'}">${escapeHtml(initials)}</span>
                            <span>${escapeHtml(s.startTime)} - ${escapeHtml(s.endTime)}</span>
                        </div>
                        <div class="shift-info">
                            <strong>${doctor ? escapeHtml(doctor.name) : 'Médico no asignado'}</strong>
                            <span>${escapeHtml(type.label)}</span>
                            ${s.notes ? `<span>${escapeHtml(s.notes)}</span>` : ''}
                        </div>
                        <i class="fas fa-chevron-right" aria-hidden="true"></i>
                    </div>`;
            }).join('');
        }

        html += `</div></div>${this.renderLegend()}`;
        return html;
    }

    renderShiftPill(shift) {
        const doctor = this.doctorsManager.getDoctorById(shift.doctorId);
        const color = getDoctorColor(doctor);
        const textColor = getContrastColor(color);
        const initials = getDoctorInitials(doctor);
        const type = getShiftType(shift.type);
        const name = doctor ? doctor.name : 'Médico no asignado';

        return `
            <div class="shift-pill" data-id="${escapeHtml(shift.id)}"
                style="--doctor-color: ${color}; --doctor-text-color: ${textColor};"
                title="${escapeHtml(name)} · ${escapeHtml(type.label)} · ${escapeHtml(shift.startTime)} - ${escapeHtml(shift.endTime)}">
                <span class="shift-type-tag">${escapeHtml(type.short)}</span>
                <span class="shift-doctor-name">${escapeHtml(initials)}</span>
            </div>`;
    }

    renderLegend() {
        const doctors = this.doctorsManager.getDoctors();
        if (!doctors.length) {
            return `
                <div class="calendar-legend">
                    <span>Leyenda:</span>
                    <div class="legend-item">
                        <span class="legend-dot" style="background-color: #94a3b8;"></span>
                        Sin médicos registrados
                    </div>
                </div>`;
        }
        return `
            <div class="calendar-legend">
                <span>Leyenda:</span>
                ${doctors.map(d => {
                    const color = getDoctorColor(d);
                    const initials = getDoctorInitials(d);
                    return `
                        <div class="legend-item" title="${escapeHtml(d.name)}">
                            <span class="legend-dot" style="background-color: ${color};"></span>
                            <span class="legend-initials">${escapeHtml(initials)}</span>
                            <span class="legend-name">· ${escapeHtml(String(d.name).split(' ')[0])}</span>
                        </div>`;
                }).join('')}
            </div>`;
    }

    openShiftModal(id = null, date = null) {
        if (!this.auth.isAdmin()) {
            this.auth.showNotification('Solo el administrador puede modificar turnos', 'warning');
            return;
        }

        const modal = document.getElementById('shift-modal');
        if (!modal) return;

        this.populateDoctors();

        if (id) {
            const shift = this.shifts.find(s => String(s.id) === String(id));
            if (shift) {
                document.getElementById('shift-modal-title').textContent = 'Editar Turno';
                document.getElementById('shift-id').value = shift.id;
                document.getElementById('shift-doctor').value = shift.doctorId;
                document.getElementById('shift-date').value = shift.date;
                document.getElementById('shift-type').value = shift.type;
                document.getElementById('shift-start').value = shift.startTime;
                document.getElementById('shift-end').value = shift.endTime;
                document.getElementById('shift-notes').value = shift.notes || '';
                document.getElementById('delete-shift-btn').style.display = 'inline-flex';
            }
        } else {
            document.getElementById('shift-modal-title').textContent = 'Nuevo Turno';
            document.getElementById('shift-form').reset();
            document.getElementById('shift-id').value = '';
            document.getElementById('shift-start').value = '07:00';
            document.getElementById('shift-end').value = '19:00';
            document.getElementById('shift-date').value = date || todayLocal();
            document.getElementById('delete-shift-btn').style.display = 'none';
        }

        this.auth.openModal(modal);
    }

    closeShiftModal() {
        this.auth.closeModal(document.getElementById('shift-modal'));
    }

    populateDoctors() {
        const select = document.getElementById('shift-doctor');
        select.innerHTML = '<option value="">Seleccionar médico</option>' +
            this.doctorsManager.getDoctors()
                .map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`)
                .join('');
    }

    async saveShift() {
        if (!this.auth.isAdmin()) {
            this.auth.showNotification('Solo el administrador puede modificar turnos', 'warning');
            return;
        }

        const formData = {
            id: document.getElementById('shift-id').value,
            doctorId: document.getElementById('shift-doctor').value,
            date: document.getElementById('shift-date').value,
            type: document.getElementById('shift-type').value,
            startTime: document.getElementById('shift-start').value,
            endTime: document.getElementById('shift-end').value,
            notes: document.getElementById('shift-notes').value.trim()
        };

        if (!formData.doctorId || !formData.date || !formData.type) {
            this.auth.showNotification('Completa los campos obligatorios', 'warning');
            return;
        }

        try {
            await dataManager.save('shifts', formData, formData.id || null);
            this.closeShiftModal();
            this.auth.showNotification('Turno guardado correctamente', 'success');
            await this.loadShifts();
            this.renderCalendar();
        } catch (error) {
            console.error('Error saveShift:', error);
            this.auth.showNotification('Error al guardar el turno', 'error');
        }
    }

    async deleteShift() {
        if (!this.auth.isAdmin()) {
            this.auth.showNotification('Solo el administrador puede modificar turnos', 'warning');
            return;
        }

        const id = document.getElementById('shift-id').value;
        if (!id || !confirm('¿Borrar este turno?')) return;

        try {
            await dataManager.delete('shifts', id);
            this.closeShiftModal();
            this.auth.showNotification('Turno eliminado', 'success');
            await this.loadShifts();
            this.renderCalendar();
        } catch (error) {
            console.error('Error deleteShift:', error);
            this.auth.showNotification('Error al eliminar el turno', 'error');
        }
    }
}
