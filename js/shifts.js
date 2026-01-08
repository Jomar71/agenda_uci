
import { dataManager } from './services/data-manager.js';

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
        this.renderCalendar(); // Initial render

        // Subscribe to real-time updates
        dataManager.subscribe('shifts', async (changes) => {
            console.log('🔥 Shifts update received');
            await this.loadShifts();
            this.renderCalendar();
        });

        // RE-LOAD when Firebase connects
        window.addEventListener('uci_firebase_online', async () => {
            console.log('🔄 ShiftsManager: Firebase ONLINE, re-loading shifts...');
            await this.loadShifts();
            this.renderCalendar();
        });
    }

    async loadShifts() {
        this.shifts = await dataManager.getAll('shifts');
        console.log(`✅ Loaded ${this.shifts.length} shifts`);
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

        const addShiftBtn = document.getElementById('add-shift-btn');
        if (addShiftBtn) addShiftBtn.addEventListener('click', () => this.openShiftModal());

        const saveShiftBtn = document.getElementById('save-shift-btn');
        if (saveShiftBtn) saveShiftBtn.addEventListener('click', () => this.saveShift());

        const cancelShiftBtn = document.getElementById('cancel-shift-btn');
        if (cancelShiftBtn) cancelShiftBtn.addEventListener('click', () => this.closeShiftModal());

        const deleteShiftBtn = document.getElementById('delete-shift-btn');
        if (deleteShiftBtn) deleteShiftBtn.addEventListener('click', () => this.deleteShift());

        // Automatic hours based on shift type
        document.getElementById('shift-type')?.addEventListener('change', (e) => {
            const type = e.target.value;
            const startInput = document.getElementById('shift-start');
            const endInput = document.getElementById('shift-end');

            if (type === 'mañana') {
                startInput.value = '07:00';
                endInput.value = '19:00';
            } else if (type === 'noche') {
                startInput.value = '19:00';
                endInput.value = '07:00';
            }
        });
    }

    navigate(direction) {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
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
            if (periodText) periodText.textContent = this.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        } else if (this.currentView === 'week') {
            html = this.renderWeekView();
            if (periodText) periodText.textContent = 'Semana Actual'; // Simplificado
        } else {
            html = this.renderDayView();
            if (periodText) periodText.textContent = this.currentDate.toLocaleDateString('es-ES', { dateStyle: 'full' });
        }

        container.innerHTML = html;
        this.attachCalendarEvents();
    }

    // --- Render Logics ---

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const start = new Date(firstDay);
        start.setDate(start.getDate() - start.getDay());

        let html = `<div class="calendar-grid-header">
            ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => `<div>${d}</div>`).join('')}
        </div><div class="calendar-month-grid">`;

        let current = new Date(start);
        // 6 weeks to cover all months
        for (let i = 0; i < 42; i++) {
            const isToday = current.toDateString() === new Date().toDateString();
            const isOtherMonth = current.getMonth() !== month;
            const dateStr = current.toISOString().split('T')[0];
            const shifts = this.shifts.filter(s => s.date === dateStr);

            html += `
                <div class="calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <span class="day-number">${current.getDate()}</span>
                    <div class="day-shifts">
                        ${shifts.slice(0, 2).map(s => this.renderShiftPill(s)).join('')}
                        ${shifts.length > 2 ? `<span class="more-shifts">+${shifts.length - 2}</span>` : ''}
                    </div>
                </div>
            `;
            current.setDate(current.getDate() + 1);
        }
        html += '</div>';
        return html;
    }

    renderWeekView() {
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());

        let html = `<div class="calendar-grid-header">
            ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => `<div>${d}</div>`).join('')}
        </div><div class="calendar-week-grid">`;

        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            const dateStr = current.toISOString().split('T')[0];
            const isToday = current.toDateString() === new Date().toDateString();
            const shifts = this.shifts.filter(s => s.date === dateStr);

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <span class="day-number">${current.getDate()} / ${current.getMonth() + 1}</span>
                    <div class="day-shifts">
                        ${shifts.map(s => this.renderShiftPill(s)).join('')}
                    </div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    renderDayView() {
        const dateStr = this.currentDate.toISOString().split('T')[0];
        const shifts = this.shifts.filter(s => s.date === dateStr);

        let html = `
            <div class="daily-view-container">
                <div class="daily-header">
                    <h4>Turnos para el ${this.currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                    <button class="btn btn-sm btn-primary" onclick="window.app.shifts.openShiftModal(null, '${dateStr}')">
                        <i class="fas fa-plus"></i> Añadir Turno
                    </button>
                </div>
                <div class="daily-shifts-list">
                    ${shifts.length === 0 ? '<p class="text-muted text-center p-4">No hay turnos para este día</p>' :
                shifts.map(s => {
                    const doctor = this.doctorsManager.getDoctorById(s.doctorId);
                    return `
                        <div class="daily-shift-card ${s.type}" onclick="window.app.shifts.openShiftModal(${s.id})">
                            <div class="shift-time">${s.startTime} - ${s.endTime}</div>
                            <div class="shift-info">
                                <strong>${doctor ? doctor.name : 'Cargando...'}</strong>
                                <span>${s.type.toUpperCase()}</span>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>`;
                }).join('')}
                </div>
            </div>
        `;
        return html;
    }

    renderShiftPill(shift) {
        const doctor = this.doctorsManager.getDoctorById(shift.doctorId);
        const name = doctor ? doctor.name.split(' ')[0] : '???'; // Use first name
        const timeAbbr = shift.startTime === '07:00' ? 'D' : (shift.startTime === '19:00' ? 'N' : '');

        return `
            <div class="shift-pill ${shift.type} animate__animated animate__fadeIn" data-id="${shift.id}" title="${shift.startTime} - ${shift.endTime}">
                <span class="shift-type-tag">${timeAbbr}</span>
                <span class="shift-doctor-name">${name}</span>
            </div>`;
    }

    attachCalendarEvents() {
        document.querySelectorAll('.calendar-day').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.shift-pill')) return;
                this.openShiftModal(null, el.dataset.date);
            });
        });

        document.querySelectorAll('.shift-pill').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openShiftModal(el.dataset.id);
            });
        });
    }

    openShiftModal(id = null, date = null) {
        if (!this.auth.isLoggedIn) {
            this.auth.showNotification('Debes iniciar sesión', 'error');
            return;
        }

        const modal = document.getElementById('shift-modal');
        this.populateDoctors();

        if (id) {
            const shift = this.shifts.find(s => s.id === id);
            if (shift) {
                document.getElementById('shift-id').value = shift.id;
                document.getElementById('shift-doctor').value = shift.doctorId;
                document.getElementById('shift-date').value = shift.date;
                document.getElementById('shift-type').value = shift.type;
                document.getElementById('shift-start').value = shift.startTime;
                document.getElementById('shift-end').value = shift.endTime;
                document.getElementById('shift-notes').value = shift.notes || '';
                document.getElementById('delete-shift-btn').style.display = 'inline-block';
            }
        } else {
            document.getElementById('shift-form').reset();
            document.getElementById('shift-id').value = '';
            if (date) document.getElementById('shift-date').value = date;
            document.getElementById('delete-shift-btn').style.display = 'none';
        }
        modal.style.display = 'block';
    }

    closeShiftModal() {
        document.getElementById('shift-modal').style.display = 'none';
    }

    populateDoctors() {
        const select = document.getElementById('shift-doctor');
        select.innerHTML = '<option value="">Seleccionar Médico</option>' +
            this.doctorsManager.getDoctors().map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }

    async saveShift() {
        const formData = {
            id: document.getElementById('shift-id').value,
            doctorId: document.getElementById('shift-doctor').value,
            date: document.getElementById('shift-date').value,
            type: document.getElementById('shift-type').value,
            startTime: document.getElementById('shift-start').value,
            endTime: document.getElementById('shift-end').value,
            notes: document.getElementById('shift-notes').value
        };

        if (!formData.doctorId || !formData.date) return;

        try {
            await dataManager.save('shifts', formData, formData.id ? formData.id : null);
            this.closeShiftModal();
            this.auth.showNotification('Turno guardado', 'success');
            await this.loadShifts(); // Refresh
            this.renderCalendar();
        } catch (e) {
            console.error(e);
            this.auth.showNotification('Error al guardar turno', 'error');
        }
    }

    async deleteShift() {
        const id = document.getElementById('shift-id').value;
        if (id && confirm('¿Borrar turno?')) {
            await dataManager.delete('shifts', id);
            this.closeShiftModal();
            this.auth.showNotification('Turno eliminado', 'success');
            await this.loadShifts();
            this.renderCalendar();
        }
    }
}