// Sistema de almacenamiento local con sincronización mejorada
class StorageManager {
    constructor() {
        this.keys = {
            DOCTORS: 'doctors',
            SHIFTS: 'shifts', 
            ADMINS: 'admins',
            SETTINGS: 'settings',
            LAST_SYNC: 'last_sync'
        };
        this.init();
    }

    init() {
        // Datos iniciales
        if (!this.get(this.keys.DOCTORS)) {
            this.set(this.keys.DOCTORS, []);
        }
        if (!this.get(this.keys.SHIFTS)) {
            this.set(this.keys.SHIFTS, []);
        }
        if (!this.get(this.keys.ADMINS)) {
            this.set(this.keys.ADMINS, [{
                id: 1,
                username: 'admin',
                password: 'admin123',
                name: 'Administrador Principal',
                email: 'admin@uci.com'
            }]);
        }

        // Sincronizar entre pestañas
        this.setupCrossTabSync();
    }

    setupCrossTabSync() {
        // Escuchar cambios en otras pestañas
        window.addEventListener('storage', (e) => {
            if (e.key === this.keys.DOCTORS || e.key === this.keys.SHIFTS) {
                console.log('Datos actualizados desde otra pestaña:', e.key);
                // Disparar evento personalizado para que otros componentes se actualicen
                window.dispatchEvent(new CustomEvent('dataUpdated', { 
                    detail: { key: e.key, newValue: e.newValue } 
                }));
            }
        });
    }

    // Métodos básicos mejorados para sincronización
    set(key, value) {
        try {
            const oldValue = this.get(key);
            localStorage.setItem(key, JSON.stringify(value));
            
            // Disparar evento storage para sincronizar otras pestañas
            window.dispatchEvent(new StorageEvent('storage', {
                key: key,
                oldValue: JSON.stringify(oldValue),
                newValue: JSON.stringify(value),
                storageArea: localStorage
            }));
            
            return true;
        } catch (error) {
            console.error('Error guardando:', error);
            return false;
        }
    }

    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error leyendo:', error);
            return null;
        }
    }

    // Médicos
    getDoctors() {
        return this.get(this.keys.DOCTORS) || [];
    }

    saveDoctor(doctorData) {
        const doctors = this.getDoctors();
        let doctorToSave;

        if (doctorData.id) {
            // Editar
            const index = doctors.findIndex(d => d.id === doctorData.id);
            if (index !== -1) {
                // Mantener datos existentes
                const existing = doctors[index];
                doctorToSave = {
                    ...existing,
                    ...doctorData,
                    // Mantener foto si no se proporciona nueva
                    photo: doctorData.photo || existing.photo,
                    // Mantener contraseña si no se cambia
                    password: doctorData.password || existing.password
                };
                doctors[index] = doctorToSave;
            }
        } else {
            // Nuevo
            doctorToSave = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                ...doctorData,
                createdAt: new Date().toISOString(),
                photo: doctorData.photo || 'assets/images/default-doctor.jpg'
            };
            doctors.push(doctorToSave);
        }

        if (this.set(this.keys.DOCTORS, doctors)) {
            return doctorToSave;
        }
        return null;
    }

    deleteDoctor(id) {
        const doctors = this.getDoctors().filter(d => d.id !== id);
        const success = this.set(this.keys.DOCTORS, doctors);
        
        if (success) {
            // Eliminar turnos del médico
            const shifts = this.getShifts().filter(s => s.doctorId !== id);
            this.set(this.keys.SHIFTS, shifts);
        }
        
        return success;
    }

    // Turnos
    getShifts() {
        return this.get(this.keys.SHIFTS) || [];
    }

    saveShift(shiftData) {
        const shifts = this.getShifts();
        let shiftToSave;

        if (shiftData.id) {
            // Editar
            const index = shifts.findIndex(s => s.id === shiftData.id);
            if (index !== -1) {
                shiftToSave = { ...shifts[index], ...shiftData };
                shifts[index] = shiftToSave;
            }
        } else {
            // Nuevo
            shiftToSave = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                ...shiftData,
                createdAt: new Date().toISOString()
            };
            shifts.push(shiftToSave);
        }

        if (this.set(this.keys.SHIFTS, shifts)) {
            return shiftToSave;
        }
        return null;
    }

    deleteShift(id) {
        const shifts = this.getShifts().filter(s => s.id !== id);
        return this.set(this.keys.SHIFTS, shifts);
    }

    getShiftsByDoctor(doctorId) {
        return this.getShifts().filter(s => s.doctorId === doctorId);
    }

    getShiftsByDate(date) {
        const targetDate = new Date(date).toDateString();
        return this.getShifts().filter(shift => {
            const shiftDate = new Date(shift.date).toDateString();
            return shiftDate === targetDate;
        });
    }

    getShiftsByDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return this.getShifts().filter(shift => {
            const shiftDate = new Date(shift.date);
            return shiftDate >= start && shiftDate <= end;
        });
    }

    // Administradores
    getAdmins() {
        return this.get(this.keys.ADMINS) || [];
    }

    findAdmin(username) {
        return this.getAdmins().find(a => a.username === username);
    }

    // Utilidades
    exportData() {
        return JSON.stringify({
            doctors: this.getDoctors(),
            shifts: this.getShifts(),
            admins: this.getAdmins(),
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    getStatistics() {
        const doctors = this.getDoctors();
        const shifts = this.getShifts();
        
        return {
            totalDoctors: doctors.length,
            totalShifts: shifts.length,
            specialties: [...new Set(doctors.map(d => d.specialty))].length
        };
    }

    // Validación de conflictos
    checkShiftConflict(shift, excludeId = null) {
        const shifts = this.getShifts();
        const shiftDate = new Date(shift.date);
        const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
        const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);

        return shifts.some(existing => {
            if (excludeId && existing.id === excludeId) return false;
            if (existing.doctorId !== shift.doctorId) return false;
            
            const existingDate = new Date(existing.date);
            if (existingDate.toDateString() !== shiftDate.toDateString()) return false;

            const existingStart = new Date(`${existing.date}T${existing.startTime}`);
            const existingEnd = new Date(`${existing.date}T${existing.endTime}`);

            return (shiftStart < existingEnd && shiftEnd > existingStart);
        });
    }

    // Limpiar datos (para testing)
    clearAll() {
        localStorage.removeItem(this.keys.DOCTORS);
        localStorage.removeItem(this.keys.SHIFTS);
        localStorage.removeItem(this.keys.ADMINS);
        this.init();
    }
}

// Instancia global
const storage = new StorageManager();