// Calendario para vista mensual en inicio - VERSION CORREGIDA
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.init();
    }

    init() {
        console.log('📅 Inicializando calendario mensual...');
        this.renderMonthlyPreview();
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('🔧 Configurando eventos del calendario...');
        
        // Navegación del calendario mensual usando event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('#prev-month')) {
                this.prevMonth();
            } else if (e.target.closest('#next-month')) {
                this.nextMonth();
            }
        });

        // Sincronización con cambios de datos
        window.addEventListener('storage', () => {
            console.log('🔄 Sincronizando calendario por cambios en almacenamiento');
            this.renderMonthlyPreview();
        });

        // Evento personalizado para sincronización interna
        window.addEventListener('dataUpdated', (e) => {
            if (e.detail?.key === 'shifts' || e.detail?.key === 'doctors') {
                console.log('🔄 Sincronizando calendario por actualización de datos');
                this.renderMonthlyPreview();
            }
        });

        // Evento personalizado para forzar actualización
        window.addEventListener('dataRefreshed', () => {
            console.log('🔄 Sincronizando calendario por refresco forzado');
            this.renderMonthlyPreview();
        });
    }

    renderMonthlyPreview() {
        const container = document.getElementById('monthly-calendar');
        if (!container) {
            console.error('❌ No se encontró el contenedor del calendario mensual');
            return;
        }

        console.log('🎨 Renderizando vista mensual...');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = `
            <div class="calendar-preview-header">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: var(--primary-color);">
                        ${this.currentDate.toLocaleDateString('es-ES', { 
                            month: 'long', 
                            year: 'numeric' 
                        })}
                    </h4>
                    <div>
                        <button id="prev-month" class="btn btn-secondary" style="padding: 0.25rem 0.5rem;">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button id="next-month" class="btn btn-secondary" style="padding: 0.25rem 0.5rem;">
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
        const shifts = window.shiftsManager?.getShifts() || [];
        
        while (currentDate <= new Date(lastDay.getTime() + (6 - lastDay.getDay()) * 86400000)) {
            const isOtherMonth = currentDate.getMonth() !== month;
            const isToday = currentDate.toDateString() === new Date().toDateString();
            const dateString = currentDate.toISOString().split('T')[0];
            const dayShifts = shifts.filter(shift => shift.date === dateString);
            
            const dayClass = `preview-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
            
            html += `
                <div class="${dayClass}" data-date="${dateString}">
                    <div class="preview-day-number">${currentDate.getDate()}</div>
                    <div class="preview-shifts">
                        ${dayShifts.slice(0, 3).map(shift => this.renderPreviewShift(shift)).join('')}
                        ${dayShifts.length > 3 ? 
                            `<div class="more-shifts" title="${dayShifts.length - 3} turnos más">+${dayShifts.length - 3}</div>` : 
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
                <h5 style="margin-bottom: 0.5rem; color: var(--primary-color);">Leyenda de Turnos:</h5>
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
        this.attachPreviewEvents();
        console.log('✅ Vista mensual renderizada correctamente');
    }

    renderPreviewShift(shift) {
        if (!auth.canEditShift(shift) && !auth.isAdmin()) {
            return ''; // No mostrar turnos que no puede editar
        }

        return `
            <div class="preview-shift ${shift.type}" 
                 data-id="${shift.id}"
                 title="${shift.doctorName} - ${shift.type} (${shift.startTime}-${shift.endTime})">
            </div>
        `;
    }

    attachPreviewEvents() {
        console.log('🔗 Adjuntando eventos a la vista previa...');
        
        // Click en turnos para editarlos
        document.querySelectorAll('.preview-shift').forEach(shift => {
            shift.addEventListener('click', (e) => {
                e.stopPropagation();
                const shiftId = parseInt(shift.dataset.id);
                if (shiftId && auth.isLoggedIn) {
                    console.log('✏️ Editando turno desde vista previa:', shiftId);
                    window.shiftsManager?.openShiftModal(shiftId);
                } else if (!auth.isLoggedIn) {
                    auth.showNotification('Debe iniciar sesión para editar turnos', 'warning');
                }
            });
        });

        // Click en días para crear nuevos turnos
        document.querySelectorAll('.preview-day').forEach(day => {
            day.addEventListener('click', (e) => {
                if (!e.target.classList.contains('preview-shift') && 
                    !e.target.closest('.preview-shift')) {
                    
                    const date = day.dataset.date;
                    if (date && auth.isLoggedIn) {
                        console.log('📅 Creando turno desde vista previa para fecha:', date);
                        window.shiftsManager?.openShiftModal(null, date);
                    } else if (!auth.isLoggedIn) {
                        auth.showNotification('Debe iniciar sesión para crear turnos', 'warning');
                    }
                }
            });
        });
        
        console.log('✅ Eventos de vista previa configurados');
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        console.log('⬅️ Navegando al mes anterior:', this.currentDate.toLocaleDateString('es-ES'));
        this.renderMonthlyPreview();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        console.log('➡️ Navegando al mes siguiente:', this.currentDate.toLocaleDateString('es-ES'));
        this.renderMonthlyPreview();
    }

    // Para sincronización externa
    refresh() {
        console.log('🔄 Forzando actualización del calendario');
        this.renderMonthlyPreview();
    }
}

// Instancia global del calendario
const calendarManager = new CalendarManager();