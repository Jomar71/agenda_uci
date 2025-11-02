// Sistema de autenticación
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userRole = null;
        this.init();
    }

    init() {
        // Verificar si hay sesión activa
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.isLoggedIn = true;
            this.userRole = this.currentUser.role;
            this.updateUI();
        }
    }

    login(username, password) {
        console.log('Intentando login con:', username); // Debug
        
        // Buscar en administradores
        let user = storage.findAdmin(username);
        let role = 'admin';

        // Si no es admin, buscar en médicos
        if (!user) {
            const doctors = storage.getDoctors();
            user = doctors.find(doctor => doctor.username === username);
            role = 'doctor';
        }

        if (user && user.password === password) {
            this.currentUser = { ...user, role };
            this.isLoggedIn = true;
            this.userRole = role;
            
            // Guardar sesión
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.updateUI();
            this.showNotification('Login exitoso', 'success');
            return true;
        } else {
            this.showNotification('Usuario o contraseña incorrectos', 'error');
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userRole = null;
        localStorage.removeItem('currentUser');
        this.updateUI();
        this.showNotification('Sesión cerrada', 'info');
    }

    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const adminNav = document.getElementById('admin-nav');
        const addShiftBtn = document.getElementById('add-shift-btn');

        if (this.isLoggedIn) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userName) userName.textContent = this.currentUser.name;
            
            // Mostrar/ocultar elementos según el rol
            if (this.userRole === 'admin') {
                if (adminNav) adminNav.style.display = 'block';
                if (addShiftBtn) addShiftBtn.style.display = 'block';
            } else {
                if (adminNav) adminNav.style.display = 'none';
                if (addShiftBtn) addShiftBtn.style.display = 'none';
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            if (adminNav) adminNav.style.display = 'none';
            if (addShiftBtn) addShiftBtn.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Verificar permisos
    hasRole(role) {
        return this.userRole === role;
    }

    canEditShift(shift) {
        if (this.hasRole('admin')) return true;
        if (this.hasRole('doctor') && shift.doctorId === this.currentUser.id) return true;
        return false;
    }
}

// Instancia global del gestor de autenticación
const auth = new AuthManager();