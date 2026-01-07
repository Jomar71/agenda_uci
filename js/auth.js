
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
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            this.isLoggedIn = true;
            this.userRole = this.currentUser.role;
            this.updateUI();
        }
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.addEventListener('click', () => this.openLoginModal());

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Global Modal Close
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });
    }

    openLoginModal() {
        document.getElementById('login-modal').style.display = 'block';
    }

    closeLoginModal() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('login-form').reset();
    }

    async handleLogin(e) {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value;

        if (user === 'admin' && pass === 'admin123') {
            this.loginSuccess({
                id: 1,
                name: 'Administrador',
                username: 'admin',
                role: 'admin'
            });
            return;
        }

        // Check doctors
        // Note: In a real app we would check against DB, but the original code 
        // checked against loaded doctors in memory. 
        // We will assume window.app.doctors is available or use a callback
        const doctors = window.app?.doctors?.getDoctors() || [];
        const doctor = doctors.find(d => d.username === user && d.password === pass); // Simplified auth

        if (doctor) {
            this.loginSuccess({
                ...doctor,
                role: 'doctor'
            });
        } else {
            this.showNotification('Credenciales incorrectas', 'error');
        }
    }

    loginSuccess(user) {
        this.currentUser = user;
        this.isLoggedIn = true;
        this.userRole = user.role;
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.updateUI();
        this.closeLoginModal();
        this.showNotification(`Bienvenido ${user.name}`, 'success');

        // Refresh app state
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

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const adminNav = document.getElementById('admin-nav');

        if (this.isLoggedIn) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userName) userName.textContent = this.currentUser.name;
            if (adminNav) adminNav.style.display = this.isAdmin() ? 'block' : 'none';

            // Show admin elements
            if (this.isAdmin()) document.body.classList.add('is-admin');
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            if (adminNav) adminNav.style.display = 'none';
            document.body.classList.remove('is-admin');
        }
    }

    showNotification(msg, type = 'info') {
        const container = document.getElementById('notifications');
        const div = document.createElement('div');
        div.className = `notification ${type} animate__animated animate__slideInRight`;
        div.innerHTML = `<i class="fas fa-info-circle"></i> ${msg}`;
        container.appendChild(div);
        setTimeout(() => {
            div.classList.replace('animate__slideInRight', 'animate__slideOutRight');
            setTimeout(() => div.remove(), 500);
        }, 3000);
    }

    isAdmin() {
        return this.userRole === 'admin';
    }
}