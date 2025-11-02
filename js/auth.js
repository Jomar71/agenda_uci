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
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userName.textContent = this.currentUser.name;
            
            // Mostrar/ocultar elementos según el rol
            if (this.userRole === 'admin') {
                adminNav.style.display = 'block';
                if (addShiftBtn) addShiftBtn.style.display = 'block';
            } else {
                adminNav.style.display = 'none';
                if (addShiftBtn) addShiftBtn.style.display = 'none';
            }
        } else {
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
            adminNav.style.display = 'none';
            if (addShiftBtn) addShiftBtn.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
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

    // Cambio de contraseña
    changePassword(currentPassword, newPassword) {
        if (!this.isLoggedIn) return false;
        
        if (this.currentUser.password !== currentPassword) {
            this.showNotification('Contraseña actual incorrecta', 'error');
            return false;
        }

        this.currentUser.password = newPassword;
        
        // Actualizar en almacenamiento según el rol
        if (this.hasRole('admin')) {
            const admins = storage.getAdmins();
            const adminIndex = admins.findIndex(a => a.id === this.currentUser.id);
            if (adminIndex !== -1) {
                admins[adminIndex].password = newPassword;
                storage.set('admins', admins);
            }
        } else {
            const doctors = storage.getDoctors();
            const doctorIndex = doctors.findIndex(d => d.id === this.currentUser.id);
            if (doctorIndex !== -1) {
                doctors[doctorIndex].password = newPassword;
                storage.set('doctors', doctors);
            }
        }

        // Actualizar sesión
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        this.showNotification('Contraseña actualizada correctamente', 'success');
        return true;
    }
}

// Instancia global del gestor de autenticación
const auth = new AuthManager();