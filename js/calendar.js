/**
 * CalendarManager - Vista previa mensual del panel de inicio.
 */

import { dataManager } from './services/data-manager.js';
import { escapeHtml, getShiftType, formatDateLocal, todayLocal } from './utils.js';

export class CalendarManager {
    constructor(authManager) {
        this.currentDate = new Date();
        this.auth = authManager;
        this.init();
    }

    async init() {
        if (location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname === '/index.html') {
            await this.renderMonthlyPreview();
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
        if (!container) return;

        const shifts = await dataManager.getAll('shifts');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthName = this.currentDate
            .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const start = new Date(firstDay);
        start.setDate(start.getDate() - start.getDay());

        let html = `
            <div class="calendar-header-simple">
                <h4>${escapeHtml(monthName)}</h4>
                <div class="nav-buttons">
                    <button id="prev-month" class="nav-btn-circle" aria-label="Mes anterior"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
                    <button id="next-month" class="nav-btn-circle" aria-label="Mes siguiente"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
                </div>
            </div>
            <div class="calendar-scroll">
                <div class="monthly-grid">
                    <div class="monthly-days-header">
                        ${['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => `<div>${d}</div>`).join('')}
                    </div>
                    <div class="monthly-days-grid">`;

        const current = new Date(start);
        for (let i = 0; i < 42; i++) {
            const dateStr = formatDateLocal(current);
            const isToday = dateStr === todayLocal();
            const isOther = current.getMonth() !== month;
            const dayShifts = shifts.filter(s => s.date === dateStr);

            const dots = dayShifts.slice(0, 5).map(s => {
                const type = getShiftType(s.type);
                return `<div class="shift-dot" style="background-color: ${type.color};" title="${escapeHtml(type.label)} · ${escapeHtml(s.startTime)}-${escapeHtml(s.endTime)}"></div>`;
            }).join('');

            html += `
                <div class="day-cell ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <span class="day-num">${current.getDate()}</span>
                    <div class="shift-dots">${dots}</div>
                </div>`;

            current.setDate(current.getDate() + 1);
        }

        html += `
                    </div>
                </div>
            </div>
            <div class="calendar-legend">
                <span>Leyenda:</span>
                <div class="legend-item"><span class="legend-dot" style="background-color: ${getShiftType('mañana').color};"></span> Día</div>
                <div class="legend-item"><span class="legend-dot" style="background-color: ${getShiftType('noche').color};"></span> Noche</div>
                <div class="legend-item"><span class="legend-dot" style="background-color: ${getShiftType('especial').color};"></span> Especial / UCI</div>
            </div>`;

        container.innerHTML = html;
        this.attachEvents();
    }

    attachEvents() {
        document.querySelectorAll('#monthly-calendar .day-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const { auth } = window.app || {};
                if (auth?.isAdmin()) {
                    window.app.shifts.openShiftModal(null, cell.dataset.date);
                } else if (auth?.isLoggedIn) {
                    document.querySelector('[href="#turnos"]')?.click();
                } else {
                    window.app?.auth?.showNotification(
                        'Inicia sesión para ver los detalles de los turnos',
                        'info'
                    );
                }
            });
        });
    }
}
