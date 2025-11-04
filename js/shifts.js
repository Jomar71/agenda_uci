// Gestión de turnos - VERSION MEJORADA
class ShiftsManager {
    constructor() {
        this.shifts = [];
        this.currentDate = new Date();
        this.currentView = 'month';
        this.init();
    }

    init() {
        this.loadShifts();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navegación del calendario
        document.getElementById('prev-period')?.addEventListener('click', () => this.navigate(-1));
        document.getElementById('next-period')?.addEventListener('click', () => this.navigate(1));
        
        // Botones de vista
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderCalendar();
            });
        });
        
        // Botón agregar turno
        document.getElementById('add-shift-btn')?.addEventListener('click', () => this.openShiftModal());
        
        // Formulario de turnos
        document.getElementById('save-shift-btn')?.addEventListener('click', () => this.saveShift());
        document.getElementById('cancel-shift-btn')?.addEventListener('click', () => this.closeShiftModal());
        document.getElementById('delete-shift-btn')?.addEventListener('click', () => this.deleteShift());
        
        // Navegación desde admin
        document.getElementById('manage-shifts')?.addEventListener('click', () => {
            document.querySelector('[href="#turnos"]').click();
        });
    }

    loadShifts() {
        this.shifts = this.getShiftsFromStorage();
    }

    getShiftsFromStorage() {
        try {
            const stored = localStorage.getItem('shifts');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error cargando turnos:', error);
        }
        
        // Datos de ejemplo
        const today = new Date();
        const sampleShifts = [];
        
        // Crear algunos turnos de ejemplo para los próximos 7 días
        for (let i = 0; i < 7; i++) {
            const shiftDate = new Date(today);
            shiftDate.setDate(today.getDate() + i);
            
            const doctorId = (i % 2) + 1; // Alternar entre médico 1 y 2
            const doctor = window.doctorsManager?.getDoctorById(doctorId);
            
            if (doctor) {
                sampleShifts.push({
                    id: i + 1,
                    doctorId: doctorId,
                    doctorName: doctor.name,
                    date: shiftDate.toISOString().split('T')[0],
                    startTime: '08:00',
                    endTime: '16:00',
                    type: ['guardia', 'consulta', 'emergencia', 'descanso'][i % 4],
                    notes: `Turno ejemplo ${i + 1}`,
                    createdAt: new Date().toISOString()
                });
            }
        }
        
        return sampleShifts;
    }

    saveShifts(shiftsToSave = null) {
        const shifts = shiftsToSave || this.shifts;
        try {
            localStorage.setItem('shifts', JSON.stringify(shifts));
            return true;
        } catch (error) {
            console.error('Error guardando turnos:', error);
            auth.showNotification('Error al guardar los turnos', 'error');
            return false;
        }
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
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                periodText = `Semana del ${this.formatDate(weekStart)} al ${this.formatDate(weekEnd)}`;
                break;
            case 'day':
                html = this.renderDayView();
                periodText = this.formatDate(this.currentDate);
                break;
        }

        container.innerHTML = html;
        if (period) period.textContent = periodText;
        
        this.attachCalendarEvents();
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
            const isToday = current.toDateString() === new Date().toDateString();
            const dateStr = current.toISOString().split('T')[0];
            const shifts = this.getShiftsByDate(dateStr);
            
            const dayClass = `calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
            
            html += `
                <div class="${dayClass}" data-date="${dateStr}">
                    <div class="day-number">${current.getDate()}</div>
                    <div class="day-shifts">
                        ${shifts.slice(0, 3).map(shift => this.renderShiftItem(shift)).join('')}
                        ${shifts.length > 3 ? 
                            `<div class="more-shifts">+${shifts.length - 3} más</div>` : 
                            ''
                        }
                    </div>
                </div>
            `;
            
            current.setDate(current.getDate() + 1);
        }
        
        html += '</div>';
        return html;
    }

    renderWeekView() {
        const start = this.getWeekStart(this.currentDate);
        
        let html = '<div class="calendar-week">';
        
        for (let i = 0; i < 7; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const dateStr = current.toISOString().split('T')[0];
            const shifts = this.getShiftsByDate(dateStr);
            const isToday = current.toDateString() === new Date().toDateString();
            const dayClass = isToday ? 'calendar-day today' : 'calendar-day';
            
            html += `
                <div class="${dayClass}" data-date="${dateStr}">
                    <div class="day-header">
                        ${current.toLocaleDateString('es-ES', { weekday: 'short' })} 
                        ${current.getDate()}
                    </div>
                    <div class="day-shifts">
                        ${shifts.map(shift => this.renderShiftItem(shift, true)).join('')}
                        ${shifts.length === 0 ? '<div class="no-shifts">Sin turnos</div>' : ''}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    renderDayView() {
        const dateStr = this.currentDate.toISOString().split('T')[0];
        const shifts = this.getShiftsByDate(dateStr);
        
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
        if (!auth.canEditShift(shift) && !auth.isAdmin()) {
            return ''; // No mostrar turnos que no puede editar
        }

        const shortName = shift.doctorName.split(' ')[0];
        
        return `
            <div class="shift-item ${shift.type}" 
                 data-id="${shift.id}"
                 title="${shift.doctorName} - ${shift.type} (${shift.startTime}-${shift.endTime})">
                ${detailed ? `
                    <strong>${shortName}</strong><br>
                    ${shift.type}<br>
                    ${shift.startTime}
                ` : `
                    ${shortName} - ${shift.startTime.split(':')[0]}h
                `}
            </div>
        `;
    }

    renderTimelineShift(shift) {
        if (!auth.canEditShift(shift) && !auth.isAdmin()) {
            return ''; // No mostrar turnos que no puede editar
        }

        const start = parseInt(shift.startTime.split(':')[0]);
        const end = parseInt(shift.endTime.split(':')[0]);
        const startMinutes = parseInt(shift.startTime.split(':')[1]) || 0;
        const endMinutes = parseInt(shift.endTime.split(':')[1]) || 0;
        
        const top = ((start * 60 + startMinutes) / 1440) * 100;
        const height = (((end * 60 + endMinutes) - (start * 60 + startMinutes)) / 1440) * 100;

        return `
            <div class="timeline-shift ${shift.type}" 
                 data-id="${shift.id}"
                 style="top: ${top}%; height: ${height}%;"
                 title="${shift.doctorName} - ${shift.type} (${shift.startTime}-${shift.endTime})">
                <div class="shift-content">
                    <strong>${shift.doctorName.split(' ')[0]}</strong><br>
                    ${shift.type}<br>
                    ${shift.startTime} - ${shift.endTime}
                </div>
            </div>
        `;
    }

    attachCalendarEvents() {
        // Click en días para crear turnos (solo usuarios logueados)
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', (e) => {
                if (!e.target.classList.contains('shift-item') && 
                    !e.target.closest('.shift-item')) {
                    
                    const date = day.dataset.date;
                    if (date && auth.isLoggedIn) {
                        this.openShiftModal(null, date);
                    }
                }
            });
        });

        // Click en turnos existentes para editarlos
        document.querySelectorAll('.shift-item, .timeline-shift').forEach(shift => {
            shift.addEventListener('click', (e) => {
                e.stopPropagation();
                const shiftId = parseInt(shift.dataset.id);
                if (shiftId && auth.canEditShift(this.getShiftById(shiftId))) {
                    this.openShiftModal(shiftId);
                }
            });
        });
    }

    openShiftModal(shiftId = null, date = null) {
        if (!auth.isLoggedIn) {
            auth.showNotification('Debe iniciar sesión para gestionar turnos', 'error');
            return;
        }

        const modal = document.getElementById('shift-modal');
        const title = document.getElementById('shift-modal-title');
        const deleteBtn = document.getElementById('delete-shift-btn');
        
        if (!modal || !title) return;

        this.populateDoctorsSelect();

        if (shiftId) {
            // Editar turno existente
            const shift = this.getShiftById(shiftId);
            if (shift) {
                if (!auth.canEditShift(shift)) {
                    auth.showNotification('No tiene permisos para editar este turno', 'error');
                    return;
                }
                
                title.textContent = 'Editar Turno';
                this.fillShiftForm(shift);
                if (deleteBtn && auth.isAdmin()) {
                    deleteBtn.style.display = 'inline-block';
                }
            }
        } else {
            // Nuevo turno
            title.textContent = 'Nuevo Turno';
            this.clearShiftForm(date);
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
            }
        }

        modal.style.display = 'block';
    }

    closeShiftModal() {
        const modal = document.getElementById('shift-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateDoctorsSelect() {
        const select = document.getElementById('shift-doctor');
        if (!select) return;

        const doctors = window.doctorsManager?.getDoctors() || [];
        select.innerHTML = '<option value="">Seleccionar médico</option>';
        
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = `${doctor.name} - ${doctor.specialty}`;
            select.appendChild(option);
        });
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

    clearShiftForm(date = null) {
        document.getElementById('shift-form').reset();
        document.getElementById('shift-id').value = '';
        
        // Valores por defecto
        if (date) {
            document.getElementById('shift-date').value = date;
        } else {
            document.getElementById('shift-date').value = new Date().toISOString().split('T')[0];
        }
        
        document.getElementById('shift-start').value = '08:00';
        document.getElementById('shift-end').value = '16:00';
    }

    saveShift() {
        const formData = this.getShiftFormData();
        
        if (!this.validateShift(formData)) {
            return;
        }

        const shiftData = {
            doctorId: parseInt(formData.doctorId),
            date: formData.date,
            type: formData.type,
            startTime: formData.startTime,
            endTime: formData.endTime,
            notes: formData.notes
        };

        // Obtener nombre del médico
        const doctor = window.doctorsManager?.getDoctorById(shiftData.doctorId);
        if (doctor) {
            shiftData.doctorName = doctor.name;
        } else {
            auth.showNotification('Médico no encontrado', 'error');
            return;
        }

        let successMessage = '';

        if (formData.id) {
            // Editar turno existente
            const shift = this.getShiftById(parseInt(formData.id));
            if (!shift) {
                auth.showNotification('Turno no encontrado', 'error');
                return;
            }
            
            if (!auth.canEditShift(shift)) {
                auth.showNotification('No tiene permisos para editar este turno', 'error');
                return;
            }

            shiftData.id = parseInt(formData.id);
            shiftData.createdAt = shift.createdAt;
            
            const index = this.shifts.findIndex(s => s.id === shiftData.id);
            if (index !== -1) {
                this.shifts[index] = shiftData;
                successMessage = 'Turno actualizado correctamente';
            }
        } else {
            // Nuevo turno
            shiftData.id = this.generateShiftId();
            shiftData.createdAt = new Date().toISOString();
            this.shifts.push(shiftData);
            successMessage = 'Turno creado correctamente';
        }

        if (this.saveShifts()) {
            this.renderCalendar();
            this.closeShiftModal();
            auth.showNotification(successMessage, 'success');
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
        // Validar campos requeridos
        if (!data.doctorId || !data.date || !data.type || !data.startTime || !data.endTime) {
            auth.showNotification('Complete todos los campos requeridos', 'error');
            return false;
        }

        // Validar que la hora de fin sea posterior a la de inicio
        if (data.startTime >= data.endTime) {
            auth.showNotification('La hora de fin debe ser posterior a la hora de inicio', 'error');
            return false;
        }

        // Verificar conflictos de horario (solo para el mismo médico en la misma fecha)
        const shiftDate = new Date(data.date);
        const existingShifts = this.shifts.filter(shift => {
            if (data.id && shift.id === parseInt(data.id)) return false; // Excluir el turno actual
            if (shift.doctorId !== parseInt(data.doctorId)) return false;
            
            const existingDate = new Date(shift.date);
            return existingDate.toDateString() === shiftDate.toDateString();
        });

        for (const existingShift of existingShifts) {
            if (this.isTimeOverlap(data.startTime, data.endTime, existingShift.startTime, existingShift.endTime)) {
                auth.showNotification(
                    `Conflicto de horario: El médico ya tiene un turno de ${existingShift.startTime} a ${existingShift.endTime}`,
                    'error'
                );
                return false;
            }
        }

        return true;
    }

    isTimeOverlap(start1, end1, start2, end2) {
        return (start1 < end2 && end1 > start2);
    }

    deleteShift() {
        if (!auth.isAdmin()) {
            auth.showNotification('Solo los administradores pueden eliminar turnos', 'error');
            return;
        }

        const shiftId = document.getElementById('shift-id').value;
        if (!shiftId) return;

        const shift = this.getShiftById(parseInt(shiftId));
        if (!shift) return;

        if (confirm(`¿Estás seguro de eliminar el turno del ${this.formatDate(new Date(shift.date))}?`)) {
            this.shifts = this.shifts.filter(s => s.id !== parseInt(shiftId));
            
            if (this.saveShifts()) {
                this.renderCalendar();
                this.closeShiftModal();
                auth.showNotification('Turno eliminado correctamente', 'success');
            }
        }
    }

    getWeekStart(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        return new Date(start.setDate(diff));
    }

    formatDate(date) {
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    generateShiftId() {
        const maxId = this.shifts.reduce((max, shift) => Math.max(max, shift.id), 0);
        return maxId + 1;
    }

    getShifts() {
        return this.shifts;
    }

    getShiftById(id) {
        return this.shifts.find(shift => shift.id === id);
    }

    getShiftsByDate(date) {
        return this.shifts.filter(shift => shift.date === date);
    }

    getShiftsByDoctor(doctorId) {
        return this.shifts.filter(shift => shift.doctorId === doctorId);
    }

    getShiftsByDateRange(startDate, endDate) {
        return this.shifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            return shiftDate >= startDate && shiftDate <= endDate;
        });
    }

    // Método para calcular horas trabajadas
    calculateHours(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        // Si el turno cruza la medianoche, ajustar
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        
        const diffMs = end - start;
        return diffMs / (1000 * 60 * 60); // Convertir a horas
    }

    // Método para generar reporte de horas
    generateHoursReport(startDate, endDate) {
        const doctors = window.doctorsManager?.getDoctors() || [];
        const report = {
            period: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
            doctors: [],
            totals: {
                daily: 0,
                weekly: 0,
                monthly: 0,
                sunday: 0,
                holiday: 0,
                total: 0
            }
        };
        
        doctors.forEach(doctor => {
            const doctorShifts = this.shifts.filter(shift => 
                shift.doctorId === doctor.id && 
                new Date(shift.date) >= startDate && 
                new Date(shift.date) <= endDate
            );
            
            const doctorReport = {
                id: doctor.id,
                name: doctor.name,
                specialty: doctor.specialty,
                hours: {
                    daily: 0,
                    weekly: 0,
                    monthly: 0,
                    sunday: 0,
                    holiday: 0,
                    total: 0
                },
                shifts: doctorShifts.length
            };
            
            doctorShifts.forEach(shift => {
                const hours = this.calculateHours(shift.startTime, shift.endTime);
                const shiftDate = new Date(shift.date);
                const dayOfWeek = shiftDate.getDay();
                
                // Clasificar las horas
                doctorReport.hours.total += hours;
                doctorReport.hours.daily += hours;
                
                // Horas dominicales
                if (dayOfWeek === 0) {
                    doctorReport.hours.sunday += hours;
                }
                
                // Aquí podrías agregar lógica para identificar festivos
                // Por ahora, asumimos que no hay festivos en el ejemplo
            });
            
            // Calcular promedios semanales y mensuales
            const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const weeksInPeriod = Math.ceil(daysInPeriod / 7);
            const monthsInPeriod = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  (endDate.getMonth() - startDate.getMonth()) + 1;
            
            doctorReport.hours.weekly = doctorReport.hours.total / Math.max(weeksInPeriod, 1);
            doctorReport.hours.monthly = doctorReport.hours.total / Math.max(monthsInPeriod, 1);
            
            report.doctors.push(doctorReport);
            
            // Acumular totales
            report.totals.daily += doctorReport.hours.daily;
            report.totals.weekly += doctorReport.hours.weekly;
            report.totals.monthly += doctorReport.hours.monthly;
            report.totals.sunday += doctorReport.hours.sunday;
            report.totals.holiday += doctorReport.hours.holiday;
            report.totals.total += doctorReport.hours.total;
        });
        
        return report;
    }

    // Método para exportar a Excel
    exportToExcel() {
        if (!auth.isAdmin()) {
            auth.showNotification('Solo los administradores pueden descargar backups', 'error');
            return;
        }

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const report = this.generateHoursReport(startDate, endDate);
        
        // Crear contenido CSV (compatible con Excel)
        let csvContent = "REPORTE DE HORAS MÉDICAS\n\n";
        csvContent += `Período: ${report.period}\n`;
        csvContent += `Generado: ${new Date().toLocaleDateString('es-ES')}\n\n`;
        
        // Encabezados
        csvContent += "Médico,Especialidad,Horas Diarias,Horas Semanales,Horas Mensuales,Horas Dominicales,Horas Festivas,Total Horas,Cantidad Turnos\n";
        
        // Datos de cada médico
        report.doctors.forEach(doctor => {
            csvContent += `"${doctor.name}","${doctor.specialty}",${doctor.hours.daily.toFixed(2)},${doctor.hours.weekly.toFixed(2)},${doctor.hours.monthly.toFixed(2)},${doctor.hours.sunday.toFixed(2)},${doctor.hours.holiday.toFixed(2)},${doctor.hours.total.toFixed(2)},${doctor.shifts}\n`;
        });
        
        // Totales
        csvContent += `\n"TOTALES","",${report.totals.daily.toFixed(2)},${report.totals.weekly.toFixed(2)},${report.totals.monthly.toFixed(2)},${report.totals.sunday.toFixed(2)},${report.totals.holiday.toFixed(2)},${report.totals.total.toFixed(2)},\n`;
        
        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_horas_medicas_${now.toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        auth.showNotification('Reporte descargado correctamente en formato Excel', 'success');
    }
}

// Instancia global
const shiftsManager = new ShiftsManager();

// Configurar el botón de backup
document.getElementById('backup-data')?.addEventListener('click', () => {
    shiftsManager.exportToExcel();
});