// Gestión de médicos CON FIREBASE - VERSION MEJORADA
class DoctorsManager {
    constructor() {
        this.doctors = [];
        this.currentPhoto = null;
        this.firestoreListener = null;
        this.init();
    }

    async init() {
        console.log('👨‍⚕️ Inicializando gestor de médicos con Firebase...');
        this.setupEventListeners();
        await this.setupRealtimeSync();
        await this.loadDoctors();
        console.log('✅ DoctorsManager con Firebase inicializado');
    }

async setupRealtimeSync() {
    console.log('🔥 Configurando sincronización en tiempo real para médicos...');

    // Esperar a que Firebase Service esté listo
    const maxWaitTime = 5000; // 5 segundos máximo
    const startTime = Date.now();
    
    while (!window.firebaseService || !window.firebaseService.isAvailable) {
        if (Date.now() - startTime > maxWaitTime) {
            console.warn('⏰ Timeout esperando Firebase Service');
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (window.firebaseService && window.firebaseService.isAvailable) {
        this.firestoreListener = window.firebaseService.listenToCollection('doctors', (changes) => {
            console.log('🔥 Cambios en tiempo real detectados en médicos:', changes.length);
            let needsUpdate = false;

            changes.forEach(change => {
                if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
                    needsUpdate = true;
                }
            });

            if (needsUpdate) {
                this.loadDoctors();
                window.dispatchEvent(new CustomEvent('doctorsRealtimeUpdate', {
                    detail: { changes: changes }
                }));
            }
        });
        console.log('✅ Sincronización en tiempo real configurada para médicos');
    } else {
        console.log('⚠️ Firebase no disponible, sincronización en tiempo real deshabilitada');
    }
}
    async loadDoctors() {
        console.log('📂 Cargando médicos...');

        if (window.firebaseService) {
            try {
                this.doctors = await window.firebaseService.getAll('doctors');
                console.log(`✅ ${this.doctors.length} médicos cargados desde Firebase`);
            } catch (error) {
                console.error('❌ Error cargando médicos desde Firebase, usando localStorage:', error);
                this.doctors = this.getDoctorsFromStorage();
            }
        } else {
            this.doctors = this.getDoctorsFromStorage();
        }

        this.updateSpecialtyFilter();
        this.renderDoctors();
        this.updateStats();
    }

    async saveDoctor(doctorData) {
        console.log('💾 Guardando médico...', doctorData);

        try {
            let doctorId = doctorData.id;

            if (window.firebaseService) {
                // Guardar en Firebase
                const firebaseData = { ...doctorData };
                delete firebaseData.id; // Firebase maneja los IDs automáticamente

                if (doctorId) {
                    // Actualizar médico existente
                    await window.firebaseService.save('doctors', doctorId.toString(), firebaseData);
                } else {
                    // Crear nuevo médico
                    doctorId = await window.firebaseService.save('doctors', null, firebaseData);
                }
                
                console.log('✅ Médico guardado en Firebase');
            } else {
                // Fallback a localStorage
                if (doctorId) {
                    const index = this.doctors.findIndex(d => d.id === doctorId);
                    if (index !== -1) {
                        this.doctors[index] = doctorData;
                    }
                } else {
                    doctorData.id = this.generateDoctorId();
                    this.doctors.push(doctorData);
                }
                this.saveDoctorsToStorage();
            }

            return doctorId;
        } catch (error) {
            console.error('❌ Error guardando médico:', error);
            throw error;
        }
    }

    async deleteDoctor(id) {
        if (!window.auth?.isAdmin()) {
            window.auth?.showNotification('No tiene permisos para eliminar médicos', 'error');
            return;
        }

        const doctor = this.doctors.find(d => d.id === id);
        if (!doctor) {
            console.error('❌ Médico no encontrado para eliminar:', id);
            return;
        }

        if (confirm(`¿Estás seguro de eliminar al Dr. ${doctor.name}?`)) {
            try {
                if (window.firebaseService) {
                    await window.firebaseService.delete('doctors', id.toString());
                    console.log('✅ Médico eliminado de Firebase');
                } else {
                    this.doctors = this.doctors.filter(d => d.id !== id);
                    this.saveDoctorsToStorage();
                }

                // Eliminar turnos del médico
                await this.deleteDoctorShifts(id);

                this.loadDoctors();
                window.auth?.showNotification('Médico eliminado correctamente', 'success');

            } catch (error) {
                console.error('❌ Error eliminando médico:', error);
                window.auth?.showNotification('Error al eliminar el médico', 'error');
            }
        }
    }

    async deleteDoctorShifts(doctorId) {
        if (window.firebaseService) {
            try {
                // Buscar y eliminar turnos del médico en Firebase
                const shifts = await window.firebaseService.query('shifts', 'doctorId', '==', doctorId);
                for (const shift of shifts) {
                    await window.firebaseService.delete('shifts', shift.id);
                }
                console.log(`✅ ${shifts.length} turnos eliminados del médico ${doctorId}`);
            } catch (error) {
                console.error('❌ Error eliminando turnos del médico:', error);
            }
        } else {
            // Eliminar de localStorage
            const shifts = window.shiftsManager?.getShifts() || [];
            const updatedShifts = shifts.filter(shift => shift.doctorId !== doctorId);
            window.shiftsManager?.saveShifts(updatedShifts);
        }
    }

    // Los demás métodos permanecen iguales pero usarán Firebase automáticamente
    getDoctorsFromStorage() {
        try {
            const stored = localStorage.getItem('doctors');
            if (stored) {
                const doctors = JSON.parse(stored);
                console.log('📋 Médicos cargados del localStorage:', doctors.length);
                return doctors;
            }
        } catch (error) {
            console.error('❌ Error cargando médicos:', error);
        }
        
        // Datos de ejemplo
        console.log('📝 Creando datos de ejemplo...');
        const sampleDoctors = [
            {
                id: 1,
                name: 'Dr. Carlos Rodríguez',
                specialty: 'Cardiología',
                email: 'c.rodriguez@uci.com',
                phone: '+34 600 111 222',
                username: 'crodriguez',
                password: 'doctor123',
                photo: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 2,
                name: 'Dra. María López',
                specialty: 'Neurología',
                email: 'm.lopez@uci.com',
                phone: '+34 600 333 444',
                username: 'mlopez',
                password: 'doctor123',
                photo: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        this.saveDoctorsToStorage(sampleDoctors);
        return sampleDoctors;
    }

    saveDoctorsToStorage(doctorsToSave = null) {
        const doctors = doctorsToSave || this.doctors;
        try {
            localStorage.setItem('doctors', JSON.stringify(doctors));
            console.log('💾 Médicos guardados en localStorage:', doctors.length);
            return true;
        } catch (error) {
            console.error('❌ Error guardando médicos:', error);
            return false;
        }
    }

    // Los métodos renderDoctors, createDoctorCard, etc. permanecen iguales
    // ... (mantener todo el código existente de renderizado)
}

// Instancia global MODIFICADA
const doctorsManager = new DoctorsManager();
window.doctorsManager = doctorsManager;