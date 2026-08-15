/**
 * CalendarManager - Vista previa mensual del panel de inicio.
 */

import { dataManager } from './services/data-manager.js';
import {
    escapeHtml, getShiftType, formatDateLocal, todayLocal,
    getDoctorColor, getDoctorInitials
} from './utils.js';

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
        document.body.addEventListener('change', (e) => {
            const picker = e.target.closest('#month-picker');
            if (picker && picker.value) {
                this.gotoDate(picker.value);
            }
        });
    }

    gotoDate(dateStr) {
        const parts = String(dateStr).split('-');
        if (parts.length !== 3) return;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        if (Number.isNaN(year) || Number.isNaN(month)) return;
        this.currentDate = new Date(year, month, 1);
        this.renderMonthlyPreview();
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

        const [shifts, doctors] = await Promise.all([
            dataManager.getAll('shifts'),
            dataManager.getAll('doctors')
        ]);
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthName = this.currentDate
            .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const pickerDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;

        const firstDay = new Date(year, month, 1);
        const start = new Date(firstDay);
        start.setDate(start.getDate() - start.getDay());

        let html = `
            <div class="calendar-header-simple">
                <h4>${escapeHtml(monthName)}</h4>
                <div class="nav-buttons">
                    <button id="prev-month" class="nav-btn-circle" aria-label="Mes anterior"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
                    <input type="date" id="month-picker" class="month-picker" value="${pickerDate}" title="Ir a una fecha" aria-label="Ir a una fecha">
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
                const doctor = doctors.find(d => String(d.id).trim() === String(s.doctorId).trim());
                const color = getDoctorColor(doctor);
                const initials = getDoctorInitials(doctor);
                const type = getShiftType(s.type);
                return `<span class="shift-mini" style="background-color: ${color};"
                    title="${escapeHtml(doctor ? doctor.name : 'Médico no asignado')} · ${escapeHtml(type.label)} · ${escapeHtml(s.startTime)}-${escapeHtml(s.endTime)}">${escapeHtml(initials)}</span>`;
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
                ${doctors.slice(0, 12).map(d => {
                    const color = getDoctorColor(d);
                    const initials = getDoctorInitials(d);
                    return `
                        <div class="legend-item" title="${escapeHtml(d.name)}">
                            <span class="legend-dot" style="background-color: ${color};"></span>
                            <span class="legend-initials">${escapeHtml(initials)}</span>
                        </div>`;
                }).join('')}
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
