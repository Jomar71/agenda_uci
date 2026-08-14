/**
 * AuthManager - Gestión de sesión y autenticación.
 * Credenciales de administrador + médicos registrados (contraseñas con hash).
 */

import { verifyPassword, escapeHtml } from './utils.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userRole = null;
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupEventListeners();
    }

    checkExistingSession() {
        try {
            const saved = localStorage.getItem('currentUser');
            if (saved) {
                const user = JSON.parse(saved);
                if (user && user.username) {
                    this.currentUser = user;
                    this.isLoggedIn = true;
                    this.userRole = user.role;
                }
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
        this.updateUI();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const loginBtn = e.target.closest('#login-btn');
            if (loginBtn) {
                this.openLoginModal();
                return;
            }
            const logoutBtn = e.target.closest('#logout-btn');
            if (logoutBtn) {
                this.logout();
                return;
            }
        });

        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Cierre global de modales
        document.querySelectorAll('.modal').forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal(modal));

            // Cerrar al hacer clic fuera del contenido
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });

        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.open').forEach(m => this.closeModal(m));
            }
        });

        // Botón de apertura desde el menú móvil (delegado en nav-user)
        document.getElementById('mobile-user-menu')?.addEventListener('click', (e) => {
            if (e.target.closest('#mobile-login-btn')) this.openLoginModal();
            if (e.target.closest('#mobile-logout-btn')) this.logout();
        });
    }

    openLoginModal() {
        const modal = document.getElementById('login-modal');
        if (!modal) return;
        this.openModal(modal);
        setTimeout(() => document.getElementById('login-username')?.focus(), 150);
    }

    closeLoginModal() {
        this.closeModal(document.getElementById('login-modal'));
        document.getElementById('login-form')?.reset();
    }

    /** Abre un modal genérico. */
    openModal(modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    /** Cierra un modal genérico. */
    closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        const anyOpen = document.querySelectorAll('.modal.open').length;
        if (anyOpen === 0) document.body.style.overflow = '';
    }

    async handleLogin(e) {
        e.preventDefault();

        const userInput = document.getElementById('login-username').value.trim();
        const passInput = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit-btn');

        if (!userInput || !passInput) {
            this.showNotification('Ingresa usuario y contraseña', 'warning');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verificando...';
        }

        try {
            // Administrador (credenciales locales de demo)
            if (userInput === 'admin') {
                if (passInput === 'admin123') {
                    this.loginSuccess({
                        id: 'admin',
                        name: 'Administrador',
                        username: 'admin',
                        role: 'admin'
                    });
                    return;
                }
                this.showNotification('Credenciales incorrectas', 'error');
                return;
            }

            // Médicos registrados en el sistema
            const doctors = window.app?.doctors?.getDoctors() || [];
            const doctor = doctors.find(d => String(d.username).toLowerCase() === userInput.toLowerCase());

            if (doctor && await verifyPassword(doctor, passInput)) {
                this.loginSuccess({
                    id: doctor.id,
                    name: doctor.name,
                    username: doctor.username,
                    role: 'doctor',
                    specialty: doctor.specialty,
                    photo: doctor.photo
                });
            } else {
                this.showNotification('Credenciales incorrectas', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Ingresar';
            }
        }
    }

    loginSuccess(user) {
        this.currentUser = user;
        this.isLoggedIn = true;
        this.userRole = user.role;

        const safeUser = { ...user };
        delete safeUser.password;
        localStorage.setItem('currentUser', JSON.stringify(safeUser));

        this.updateUI();
        this.closeLoginModal();
        this.showNotification(`Bienvenido, ${user.name}`, 'success');

        if (window.app) window.app.refresh();
    }

    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userRole = null;
        localStorage.removeItem('currentUser');
        this.updateUI();
        this.showNotification('Sesión cerrada', 'info');
        window.location.reload();
    }

    /** Renderiza el estado de sesión en ambos menús (escritorio y móvil). */
    updateUI() {
        const desktopMenu = document.getElementById('desktop-user-menu');
        const mobileMenu = document.getElementById('mobile-user-menu');

        // Clases de rol en <body> para el control de visibilidad por CSS
        document.body.classList.toggle('is-logged', this.isLoggedIn);
        document.body.classList.toggle('is-admin', this.isAdmin());
        document.body.classList.toggle('is-medic', this.isLoggedIn && !this.isAdmin());

        if (this.isLoggedIn) {
            const initials = (this.currentUser.name || 'U').trim().split(/\s+/).slice(0, 2)
                .map(w => w.charAt(0).toUpperCase()).join('');
            const roleLabel = this.isAdmin() ? 'Admin' : 'Médico';

            if (desktopMenu) {
                desktopMenu.innerHTML = `
                    <div class="user-chip">
                        <div class="user-avatar">${escapeHtml(initials)}</div>
                        <div class="user-info-inner">
                            <span class="user-name">${escapeHtml(this.currentUser.name)}</span>
                            <span class="user-role">${roleLabel}</span>
                        </div>
                        <button class="btn btn-sm btn-secondary" id="logout-btn" title="Cerrar sesión">
                            <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                            <span>Salir</span>
                        </button>
                    </div>`;
            }

            if (mobileMenu) {
                mobileMenu.innerHTML = `
                    <div class="user-chip">
                        <div class="user-avatar">${escapeHtml(initials)}</div>
                        <div class="user-info-inner">
                            <span class="user-name">${escapeHtml(this.currentUser.name)}</span>
                            <span class="user-role">${roleLabel}</span>
                        </div>
                    </div>
                    <button class="btn btn-danger" id="mobile-logout-btn">
                        <i class="fas fa-sign-out-alt" aria-hidden="true"></i> Cerrar Sesión
                    </button>`;
            }
        } else {
            const loginBtnHtml = `
                <button class="btn btn-primary" id="login-btn">
                    <i class="fas fa-sign-in-alt" aria-hidden="true"></i> Iniciar Sesión
                </button>`;

            if (desktopMenu) desktopMenu.innerHTML = loginBtnHtml;
            if (mobileMenu) mobileMenu.innerHTML = loginBtnHtml.replace('id="login-btn"', 'id="mobile-login-btn"');
        }

        // Botón "Nuevo Turno": solo el administrador puede crear turnos
        const addShiftBtn = document.getElementById('add-shift-btn');
        if (addShiftBtn) addShiftBtn.style.display = this.isAdmin() ? 'inline-flex' : 'none';

        // Notificar al resto de la app que cambió la sesión (ej: botones de documentos)
        window.dispatchEvent(new CustomEvent('uci_auth_changed'));
    }

    showNotification(msg, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;

        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const div = document.createElement('div');
        div.className = `notification ${type}`;
        div.innerHTML = `<i class="fas ${icons[type] || icons.info}" aria-hidden="true"></i><span>${escapeHtml(msg)}</span>`;

        container.appendChild(div);

        setTimeout(() => {
            div.classList.add('out');
            setTimeout(() => div.remove(), 400);
        }, 3500);
    }

    isAdmin() {
        return this.userRole === 'admin';
    }
}
