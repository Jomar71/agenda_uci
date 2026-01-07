
import { dataManager } from './services/data-manager.js';

export class CalendarManager {
    constructor(authManager) {
        this.currentDate = new Date();
        this.auth = authManager;
        this.init(); // Auto-init on load if possible, though checks might be needed
    }

    async init() {
        if (location.pathname.endsWith('index.html') || location.pathname === '/') {
            this.renderMonthlyPreview();
            this.attachNavEvents();
        }
    }

    attachNavEvents() {
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#prev-month')) {
                this.prevMonth();
            } else if (e.target.closest('#next-month')) {
                this.nextMonth();
            }
        });
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderMonthlyPreview();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderMonthlyPreview();
    }

    async renderMonthlyPreview() {
        const container = document.getElementById('monthly-calendar');
        if (!container) return; // Guard clause if element doesn't exist

        const shifts = await dataManager.getAll('shifts');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Month Navigation
        const monthName = this.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

        // Date Math
        const firstDay = new Date(year, month, 1);
        const start = new Date(firstDay);
        start.setDate(start.getDate() - start.getDay()); // Start Sunday

        // HTML Layout matching reference image (White card inside dark container)
        // Using inline styles to GUARANTEE look without CSS conflicts for now.
        let html = `
            <div class="calendar-header-simple" style="background: transparent; color: #1f2937; margin-bottom: 0; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin:0; font-weight:800; font-size: 1.2rem; color: #1f2937;">${monthName}</h4>
                <div class="nav-buttons" style="display: flex; gap: 5px;">
                    <button id="prev-month" class="btn btn-sm btn-outline" style="border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; padding:0; border: 1px solid #ccc; background: white; cursor: pointer;"><i class="fas fa-chevron-left" style="color: #666;"></i></button>
                    <button id="next-month" class="btn btn-sm btn-outline" style="border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; padding:0; border: 1px solid #ccc; background: white; cursor: pointer;"><i class="fas fa-chevron-right" style="color: #666;"></i></button>
                </div>
            </div>
            
            <div style="margin-top: 5px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <!-- Header Row -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #334155; color: white;">
                    ${['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d =>
            `<div style="padding: 12px; text-align: center; font-weight: bold; font-size: 0.9rem; border-right: 1px solid rgba(255,255,255,0.1);">${d}</div>`
        ).join('')}
                </div>
                
                <!-- Days Grid -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #e5e7eb; gap: 1px; border: 1px solid #e5e7eb;">
        `;

        // Generate 42 cells (6 rows)
        let current = new Date(start);
        for (let i = 0; i < 42; i++) {
            const dateStr = current.toISOString().split('T')[0];
            const isToday = current.toDateString() === new Date().toDateString();
            const isOther = current.getMonth() !== month;
            const dayNum = current.getDate();
            const dayShifts = shifts.filter(s => s.date === dateStr);

            // Generate dots - colors defined here for safety
            const colors = {
                guardia: '#f59e0b',
                consulta: '#10b981',
                emergencia: '#ef4444',
                descanso: '#9ca3af'
            };

            const dots = dayShifts.slice(0, 5).map(s =>
                `<div style="width: 100%; height: 6px; border-radius: 2px; background-color: ${colors[s.type] || '#ccc'}; margin-bottom: 2px;" title="${s.type}"></div>`
            ).join('');

            html += `
                <div class="day-cell" style="background: ${isOther ? '#f9fafb' : '#ffffff'}; min-height: 100px; padding: 8px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; position: relative;" data-date="${dateStr}">
                    <span style="font-weight: bold; color: ${isOther ? '#9ca3af' : '#1f2937'}; font-size: 0.9rem; align-self: flex-start;">${dayNum}</span>
                    <div style="width: 100%;">${dots}</div>
                    ${isToday ? '<div style="position:absolute; top:0; left:0; width:100%; height:100%; border: 2px solid #3b82f6; pointer-events:none;"></div>' : ''}
                </div>
            `;
            current.setDate(current.getDate() + 1);
        }

        html += `
                </div>
                <!-- Legend -->
                <div style="background: white; padding: 15px; display: flex; gap: 20px; font-size: 0.8rem; border-top: 1px solid #e5e7eb; justify-content: flex-start;">
                    <span style="font-weight: bold; color: #666;">Leyenda:</span>
                    <div style="display: flex; align-items: center; gap: 5px;"><div style="width: 10px; height: 10px; background: #f59e0b;"></div> Guardia</div>
                    <div style="display: flex; align-items: center; gap: 5px;"><div style="width: 10px; height: 10px; background: #10b981;"></div> Consulta</div>
                    <div style="display: flex; align-items: center; gap: 5px;"><div style="width: 10px; height: 10px; background: #ef4444;"></div> Emergencia</div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.attachEvents();
    }

    attachEvents() {
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                // Check if we can open detailed view
                if (window.app && window.app.auth && window.app.auth.isLoggedIn) {
                    if (window.app.shifts) window.app.shifts.openShiftModal(null, cell.dataset.date);
                } else {
                    // Optional: prompt login
                }
            });
        });
    }
}