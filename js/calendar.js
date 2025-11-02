// Calendario para vista mensual en inicio - VERSION MEJORADA
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.init();
    }

    init() {
        this.renderMonthlyPreview();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Escuchar cambios en los datos
        window.addEventListener('dataUpdated', (e) => {
            if (e.detail.key === 'shifts' || e.detail.key === 'doctors') {
                this.renderMonthlyPreview();
            }
        });

        // También escuchar eventos storage normales
        window.addEventListener('storage', (e) => {
            if (e.key === 'shifts' || e.key === 'doctors') {
                this.renderMonthlyPreview();
            }
        });
    }

    renderMonthlyPreview() {
        const container = document.getElementById('monthly-calendar');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = `
            <div class="calendar-preview-header">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0;">${this.currentDate.toLocaleDateString('es-ES', { 
                        month: 'long', 
                        year: 'numeric' 
                    })}</h4>
                    <div>
                        <button class="btn btn-secondary" onclick="calendar.prevMonth()" style="padding: 0.25rem 0.5rem;">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="btn btn-secondary" onclick="calendar.nextMonth()" style="padding: 0.25rem 0.5rem;">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
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
        while (currentDate <= new Date(lastDay.getTime() + (6 - lastDay.getDay()) * 86400000)) {
            const isOtherMonth = currentDate.getMonth() !== month;
            const isToday = this.isToday(currentDate);
            const dateString = currentDate.toISOString().split('T')[0];
            const shifts = storage.getShiftsByDate(dateString);
            
            html += `
                <div class="preview-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                    <div class="preview-day-number">${currentDate.getDate()}</div>
                    <div class="preview-shifts">
                        ${shifts.slice(0, 3).map(shift => this.renderPreviewShift(shift)).join('')}
                        ${shifts.length > 3 ? 
                            `<div class="more-shifts" title="${shifts.length - 3} turnos más">+${shifts.length - 3}</div>` : 
                            ''
                        }
                    </div>
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        html += '</div>';

        // Leyenda de colores
        html += `
            <div class="shift-legend" style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <h5 style="margin-bottom: 0.5rem;">Leyenda de Turnos:</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: var(--warning-color); border-radius: 2px;"></div>
                        <span>Guardia</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: var(--success-color); border-radius: 2px;"></div>
                        <span>Consulta</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: var(--danger-color); border-radius: 2px;"></div>
                        <span>Emergencia</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; background: #95a5a6; border-radius: 2px;"></div>
                        <span>Descanso</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    renderPreviewShift(shift) {
        const doctor = storage.getDoctors().find(d => d.id === shift.doctorId);
        if (!doctor) return '';

        return `
            <div class="preview-shift ${shift.type}" 
                 onclick="shifts.openShiftModal(${shift.id})"
                 title="${doctor.name} - ${shift.type} (${shift.startTime}-${shift.endTime})">
            </div>
        `;
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderMonthlyPreview();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderMonthlyPreview();
    }

    // Para sincronización con la sección de turnos
    syncWithShiftsManager() {
        this.renderMonthlyPreview();
    }
}

// Instancia global del calendario
const calendar = new CalendarManager();