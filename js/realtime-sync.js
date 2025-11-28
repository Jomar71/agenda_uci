// js/realtime-sync.js - SINCRONIZACIÓN EN TIEMPO REAL
import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc, 
    updateDoc,
    query,
    orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 🔄 SINCRONIZACIÓN DE MÉDICOS EN TIEMPO REAL
export function setupDoctorsRealtimeSync(callback) {
    console.log('🔄 Iniciando sincronización en tiempo real de médicos...');
    
    const doctorsRef = collection(db, 'doctors');
    const doctorsQuery = query(doctorsRef, orderBy('name'));
    
    return onSnapshot(doctorsQuery, (snapshot) => {
        const doctors = [];
        snapshot.forEach((doc) => {
            doctors.push({ 
                id: doc.id, 
                ...doc.data(),
                firestoreId: doc.id // Mantener ID de Firestore
            });
        });
        
        console.log('🔄 Médicos actualizados en tiempo real:', doctors.length);
        
        // Sincronizar con localStorage como backup
        localStorage.setItem('doctors', JSON.stringify(doctors));
        
        callback(doctors);
    }, (error) => {
        console.error('❌ Error en sincronización de médicos:', error);
    });
}

// 🔄 SINCRONIZACIÓN DE TURNOS EN TIEMPO REAL
export function setupShiftsRealtimeSync(callback) {
    console.log('🔄 Iniciando sincronización en tiempo real de turnos...');
    
    const shiftsRef = collection(db, 'shifts');
    const shiftsQuery = query(shiftsRef, orderBy('date'));
    
    return onSnapshot(shiftsQuery, (snapshot) => {
        const shifts = [];
        snapshot.forEach((doc) => {
            shifts.push({ 
                id: doc.id, 
                ...doc.data(),
                firestoreId: doc.id // Mantener ID de Firestore
            });
        });
        
        console.log('🔄 Turnos actualizados en tiempo real:', shifts.length);
        
        // Sincronizar con localStorage como backup
        localStorage.setItem('shifts', JSON.stringify(shifts));
        
        callback(shifts);
    }, (error) => {
        console.error('❌ Error en sincronización de turnos:', error);
    });
}

// 💾 GUARDAR MÉDICO EN FIRESTORE
export async function saveDoctorToFirestore(doctor) {
    try {
        let doctorRef;
        
        if (doctor.firestoreId) {
            // Actualizar médico existente
            doctorRef = doc(db, 'doctors', doctor.firestoreId);
            await updateDoc(doctorRef, doctor);
            console.log('✅ Médico actualizado en Firestore:', doctor.name);
        } else {
            // Crear nuevo médico
            doctorRef = doc(collection(db, 'doctors'));
            await setDoc(doctorRef, {
                ...doctor,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('✅ Nuevo médico guardado en Firestore:', doctor.name);
        }
        
        return doctorRef.id;
    } catch (error) {
        console.error('❌ Error guardando médico en Firestore:', error);
        throw error;
    }
}

// 💾 GUARDAR TURNO EN FIRESTORE
export async function saveShiftToFirestore(shift) {
    try {
        let shiftRef;
        
        if (shift.firestoreId) {
            // Actualizar turno existente
            shiftRef = doc(db, 'shifts', shift.firestoreId);
            await updateDoc(shiftRef, shift);
            console.log('✅ Turno actualizado en Firestore:', shift.id);
        } else {
            // Crear nuevo turno
            shiftRef = doc(collection(db, 'shifts'));
            await setDoc(shiftRef, {
                ...shift,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('✅ Nuevo turno guardado en Firestore:', shift.id);
        }
        
        return shiftRef.id;
    } catch (error) {
        console.error('❌ Error guardando turno en Firestore:', error);
        throw error;
    }
}

// 🗑️ ELIMINAR MÉDICO DE FIRESTORE
export async function deleteDoctorFromFirestore(doctorId) {
    try {
        const doctorRef = doc(db, 'doctors', doctorId);
        await deleteDoc(doctorRef);
        console.log('✅ Médico eliminado de Firestore:', doctorId);
        return true;
    } catch (error) {
        console.error('❌ Error eliminando médico de Firestore:', error);
        throw error;
    }
}

// 🗑️ ELIMINAR TURNO DE FIRESTORE
export async function deleteShiftFromFirestore(shiftId) {
    try {
        const shiftRef = doc(db, 'shifts', shiftId);
        await deleteDoc(shiftRef);
        console.log('✅ Turno eliminado de Firestore:', shiftId);
        return true;
    } catch (error) {
        console.error('❌ Error eliminando turno de Firestore:', error);
        throw error;
    }
}

// 📥 CARGAR DATOS INICIALES DESDE FIRESTORE
export async function loadInitialData() {
    console.log('📥 Cargando datos iniciales desde Firestore...');
    
    try {
        // Los datos se cargarán automáticamente mediante los listeners en tiempo real
        // Esta función puede usarse para forzar una recarga inicial
        return {
            doctors: JSON.parse(localStorage.getItem('doctors') || '[]'),
            shifts: JSON.parse(localStorage.getItem('shifts') || '[]')
        };
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        return { doctors: [], shifts: [] };
    }
}