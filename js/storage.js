// Sistema de almacenamiento local
class StorageManager {
    constructor() {
        this.init();
    }

    init() {
        // Inicializar datos por defecto si no existen
        if (!this.get('doctors')) {
            this.set('doctors', []);
        }
        if (!this.get('shifts')) {
            this.set('shifts', []);
        }
        if (!this.get('admins')) {
            // Admin por defecto
            this.set('admins', [
                {
                    id: 1,
                    username: 'admin',
                    password: 'admin123',
                    name: 'Administrador Principal',
                    email: 'admin@uci.com'
                }
            ]);
        }
        if (!this.get('settings')) {
            this.set('settings', {
                hospitalName: 'UCI Medical Center',
                workingHours: {
                    start: '08:00',
                    end: '20:00'
                },
                shiftTypes: ['guardia', 'consulta', 'emergencia', 'descanso']
            });
        }
    }

    // Métodos básicos de almacenamiento
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    get(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    }

    remove(key) {
        localStorage.removeItem(key);
    }

    clear() {
        localStorage.clear();
        this.init();
    }

    // Métodos específicos para médicos
    getDoctors() {
        return this.get('doctors') || [];
    }

    saveDoctor(doctor) {
        const doctors = this.getDoctors();
        if (doctor.id) {
            // Actualizar médico existente
            const index = doctors.findIndex(d => d.id === doctor.id);
            if (index !== -1) {
                doctors[index] = doctor;
            }
        } else {
            // Nuevo médico
            doctor.id = this.generateId(doctors);
            doctor.createdAt = new Date().toISOString();
            doctors.push(doctor);
        }
        this.set('doctors', doctors);
        return doctor;
    }

    deleteDoctor(id) {
        const doctors = this.getDoctors().filter(d => d.id !== id);
        this.set('doctors', doctors);
        
        // Eliminar turnos asociados
        const shifts = this.getShifts().filter(s => s.doctorId !== id);
        this.set('shifts', shifts);
    }

    // Métodos específicos para turnos
    getShifts() {
        return this.get('shifts') || [];
    }

    saveShift(shift) {
        const shifts = this.getShifts();
        if (shift.id) {
            // Actualizar turno existente
            const index = shifts.findIndex(s => s.id === shift.id);
            if (index !== -1) {
                shifts[index] = shift;
            }
        } else {
            // Nuevo turno
            shift.id = this.generateId(shifts);
            shift.createdAt = new Date().toISOString();
            shifts.push(shift);
        }
        this.set('shifts', shifts);
        return shift;
    }

    deleteShift(id) {
        const shifts = this.getShifts().filter(s => s.id !== id);
        this.set('shifts', shifts);
    }

    getShiftsByDoctor(doctorId) {
        return this.getShifts().filter(shift => shift.doctorId === doctorId);
    }

    getShiftsByDateRange(startDate, endDate) {
        const shifts = this.getShifts();
        return shifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            return shiftDate >= startDate && shiftDate <= endDate;
        });
    }

    // Métodos para administradores
    getAdmins() {
        return this.get('admins') || [];
    }

    findAdmin(username) {
        return this.getAdmins().find(admin => admin.username === username);
    }

    // Utilidades
    generateId(items) {
        const maxId = items.reduce((max, item) => Math.max(max, item.id || 0), 0);
        return maxId + 1;
    }

    // Backup y restauración
    exportData() {
        const data = {
            doctors: this.getDoctors(),
            shifts: this.getShifts(),
            admins: this.getAdmins(),
            settings: this.get('settings'),
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.doctors) this.set('doctors', data.doctors);
            if (data.shifts) this.set('shifts', data.shifts);
            if (data.admins) this.set('admins', data.admins);
            if (data.settings) this.set('settings', data.settings);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Validación de conflictos de horarios
    checkShiftConflict(shift, excludeId = null) {
        const shifts = this.getShifts();
        const shiftStart = new Date(`${shift.date}T${shift.startTime}`);
        const shiftEnd = new Date(`${shift.date}T${shift.endTime}`);

        return shifts.some(existingShift => {
            if (excludeId && existingShift.id === excludeId) return false;
            if (existingShift.doctorId !== shift.doctorId) return false;

            const existingStart = new Date(`${existingShift.date}T${existingShift.startTime}`);
            const existingEnd = new Date(`${existingShift.date}T${existingShift.endTime}`);

            return (shiftStart < existingEnd && shiftEnd > existingStart);
        });
    }

    // Estadísticas
    getStatistics() {
        const doctors = this.getDoctors();
        const shifts = this.getShifts();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentShifts = shifts.filter(shift => 
            new Date(shift.date) >= thirtyDaysAgo
        );

        return {
            totalDoctors: doctors.length,
            totalShifts: shifts.length,
            shiftsLast30Days: recentShifts.length,
            specialties: [...new Set(doctors.map(d => d.specialty))].length
        };
    }
}

// Instancia global del gestor de almacenamiento
const storage = new StorageManager();