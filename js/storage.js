// Utilidades de almacenamiento y datos

// Función para inicializar datos de ejemplo si es necesario
function initializeSampleData() {
    // Verificar si ya existen datos
    if (!localStorage.getItem('doctors')) {
        const sampleDoctors = [
            {
                id: 1,
                name: 'Dr. Juan Pérez',
                specialty: 'Cardiología',
                email: 'juan.perez@hospital.com',
                phone: '+1234567890',
                username: 'jperez',
                password: 'medico123',
                photo: null
            },
            {
                id: 2,
                name: 'Dra. María García',
                specialty: 'Neurología',
                email: 'maria.garcia@hospital.com',
                phone: '+1234567891',
                username: 'mgarcia',
                password: 'medico123',
                photo: null
            },
            {
                id: 3,
                name: 'Dr. Carlos López',
                specialty: 'Pediatría',
                email: 'carlos.lopez@hospital.com',
                phone: '+1234567892',
                username: 'clopez',
                password: 'medico123',
                photo: null
            }
        ];
        localStorage.setItem('doctors', JSON.stringify(sampleDoctors));
    }
    
    if (!localStorage.getItem('shifts')) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const sampleShifts = [
            {
                id: 1,
                doctorId: 1,
                doctorName: 'Dr. Juan Pérez',
                date: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
                startTime: '08:00',
                endTime: '16:00',
                type: 'guardia',
                notes: 'Turno de guardia regular'
            },
            {
                id: 2,
                doctorId: 2,
                doctorName: 'Dra. María García',
                date: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
                startTime: '16:00',
                endTime: '00:00',
                type: 'consulta',
                notes: 'Consultas programadas'
            },
            {
                id: 3,
                doctorId: 3,
                doctorName: 'Dr. Carlos López',
                date: new Date(currentYear, currentMonth, 2).toISOString().split('T')[0],
                startTime: '00:00',
                endTime: '08:00',
                type: 'emergencia',
                notes: 'Turno de emergencia'
            }
        ];
        localStorage.setItem('shifts', JSON.stringify(sampleShifts));
    }
}

// Función para limpiar todos los datos (solo para desarrollo)
function clearAllData() {
    if (confirm('¿Estás seguro de que deseas eliminar todos los datos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('doctors');
        localStorage.removeItem('shifts');
        localStorage.removeItem('currentUser');
        showNotification('Todos los datos han sido eliminados', 'info');
        setTimeout(() => {
            location.reload();
        }, 2000);
    }
}

// Función para hacer backup completo de la base de datos
function backupAllData() {
    const backup = {
        timestamp: new Date().toISOString(),
        doctors: JSON.parse(localStorage.getItem('doctors') || '[]'),
        shifts: JSON.parse(localStorage.getItem('shifts') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Backup completo descargado', 'success');
}

// Función para restaurar datos desde backup
function restoreFromBackup(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            if (backup.doctors && backup.shifts) {
                if (confirm('¿Estás seguro de que deseas restaurar este backup? Se sobrescribirán todos los datos actuales.')) {
                    localStorage.setItem('doctors', JSON.stringify(backup.doctors));
                    localStorage.setItem('shifts', JSON.stringify(backup.shifts));
                    showNotification('Backup restaurado correctamente', 'success');
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                }
            } else {
                showNotification('El archivo de backup no es válido', 'error');
            }
        } catch (error) {
            showNotification('Error al leer el archivo de backup', 'error');
        }
    };
    reader.readAsText(file);
}

// Inicializar datos de ejemplo al cargar (solo si no hay datos)
document.addEventListener('DOMContentLoaded', function() {
    initializeSampleData();
});

// Exportar funciones para uso global
window.clearAllData = clearAllData;
window.backupAllData = backupAllData;
window.restoreFromBackup = restoreFromBackup;