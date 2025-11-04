// Sistema de autenticación mejorado
class AuthManager {
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
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.isLoggedIn = true;
                this.userRole = this.currentUser.role;
                this.updateUI();
            } catch (error) {
                console.error('Error al cargar la sesión:', error);
                this.logout();
            }
        }
    }

    setupEventListeners() {
        // Botón de login
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.openLoginModal());
        }

        // Botón de logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Formulario de login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Cerrar modales
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    openLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('username').focus();
        }
    }

    closeLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('login-form').reset();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showNotification('Por favor ingresa usuario y contraseña', 'error');
            return;
        }

        // Buscar en administradores
        let user = this.findAdmin(username);
        let role = 'admin';

        // Si no es admin, buscar en médicos
        if (!user) {
            const doctors = window.doctorsManager?.getDoctors() || [];
            user = doctors.find(doctor => doctor.username === username);
            role = 'doctor';
        }

        if (user && user.password === password) {
            this.currentUser = {
                id: user.id,
                name: user.name,
                username: user.username,
                role: role
            };
            
            this.isLoggedIn = true;
            this.userRole = role;
            
            // Guardar sesión
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.updateUI();
            this.closeLoginModal();
            this.showNotification(`Bienvenido, ${this.currentUser.name}`, 'success');
            
            // Actualizar interfaz según la sección actual
            this.refreshCurrentSection();
        } else {
            this.showNotification('Usuario o contraseña incorrectos', 'error');
        }
    }

    findAdmin(username) {
        const admins = [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                name: 'Administrador Principal',
                email: 'admin@uci.com'
            }
        ];
        return admins.find(admin => admin.username === username);
    }

    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userRole = null;
        localStorage.removeItem('currentUser');
        this.updateUI();
        this.showNotification('Sesión cerrada correctamente', 'info');
        
        // Actualizar interfaz
        this.refreshCurrentSection();
    }

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const adminNav = document.getElementById('admin-nav');
        const addShiftBtn = document.getElementById('add-shift-btn');

        if (this.isLoggedIn) {
            // Usuario logueado
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userName) userName.textContent = this.currentUser.name;
            
            // Mostrar/ocultar elementos según el rol
            if (this.userRole === 'admin') {
                if (adminNav) adminNav.style.display = 'block';
                if (addShiftBtn) addShiftBtn.style.display = 'inline-block';
            } else {
                if (adminNav) adminNav.style.display = 'none';
                if (addShiftBtn) addShiftBtn.style.display = 'inline-block';
            }
        } else {
            // Usuario no logueado
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
            if (adminNav) adminNav.style.display = 'none';
            if (addShiftBtn) addShiftBtn.style.display = 'none';
        }
    }

    refreshCurrentSection() {
        // Recargar la sección actual después del login/logout
        const activeSection = document.querySelector('.section.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            
            switch(sectionId) {
                case 'medicos':
                    if (window.doctorsManager) {
                        window.doctorsManager.loadDoctors();
                    }
                    break;
                case 'turnos':
                    if (window.shiftsManager) {
                        window.shiftsManager.renderCalendar();
                    }
                    break;
                case 'inicio':
                    if (window.calendarManager) {
                        window.calendarManager.renderMonthlyPreview();
                    }
                    if (window.doctorsManager) {
                        window.doctorsManager.updateStats();
                    }
                    break;
            }
        }
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notifications.appendChild(notification);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    // Verificar permisos
    hasRole(role) {
        return this.userRole === role;
    }

    isAdmin() {
        return this.hasRole('admin');
    }

    canEditDoctor(doctorId = null) {
        if (this.isAdmin()) return true;
        if (this.hasRole('doctor') && doctorId === this.currentUser.id) return true;
        return false;
    }

    canEditShift(shift) {
        if (this.isAdmin()) return true;
        if (this.hasRole('doctor') && shift.doctorId === this.currentUser.id) return true;
        return false;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Instancia global del gestor de autenticación
const auth = new AuthManager();

// Estilos para notificaciones mejoradas
const notificationStyles = `
@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.notification.success {
    border-left-color: #27ae60;
    background: #d5f4e6;
}

.notification.error {
    border-left-color: #e74c3c;
    background: #fadbd8;
}

.notification.warning {
    border-left-color: #f39c12;
    background: #fef5e7;
}

.notification.info {
    border-left-color: #3498db;
    background: #d6eaf8;
}
`;

// Agregar estilos al documento
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);