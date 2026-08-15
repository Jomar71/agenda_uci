/**
 * App - Orquestador principal de la aplicación.
 */

import './firebase-config.js';
import { AuthManager } from './auth.js';
import { DoctorsManager } from './doctors.js';
import { ShiftsManager } from './shifts.js';
import { CalendarManager } from './calendar.js';
import { ReportsController } from './modules/reports.js';
import { todayLocal, getDoctorColor, getDoctorInitials, getContrastColor } from './utils.js';

class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 App: Initializing...');

        // Managers
        this.auth = new AuthManager();
        this.doctors = new DoctorsManager(this.auth);
        this.shifts = new ShiftsManager(this.auth, this.doctors);
        this.calendar = new CalendarManager(this.auth);
        this.reports = new ReportsController();

        // UI
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupAdminFeatures();
        this.setupThemeToggle();

        // Acceso global para compatibilidad
        window.app = this;

        // Actualizar año en el footer
        const yearEl = document.getElementById('current-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // Banner de permisos
        window.addEventListener('uci_firebase_permissions_error', (e) => {
            console.error('🔓 Error de permisos en Firebase:', e.detail);
            this.showDiagnosticBanner();
        });

        // Ocultar overlay de carga cuando los datos estén listos
        Promise.all([this.doctors.loadDoctors(), this.shifts.loadShifts()])
            .catch(() => {})
            .finally(() => {
                this.hideLoading();
                this.renderHomeDashboard();
            });
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            setTimeout(() => overlay.classList.add('hidden'), 200);
        }
    }

    showDiagnosticBanner() {
        const banner = document.getElementById('diagnostic-banner');
        if (!banner || banner.style.display !== 'none') return;
        banner.innerHTML = `
            <span>⚠️ Base de datos bloqueada (nube). Trabajando en modo local.</span>
            <button class="btn-fix" id="banner-fix-btn">¿Cómo solucionar?</button>
        `;
        banner.style.display = 'flex';
        document.getElementById('banner-fix-btn').addEventListener('click', () => this.showFixInstructions());
    }

    showFixInstructions() {
        this.auth.showNotification(
            'Actualiza las reglas de Firestore en tu consola de Firebase para desbloquear la nube.',
            'info'
        );
        window.open('https://console.firebase.google.com/', '_blank', 'noopener');
    }

    setupNavigation() {
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');

        const navigate = (targetId) => {
            // Control de acceso por sección y rol
            if (targetId === 'admin' && !this.auth.isAdmin()) targetId = 'inicio';
            if (targetId === 'medicos' && this.auth.isLoggedIn && !this.auth.isAdmin()) targetId = 'inicio';
            if (targetId === 'documentos' && !this.auth.isLoggedIn) targetId = 'inicio';

            if (!document.getElementById(targetId)) return;

            sections.forEach(s => s.classList.remove('active'));
            navLinks.forEach(l => l.classList.remove('active'));

            document.getElementById(targetId).classList.add('active');

            const link = document.querySelector(`a[href="#${targetId}"]`);
            if (link) link.classList.add('active');

            // Render per sección
            if (targetId === 'inicio') this.calendar.renderMonthlyPreview();
            if (targetId === 'turnos') this.shifts.renderCalendar();
            if (targetId === 'medicos') this.doctors.renderDoctors();

            // Cerrar menú móvil y actualizar hash
            this.closeMobileMenu();
            try {
                if (window.location.hash !== `#${targetId}`) {
                    history.replaceState(null, '', `#${targetId}`);
                }
            } catch (e) { /* ignorar: contextos sin soporte de history */ }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigate(link.getAttribute('href').substring(1));
            });
        });

        // Permitir apertura de secciones según permisos (el guard vive en navigate)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash) navigate(hash);
        });

        const initialHash = window.location.hash.substring(1) || 'inicio';
        navigate(initialHash);
    }

    setupMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const nav = document.getElementById('main-nav');
        const overlay = document.getElementById('nav-overlay');

        if (!btn || !nav) return;

        const toggleMenu = (force) => {
            const isOpen = force !== undefined ? force : !nav.classList.contains('active');
            nav.classList.toggle('active', isOpen);
            overlay.classList.toggle('show', isOpen);
            btn.setAttribute('aria-expanded', String(isOpen));
            btn.innerHTML = isOpen
                ? '<i class="fas fa-times" aria-hidden="true"></i>'
                : '<i class="fas fa-bars" aria-hidden="true"></i>';
            btn.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
        };

        btn.addEventListener('click', () => toggleMenu());
        if (overlay) overlay.addEventListener('click', () => toggleMenu(false));

        // Cerrar al cambiar de tamaño a escritorio
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && nav.classList.contains('active')) {
                toggleMenu(false);
            }
        });
    }

    closeMobileMenu() {
        const nav = document.getElementById('main-nav');
        const overlay = document.getElementById('nav-overlay');
        const btn = document.getElementById('mobile-menu-btn');
        if (nav?.classList.contains('active')) {
            nav.classList.remove('active');
            overlay?.classList.remove('show');
            if (btn) {
                btn.setAttribute('aria-expanded', 'false');
                btn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
                btn.setAttribute('aria-label', 'Abrir menú');
            }
        }
    }

    setupThemeToggle() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;

        const applyTheme = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            try { localStorage.setItem('uci_theme', theme); } catch (e) { /* privado */ }
            const icon = btn.querySelector('i');
            if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
        };

        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });

        applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
    }

    setupAdminFeatures() {
        const wire = (btnId, action) => {
            document.getElementById(btnId)?.addEventListener('click', action);
        };

        wire('manage-doctors', () => document.querySelector('[href="#medicos"]')?.click());
        wire('manage-shifts', () => document.querySelector('[href="#turnos"]')?.click());
        wire('backup-data', () => this.backupData());
    }

    /** Actualiza el panel de control de la sección Inicio con datos reales. */
    renderHomeDashboard() {
        const todayEl = document.getElementById('today-label');
        if (todayEl) {
            todayEl.textContent = new Date().toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
        }

        const doctors = this.doctors.getDoctors();
        const shifts = this.shifts.getShifts();
        const todayStr = todayLocal();
        const todayCount = shifts.filter(s => s.date === todayStr).length;
        const upcoming = shifts
            .filter(s => s.date >= todayStr)
            .sort((a, b) => (a.date + ' ' + (a.startTime || '')).localeCompare(b.date + ' ' + (b.startTime || '')))
            .slice(0, 6);

        const statDoctors = document.getElementById('stat-doctors');
        if (statDoctors) statDoctors.textContent = doctors.length;
        const statToday = document.getElementById('stat-today');
        if (statToday) statToday.textContent = todayCount;
        const statUpcoming = document.getElementById('stat-upcoming');
        if (statUpcoming) statUpcoming.textContent = upcoming.length;

        const list = document.getElementById('upcoming-shifts');
        if (list) list.innerHTML = this.renderUpcomingShifts(upcoming);
    }

    renderUpcomingShifts(upcoming) {
        if (!upcoming.length) {
            return `
                <div class="no-data">
                    <i class="fas fa-calendar-times" aria-hidden="true"></i>
                    No hay turnos programados próximamente
                </div>`;
        }

        const typeLabel = {
            'mañana': 'Día', 'guardia': 'Guardia',
            'noche': 'Noche', 'especial': 'Especial',
            'emergencia': 'Emergencia', 'consulta': 'Consulta', 'descanso': 'Descanso'
        };

        return upcoming.map(s => {
            const doctor = this.doctors.getDoctorById(s.doctorId);
            const color = getDoctorColor(doctor);
            const textColor = getContrastColor(color);
            const initials = getDoctorInitials(doctor);
            const label = typeLabel[s.type] || s.type;
            const date = new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'short', day: 'numeric', month: 'short'
            });
            return `
                <div class="upcoming-item">
                    <span class="upcoming-dot" style="background-color: ${color};"></span>
                    <span class="doctor-initials-badge" style="background-color: ${color}; color: ${textColor};"
                        title="${doctor ? this.escapeHtml(doctor.name) : 'Médico no asignado'}">${this.escapeHtml(initials)}</span>
                    <div class="upcoming-info">
                        <strong>${doctor ? this.escapeHtml(doctor.name) : 'Médico no asignado'}</strong>
                        <span>${label} · ${s.startTime || ''} - ${s.endTime || ''}</span>
                    </div>
                    <span class="upcoming-date">${date}</span>
                </div>`;
        }).join('');
    }

    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = String(value ?? '');
        return div.innerHTML;
    }

    async backupData() {
        const { dataManager } = await import('./services/data-manager.js');
        try {
            const [doctors, shifts] = await Promise.all([
                dataManager.getAll('doctors'),
                dataManager.getAll('shifts')
            ]);

            const data = { doctors, shifts, timestamp: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_uci_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            this.auth.showNotification(`Backup descargado (${doctors.length} médicos, ${shifts.length} turnos)`, 'success');
        } catch (error) {
            console.error('Error backup:', error);
            this.auth.showNotification('Error al generar el backup', 'error');
        }
    }

    refresh() {
        this.doctors.loadDoctors();
        this.shifts.loadShifts();
        this.calendar.renderMonthlyPreview();
        this.shifts.renderCalendar();
        this.renderHomeDashboard();
    }
}

// Iniciar la app
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
