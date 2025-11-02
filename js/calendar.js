// Calendario para vista mensual en inicio
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.init();
    }

    init() {
        this.renderMonthlyPreview();
    }

    renderMonthlyPreview() {
        const container = document.getElementById('monthly-calendar');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
        
        let html = `
            <div class="calendar-preview-header">
                <h4>${this.currentDate.toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                })}</h4>
            </div>
            <div class="calendar-preview-grid">
        `;
        
        // Encabezados de días
        const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        days.forEach(day => {
            html += `<div class="preview-day-header">${day}</div>`;
        });
        
        // Días del mes
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const isOtherMonth = currentDate.getMonth() !== month;
            const isToday = this.isToday(currentDate);
            const dateString = currentDate.toISOString().split('T')[0];
            const shifts = storage.getShiftsByDateRange(currentDate, currentDate);
            
            html += `
                <div class="preview-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                    <div class="preview-day-number">${currentDate.getDate()}</div>
                    <div class="preview-shifts">
                        ${shifts.slice(0, 2).map(shift => this.renderPreviewShift(shift)).join('')}
                        ${shifts.length > 2 ? `<div class="more-shifts">+${shifts.length - 2}</div>` : ''}
                    </div>
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    renderPreviewShift(shift) {
        const doctor = storage.getDoctors().find(d => d.id === shift.doctorId);
        if (!doctor) return '';

        return `
            <div class="preview-shift ${shift.type}" 
                 onclick="shifts.openShiftModal(${shift.id})"
                 title="${doctor.name} - ${shift.type}">
            </div>
        `;
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    navigateMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderMonthlyPreview();
    }
}

// Instancia global del calendario
const calendar = new CalendarManager();