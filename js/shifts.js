// Gestión de turnos - VERSION SIMPLIFICADA Y FUNCIONAL
class ShiftsManager {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.init();
    }

    init() {
        this.setupControls();
        this.renderCalendar();
    }

    setupControls() {
        // Botones de vista
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderCalendar();
            });
        });

        // Navegación
        document.getElementById('prev-period')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('next-period')?.addEventListener('click', () => this.navigate(1));

        // Botón agregar turno
        document.getElementById('add-shift-btn')?.addEventListener('click', () => {
            this.openShiftModal();
        });
    }

    navigate(direction) {
        switch(this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
        }
        this.renderCalendar();
    }

    renderCalendar() {
        const container = document.getElementById('calendar-view');
        const period = document.getElementById('current-period');
        
        if (!container) return;

        let html = '';
        let periodText = '';

        switch(this.currentView) {
            case 'month':
                html = this.renderMonthView();
                periodText = this.currentDate.toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                }).toUpperCase();
                break;
            case 'week':
                html = this.renderWeekView();
                const weekStart = new Date(this.currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                periodText = `Semana del ${weekStart.toLocaleDateString()} al ${weekEnd.toLocaleDateString()}`;
                break;
            case 'day':
                html = this.renderDayView();
                periodText = this.currentDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).toUpperCase();
                break;
        }

        container.innerHTML = html;
        if (period) period.textContent = periodText;
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = '<div class="calendar-month">';
        
        // Encabezados
        ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Días
        const current = new Date(startDate);
        while (current <= new Date(lastDay.getTime() + (6 - lastDay.getDay()) * 86400000)) {
            const isOtherMonth = current.getMonth() !== month;
            const dateStr = current.toISOString().split('T')[0];
            const shifts = storage.getShiftsByDate(dateStr);
            
            html += `
                <div class="calendar-day ${isOtherMonth ? 'other-month' : ''}">
                    <div class="day-number">${current.getDate()}</div>
                    ${shifts.map(shift => this.renderShiftItem(shift)).join('')}
                </div>
            `;
            
            current.setDate(current.getDate() + 1);
        }
        
        html += '</div>';
        return html;
    }

    renderWeekView() {
        const start = new Date(this.currentDate);
        start.setDate(start.getDate() - start.getDay());
        
        let html = '<div class="calendar-week">';
        
        for (let i = 0; i < 7; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const dateStr = current.toISOString().split('T')[0];
            const shifts = storage.getShiftsByDate(dateStr);
            
            html += `
                <div class="calendar-day">
                    <div class="day-header">
                        ${current.toLocaleDateString('es-ES', { weekday: 'short' })} 
                        ${current.getDate()}
                    </div>
                    <div class="shifts-container">
                        ${shifts.map(shift => this.renderShiftItem(shift, true)).join('')}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    renderDayView() {
        const dateStr = this.currentDate.toISOString().split('T')[0];
        const shifts = storage.getShiftsByDate(dateStr);
        
        let html = `
            <div class="calendar-day-detailed">
                <div class="time-slots">
                    ${Array.from({length: 24}, (_, i) => 
                        `<div class="time-slot">${i.toString().padStart(2, '0')}:00</div>`
                    ).join('')}
                </div>
                <div class="shifts-timeline">
                    ${shifts.map(shift => this.renderTimelineShift(shift)).join('')}
                </div>
            </div>
        `;
        
        return html;
    }

    renderShiftItem(shift, detailed = false) {
        const doctor = storage.getDoctors().find(d => d.id === shift.doctorId);
        if (!doctor) return '';

        return `
            <div class="shift-item ${shift.type}" 
                 onclick="shifts.openShiftModal(${shift.id})"
                 title="${doctor.name} - ${shift.type} (${shift.startTime}-${shift.endTime})">
                ${detailed ? `
                    <strong>${doctor.name.split(' ')[0]}</strong><br>
                    ${shift.type} - ${shift.startTime}
                ` : `
                    ${doctor.name.split(' ')[0]} - ${shift.startTime.split(':')[0]}h
                `}
            </div>
        `;
    }

    renderTimelineShift(shift) {
        const doctor = storage.getDoctors().find(d => d.id === shift.doctorId);
        if (!doctor) return '';

        const start = parseInt(shift.startTime.split(':')[0]);
        const end = parseInt(shift.endTime.split(':')[0]);
        const top = (start / 24) * 100;
        const height = ((end - start) / 24) * 100;

        return `
            <div class="timeline-shift ${shift.type}" 
                 style="top: ${top}%; height: ${height}%;"
                 onclick="shifts.openShiftModal(${shift.id})">
                <div class="shift-content">
                    <strong>${doctor.name.split(' ')[0]}</strong><br>
                    ${shift.type}<br>
                    ${shift.startTime} - ${shift.endTime}
                </div>
            </div>
        `;
    }

    openShiftModal(shiftId = null) {
        if (!auth.isLoggedIn) {
            alert('Debe iniciar sesión');
            return;
        }

        const modal = document.getElementById('shift-modal');
        const title = document.getElementById('shift-modal-title');
        
        if (!modal || !title) return;

        this.populateDoctorsSelect();

        if (shiftId) {
            // Editar
            const shift = storage.getShifts().find(s => s.id === shiftId);
            if (shift) {
                title.textContent = 'Editar Turno';
                this.fillShiftForm(shift);
            }
        } else {
            // Nuevo
            title.textContent = 'Nuevo Turno';
            this.clearShiftForm();
        }

        modal.style.display = 'block';
    }

    populateDoctorsSelect() {
        const select = document.getElementById('shift-doctor');
        if (!select) return;

        const doctors = storage.getDoctors();
        select.innerHTML = '<option value="">Seleccionar médico</option>' +
            doctors.map(d => `<option value="${d.id}">${d.name} - ${d.specialty}</option>`).join('');
    }

    fillShiftForm(shift) {
        document.getElementById('shift-id').value = shift.id;
        document.getElementById('shift-doctor').value = shift.doctorId;
        document.getElementById('shift-date').value = shift.date;
        document.getElementById('shift-type').value = shift.type;
        document.getElementById('shift-start').value = shift.startTime;
        document.getElementById('shift-end').value = shift.endTime;
        document.getElementById('shift-notes').value = shift.notes || '';
    }

    clearShiftForm() {
        document.getElementById('shift-form').reset();
        document.getElementById('shift-id').value = '';
        // Valores por defecto
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('shift-date').value = today;
        document.getElementById('shift-start').value = '08:00';
        document.getElementById('shift-end').value = '16:00';
    }

    saveShift() {
        const formData = this.getShiftFormData();
        
        if (!this.validateShift(formData)) {
            return false;
        }

        const shiftData = {
            id: formData.id ? parseInt(formData.id) : null,
            doctorId: parseInt(formData.doctorId),
            date: formData.date,
            type: formData.type,
            startTime: formData.startTime,
            endTime: formData.endTime,
            notes: formData.notes
        };

        // Verificar conflicto
        if (storage.checkShiftConflict(shiftData, shiftData.id)) {
            this.showNotification('Conflicto de horario', 'error');
            return false;
        }

        const saved = storage.saveShift(shiftData);
        if (saved) {
            this.renderCalendar();
            this.closeShiftModal();
            this.showNotification('Turno guardado', 'success');
            return true;
        } else {
            this.showNotification('Error al guardar', 'error');
            return false;
        }
    }

    getShiftFormData() {
        return {
            id: document.getElementById('shift-id').value,
            doctorId: document.getElementById('shift-doctor').value,
            date: document.getElementById('shift-date').value,
            type: document.getElementById('shift-type').value,
            startTime: document.getElementById('shift-start').value,
            endTime: document.getElementById('shift-end').value,
            notes: document.getElementById('shift-notes').value
        };
    }

    validateShift(data) {
        if (!data.doctorId || !data.date || !data.type || !data.startTime || !data.endTime) {
            this.showNotification('Complete todos los campos', 'error');
            return false;
        }

        if (data.startTime >= data.endTime) {
            this.showNotification('Hora fin debe ser posterior', 'error');
            return false;
        }

        return true;
    }

    deleteShift() {
        const shiftId = document.getElementById('shift-id').value;
        if (shiftId && confirm('¿Eliminar este turno?')) {
            storage.deleteShift(parseInt(shiftId));
            this.renderCalendar();
            this.closeShiftModal();
            this.showNotification('Turno eliminado', 'success');
        }
    }

    closeShiftModal() {
        const modal = document.getElementById('shift-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
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

const shifts = new ShiftsManager();