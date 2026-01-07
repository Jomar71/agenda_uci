
import './firebase-config.js';
import { AuthManager } from './auth.js';
import { DoctorsManager } from './doctors.js';
import { ShiftsManager } from './shifts.js';
import { CalendarManager } from './calendar.js';
import { ReportsController } from './modules/reports.js';

class App {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 App: Initializing...');

        // Initialize managers
        this.auth = new AuthManager();
        this.doctors = new DoctorsManager(this.auth);
        this.shifts = new ShiftsManager(this.auth, this.doctors);
        this.calendar = new CalendarManager(this.auth);
        this.reports = new ReportsController();

        // UI Setup
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupAdminFeatures();

        // Global access for debugging/interop (optional)
        window.app = this;
    }

    setupNavigation() {
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');

        const navigate = (targetId) => {
            sections.forEach(s => {
                s.classList.remove('active');
                s.classList.remove('animate__fadeIn');
            });

            navLinks.forEach(l => l.classList.remove('active'));

            const target = document.getElementById(targetId);
            const link = document.querySelector(`a[href="#${targetId}"]`);

            if (target) {
                target.classList.add('active');
                target.classList.add('animate__animated', 'animate__fadeIn');
                if (targetId === 'inicio') this.calendar.renderMonthlyPreview();
                if (targetId === 'turnos') this.shifts.renderCalendar();
                if (targetId === 'medicos') this.doctors.renderDoctors();
            }
            if (link) link.classList.add('active');
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                navigate(targetId);
            });
        });

        // Handle initial hash or default to 'inicio'
        const initialHash = window.location.hash.substring(1) || 'inicio';
        navigate(initialHash);
    }

    setupMobileMenu() {
        const btn = document.querySelector('.mobile-menu-btn');
        const nav = document.querySelector('.nav');

        if (btn && nav) {
            btn.addEventListener('click', () => {
                nav.classList.toggle('active');
                const icon = btn.querySelector('i');
                if (nav.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });

            // Close menu on link click
            document.querySelectorAll('.nav-link').forEach(l => {
                l.addEventListener('click', () => {
                    nav.classList.remove('active');
                    btn.querySelector('i').classList.remove('fa-times');
                    btn.querySelector('i').classList.add('fa-bars');
                });
            });
        }
    }

    setupAdminFeatures() {
        // Manage Doctors button
        const manageDoctorsBtn = document.getElementById('manage-doctors');
        if (manageDoctorsBtn) {
            manageDoctorsBtn.addEventListener('click', () => {
                const link = document.querySelector('[href="#medicos"]');
                if (link) link.click();
            });
        }

        // Manage Shifts button
        const manageShiftsBtn = document.getElementById('manage-shifts');
        if (manageShiftsBtn) {
            manageShiftsBtn.addEventListener('click', () => {
                const link = document.querySelector('[href="#turnos"]');
                if (link) link.click();
            });
        }

        // Generate Reports button
        const generateReportsBtn = document.getElementById('generate-reports');
        if (generateReportsBtn) {
            generateReportsBtn.addEventListener('click', () => {
                this.reports.showReportModal();
            });
        }

        // Backup
        const backupBtn = document.getElementById('backup-data');
        if (backupBtn) {
            backupBtn.addEventListener('click', async () => {
                const { dataManager } = await import('./services/data-manager.js');
                const doctors = await dataManager.getAll('doctors');
                const shifts = await dataManager.getAll('shifts');
                const data = { doctors, shifts, timestamp: new Date() };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_uci_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
            });
        }
    }

    refresh() {
        this.doctors.loadDoctors();
        this.shifts.loadShifts();
        this.calendar.renderMonthlyPreview();
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    new App();
});