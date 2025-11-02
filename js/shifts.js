// Gestión de turnos
class ShiftsManager {
    constructor() {
        this.currentView = 'month';
        this.currentDate = new Date();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderCalendar();
    }

    setupEventListeners() {
        // Controles de vista
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderCalendar();
            });
        });

        // Navegación de período
        document.getElementById('prev-period').addEventListener('click', () => {
            this.navigatePeriod(-1);
        });

        document.getElementById('next-period').addEventListener('click', () => {
            this.navigatePeriod(1);
        });

        // Modal de turnos
        document.getElementById('add-shift-btn').addEventListener('click', () => {
            this.openShiftModal();
        });
    }

    navigatePeriod(direction) {
        switch (this.currentView) {
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
        const periodElement = document.getElementById('current-period');

        switch (this.currentView) {
            case 'month':
                container.innerHTML = this.renderMonthView();
                periodElement.textContent = this.currentDate.toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                }).toUpperCase();
                break;
            case 'week':
                container.innerHTML = this.renderWeekView();
                const weekStart = new Date(this.currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                periodElement.textContent = `Semana del ${weekStart.toLocaleDateString()} al ${weekEnd.toLocaleDateString()}`;
                break;
            case 'day':
                container.innerHTML = this.renderDayView();
                periodElement.textContent = this.currentDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }).toUpperCase();
                break;
        }
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
        
        let html = '<div class="calendar-month">';
        
        // Encabezados de días
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        // Días del mes
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const isOtherMonth = currentDate.getMonth() !== month;
            const dateString = currentDate.toISOString().split('T')[0];
            const shifts = storage.getShiftsByDateRange(currentDate, currentDate);
            
            html += `
                <div class="calendar-day ${isOtherMonth ? 'other-month' : ''}">
                    <div class="day-number">${currentDate.getDate()}</div>
                    ${shifts.map(shift => this.renderShiftItem(shift)).join('')}
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        html += '</div>';
        return html;
    }

    renderWeekView() {
        const weekStart = new Date(this.currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        let html = '<div class="calendar-week">';
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(currentDate.getDate() + i);
            const dateString = currentDate.toISOString().split('T')[0];
            const shifts = storage.getShiftsByDateRange(currentDate, currentDate);
            
            html += `
                <div class="calendar-day">
                    <div class="day-header">
                        ${currentDate.toLocaleDateString('es-ES', { weekday: 'short' })} 
                        ${currentDate.getDate()}
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
        const dateString = this.currentDate.toISOString().split('T')[0];
        const shifts = storage.getShiftsByDateRange(this.currentDate, this.currentDate);
        
        let html = `
            <div class="calendar-day-detailed">
                <div class="time-slots">
                    ${this.generateTimeSlots()}
                </div>
                <div class="shifts-timeline">
                    ${shifts.map(shift => this.renderTimelineShift(shift)).join('')}
                </div>
            </div>
        `;
        
        return html;
    }

    generateTimeSlots() {
        let html = '';
        for (let hour = 0; hour < 24; hour++) {
            html += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
        }
        return html;
    }

    renderShiftItem(shift, detailed = false) {
        const doctor = storage.getDoctors().find(d => d.id === shift.doctorId);
        if (!doctor) return '';

        const timeInfo = detailed ? 
            `${shift.startTime} - ${shift.endTime}` : 
            `${shift.startTime.split(':')[0]}h`;

        return `
            <div class="shift-item ${shift.type}" 
                 onclick="shifts.openShiftModal(${shift.id})"
                 title="${doctor.name} - ${shift.type} (${shift.startTime}-${shift.endTime})">
                ${detailed ? `
                    <strong>${doctor.name}</strong><br>
                    ${shift.type} - ${timeInfo}
                ` : `
                    ${doctor.name.split(' ')[0]} - ${timeInfo}
                `}
            </div>
        `;
    }

    renderTimelineShift(shift) {
        const doctor = storage.getDoctors().find(d => d.id === shift.doctorId);
        if (!doctor) return '';

        const startHour = parseInt(shift.startTime.split(':')[0]);
        const startMinute = parseInt(shift.startTime.split(':')[1]);
        const endHour = parseInt(shift.endTime.split(':')[0]);
        const endMinute = parseInt(shift.endTime.split(':')[1]);
        
        const top = (startHour * 60 + startMinute) * 100 / 1440; // 1440 minutos en un día
        const height = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) * 100 / 1440;

        return `
            <div class="timeline-shift ${shift.type}" 
                 style="top: ${top}%; height: ${height}%;"
                 onclick="shifts.openShiftModal(${shift.id})">
                <div class="shift-content">
                    <strong>${doctor.name}</strong><br>
                    ${shift.type}<br>
                    ${shift.startTime} - ${shift.endTime}
                </div>
            </div>
        `;
    }

    openShiftModal(shiftId = null, date = null) {
        if (!auth.isLoggedIn) {
            auth.showNotification('Debe iniciar sesión para gestionar turnos', 'error');
            return;
        }

        const modal = document.getElementById('shift-modal');
        const title = document.getElementById('shift-modal-title');
        const form = document.getElementById('shift-form');
        const deleteBtn = document.getElementById('delete-shift');

        // Llenar select de médicos
        this.populateDoctorsSelect();

        if (shiftId) {
            // Modo edición
            const shift = storage.getShifts().find(s => s.id === shiftId);
            if (shift) {
                if (!auth.canEditShift(shift)) {
                    auth.showNotification('No tiene permisos para editar este turno', 'error');
                    return;
                }

                title.textContent = 'Editar Turno';
                document.getElementById('shift-id').value = shift.id;
                document.getElementById('shift-doctor').value = shift.doctorId;
                document.getElementById('shift-date').value = shift.date;
                document.getElementById('shift-type').value = shift.type;
                document.getElementById('shift-start').value = shift.startTime;
                document.getElementById('shift-end').value = shift.endTime;
                document.getElementById('shift-notes').value = shift.notes || '';
                
                deleteBtn.style.display = auth.hasRole('admin') ? 'block' : 'none';
            }
        } else {
            // Modo creación
            if (!auth.hasRole('admin')) {
                auth.showNotification('Solo los administradores pueden crear turnos', 'error');
                return;
            }

            title.textContent = 'Nuevo Turno';
            form.reset();
            document.getElementById('shift-id').value = '';
            
            if (date) {
                document.getElementById('shift-date').value = date;
            }
            
            deleteBtn.style.display = 'none';
        }

        modal.style.display = 'block';
    }

    populateDoctorsSelect() {
        const select = document.getElementById('shift-doctor');
        const doctors = storage.getDoctors();
        
        select.innerHTML = doctors.map(doctor => 
            `<option value="${doctor.id}">${doctor.name} - ${doctor.specialty}</option>`
        ).join('');
    }

    saveShift(formData) {
        const shift = {
            id: formData.get('id') ? parseInt(formData.get('id')) : null,
            doctorId: parseInt(formData.get('doctorId')),
            date: formData.get('date'),
            type: formData.get('type'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            notes: formData.get('notes')
        };

        // Validaciones
        if (!this.validateShift(shift)) {
            return false;
        }

        // Verificar conflictos
        if (storage.checkShiftConflict(shift, shift.id)) {
            auth.showNotification('Conflicto de horario: el médico ya tiene un turno en este horario', 'error');
            return false;
        }

        const savedShift = storage.saveShift(shift);
        this.renderCalendar();
        auth.showNotification(
            shift.id ? 'Turno actualizado correctamente' : 'Turno creado correctamente',
            'success'
        );
        return true;
    }

    validateShift(shift) {
        if (!shift.doctorId || !shift.date || !shift.type || !shift.startTime || !shift.endTime) {
            auth.showNotification('Todos los campos requeridos deben ser completados', 'error');
            return false;
        }

        if (shift.startTime >= shift.endTime) {
            auth.showNotification('La hora de fin debe ser posterior a la hora de inicio', 'error');
            return false;
        }

        const shiftDate = new Date(shift.date);
        if (shiftDate < new Date().setHours(0, 0, 0, 0)) {
            auth.showNotification('No se pueden asignar turnos en fechas pasadas', 'error');
            return false;
        }

        return true;
    }

    deleteShift(shiftId) {
        if (!auth.hasRole('admin')) {
            auth.showNotification('No tiene permisos para eliminar turnos', 'error');
            return;
        }

        if (confirm('¿Está seguro de que desea eliminar este turno?')) {
            storage.deleteShift(shiftId);
            this.renderCalendar();
            auth.showNotification('Turno eliminado correctamente', 'success');
            this.closeShiftModal();
        }
    }

    closeShiftModal() {
        document.getElementById('shift-modal').style.display = 'none';
    }

    // Método para obtener turnos del médico actual (si es doctor)
    getMyShifts() {
        if (!auth.isLoggedIn || !auth.hasRole('doctor')) return [];
        
        return storage.getShiftsByDoctor(auth.currentUser.id);
    }
}

// Instancia global del gestor de turnos
const shifts = new ShiftsManager();