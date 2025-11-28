// Gestión de turnos - VERSION CON FIRESTORE Y SINCRONIZACIÓN EN TIEMPO REAL
class ShiftsManager {
    constructor() {
        this.shifts = [];
        this.currentDate = new Date();
        this.currentView = 'month';
        this.firestoreListener = null;
        this.init();
    }

    init() {
        console.log('📅 Inicializando gestor de turnos...');
        this.loadShifts();
        this.setupEventListeners();
        this.setupDataSync();
        this.setupRealtimeSync();
        this.renderCalendar();
    }

    setupEventListeners() {
        console.log('🔧 Configurando eventos de turnos...');
        
        // Navegación del calendario
        const prevBtn = document.getElementById('prev-period');
        const nextBtn = document.getElementById('next-period');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigate(-1));
            console.log('✅ Botón anterior configurado');
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigate(1));
            console.log('✅ Botón siguiente configurado');
        }
        
        // Botones de vista
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                console.log('👁️ Cambiando vista a:', this.currentView);
                this.renderCalendar();
            });
        });
        
        // Botón agregar turno
        const addShiftBtn = document.getElementById('add-shift-btn');
        if (addShiftBtn) {
            addShiftBtn.addEventListener('click', () => this.openShiftModal());
            console.log('✅ Botón agregar turno configurado');
        }
        
        // Formulario de turnos
        const saveShiftBtn = document.getElementById('save-shift-btn');
        const cancelShiftBtn = document.getElementById('cancel-shift-btn');
        const deleteShiftBtn = document.getElementById('delete-shift-btn');
        
        if (saveShiftBtn) {
            saveShiftBtn.addEventListener('click', () => this.saveShift());
            console.log('✅ Botón guardar turno configurado');
        }
        
        if (cancelShiftBtn) {
            cancelShiftBtn.addEventListener('click', () => this.closeShiftModal());
            console.log('✅ Botón cancelar turno configurado');
        }
        
        if (deleteShiftBtn) {
            deleteShiftBtn.addEventListener('click', () => this.deleteShift());
            console.log('✅ Botón eliminar turno configurado');
        }
        
        // Navegación desde admin
        const manageShiftsBtn = document.getElementById('manage-shifts');
        if (manageShiftsBtn) {
            manageShiftsBtn.addEventListener('click', () => {
                document.querySelector('[href="#turnos"]').click();
            });
        }
        
        // Backup de datos
        const backupBtn = document.getElementById('backup-data');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.exportToExcel());
            console.log('✅ Botón backup configurado');
        }
    }

    setupDataSync() {
        console.log('🔄 Configurando sincronización de datos para turnos...');

        // Sincronización con localStorage (cambios en otras pestañas/ventanas)
        window.addEventListener('storage', (e) => {
            if (e.key === 'shifts') {
                console.log('🔄 Cambios detectados en turnos desde otra pestaña');
                this.loadShifts();
                this.renderCalendar();
                // Notificar a otros componentes
                window.dispatchEvent(new CustomEvent('shiftsSynced', {
                    detail: { source: 'storage' }
                }));
            }
        });

        // Sincronización interna con eventos personalizados
        window.addEventListener('dataUpdated', (e) => {
            if (e.detail?.key === 'shifts') {
                console.log('🔄 Actualización interna de turnos detectada');
                this.loadShifts();
                this.renderCalendar();
            }
        });

        // Evento personalizado para forzar actualización
        window.addEventListener('forceRefresh', () => {
            console.log('🔄 Forzando actualización completa de turnos');
            this.loadShifts();
            this.renderCalendar();
        });

        console.log('✅ Sincronización de datos configurada para turnos');
    }

    setupRealtimeSync() {
    console.log('🔥 Configurando sincronización en tiempo real para turnos...');

    // Verificar después de un breve delay
    setTimeout(() => {
        if (window.firebaseService && window.firebaseService.isAvailable) {
            this.firestoreListener = window.firebaseService.listenToCollection('shifts', (changes) => {
                console.log('🔥 Cambios en tiempo real detectados en turnos:', changes.length);
                let needsUpdate = false;

                changes.forEach(change => {
                    if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
                        needsUpdate = true;
                    }
                });

                if (needsUpdate) {
                    this.loadShifts();
                    this.renderCalendar();
                    window.dispatchEvent(new CustomEvent('shiftsRealtimeUpdate', {
                        detail: { changes: changes }
                    }));
                }
            });
            console.log('✅ Sincronización en tiempo real configurada para turnos');
        } else {
            console.log('⚠️ Firebase no disponible, sincronización en tiempo real deshabilitada');
        }
    }, 1000);
}

    loadShifts() {
        console.log('📂 Cargando turnos desde almacenamiento...');

        if (window.firestoreService) {
            // Cargar desde Firestore
            window.firestoreService.getAll('shifts').then(shifts => {
                this.shifts = shifts;
                this.renderCalendar();
                console.log(`✅ ${this.shifts.length} turnos cargados desde Firestore`);
            }).catch(error => {
                console.error('❌ Error cargando turnos desde Firestore:', error);
                // Fallback a localStorage
                this.shifts = this.getShiftsFromLocalStorage();
                this.renderCalendar();
            });
        } else {
            // Fallback a localStorage
            this.shifts = this.getShiftsFromLocalStorage();
            this.renderCalendar();
            console.log(`✅ ${this.shifts.length} turnos cargados desde localStorage`);
        }
    }

    getShiftsFromLocalStorage() {
        try {
            const stored = localStorage.getItem('shifts');
            if (stored) {
                const shifts = JSON.parse(stored);
                console.log('📋 Turnos cargados del localStorage:', shifts.length);
                return shifts;
            }
        } catch (error) {
            console.error('❌ Error cargando turnos:', error);
        }

        // Datos de ejemplo si no hay datos
        console.log('📝 Creando turnos de ejemplo...');
        const today = new Date();
        const sampleShifts = [];

        // Crear algunos turnos de ejemplo para los próximos 7 días
        for (let i = 0; i < 7; i++) {
            const shiftDate = new Date(today);
            shiftDate.setDate(today.getDate() + i);

            const doctorId = (i % 2) + 1; // Alternar entre médico 1 y 2
            const doctor = window.doctorsManager?.getDoctorById(doctorId);

            if (doctor) {
                sampleShifts.push({
                    id: i + 1,
                    doctorId: doctorId,
                    doctorName: doctor.name,
                    date: shiftDate.toISOString().split('T')[0],
                    startTime: '08:00',
                    endTime: '16:00',
                    type: ['guardia', 'consulta', 'emergencia', 'descanso'][i % 4],
                    notes: `Turno ejemplo ${i + 1}`,
                    createdAt: new Date().toISOString()
                });
            }
        }

        // Guardar datos de ejemplo
        this.saveShiftsToLocalStorage(sampleShifts);
        return sampleShifts;
    }

    saveShifts(shiftsToSave = null) {
        const shifts = shiftsToSave || this.shifts;
        try {
            localStorage.setItem('shifts', JSON.stringify(shifts));
            console.log('💾 Turnos guardados en localStorage:', shifts.length);
            return true;
        } catch (error) {
            console.error('❌ Error guardando turnos:', error);
            auth.showNotification('Error al guardar los turnos', 'error');
            return false;
        }
    }

    saveShiftsToLocalStorage(shiftsToSave = null) {
        const shifts = shiftsToSave || this.shifts;
        try {
            localStorage.setItem('shifts', JSON.stringify(shifts));
            console.log('💾 Turnos guardados en localStorage:', shifts.length);
            return true;
        } catch (error) {
            console.error('❌ Error guardando turnos en localStorage:', error);
            return false;
        }
    }

    navigate(direction) {
        console.log('🧭 Navegando calendario:', direction);
        
        switch(this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + direction);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + direction);
                break;
        }
        this.renderCalendar();
    }

    renderCalendar() {
        const container = document.getElementById('calendar-view');
        const period = document.getElementById('current-period');
        
        if (!container) {
            console.error('❌ No se encontró el contenedor del calendario');
            return;
        }

        console.log('🎨 Renderizando calendario vista:', this.currentView);

        let html = '';
        let periodText = '';

        switch(this.currentView) {
            case 'month':
                html = this.renderMonthView();
                periodText = this.currentDate.toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                }).toUpperCase();
                break;
            case 'week':
                html = this.renderWeekView();
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                periodText = `Semana del ${this.formatDate(weekStart)} al ${this.formatDate(weekEnd)}`;
                break;
            case 'day':
                html = this.renderDayView();
                periodText = this.formatDate(this.currentDate);
                break;
        }

        container.innerHTML = html;
        if (period) period.textContent = periodText;
        
        this.attachCalendarEvents();
        console.log('✅ Calendario renderizado correctamente');
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = '<div class="calendar-month">';
        
        // Encabezados
        ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Días
        const current = new Date(startDate);
        while (current <= new Date(lastDay.getTime() + (6 - lastDay.getDay()) * 86400000)) {
            const isOtherMonth = current.getMonth() !== month;
            const isToday = current.toDateString() === new Date().toDateString();
            const dateStr = current.toISOString().split('T')[0];
            const shifts = this.getShiftsByDate(dateStr);
            
            const dayClass = `calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
            
            html += `
                <div class="${dayClass}" data-date="${dateStr}">
                    <div class="day-number">${current.getDate()}</div>
                    <div class="day-shifts">
                        ${shifts.slice(0, 3).map(shift => this.renderShiftItem(shift)).join('')}
                        ${shifts.length > 3 ? 
                            `<div class="more-shifts">+${shifts.length - 3} más</div>` : 
                            ''
                        }
                    </div>
                </div>
            `;
            
            current.setDate(current.getDate() + 1);
        }
        
        html += '</div>';
        return html;
    }

    renderWeekView() {
        const start = this.getWeekStart(this.currentDate);
        
        let html = '<div class="calendar-week">';
        
        for (let i = 0; i < 7; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const dateStr = current.toISOString().split('T')[0];
            const shifts = this.getShiftsByDate(dateStr);
            const isToday = current.toDateString() === new Date().toDateString();
            const dayClass = isToday ? 'calendar-day today' : 'calendar-day';
            
            html += `
                <div class="${dayClass}" data-date="${dateStr}">
                    <div class="day-header">
                        ${current.toLocaleDateString('es-ES', { weekday: 'short' })} 
                        ${current.getDate()}
                    </div>
                    <div class="day-shifts">
                        ${shifts.map(shift => this.renderShiftItem(shift, true)).join('')}
                        ${shifts.length === 0 ? '<div class="no-shifts">Sin turnos</div>' : ''}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    renderDayView() {
        const dateStr = this.currentDate.toISOString().split('T')[0];
        const shifts = this.getShiftsByDate(dateStr);
        
        let html = `
            <div class="calendar-day-detailed">
                <div class="time-slots">
                    ${Array.from({length: 24}, (_, i) => 
                        `<div class="time-slot">${i.toString().padStart(2, '0')}:00</div>`
                    ).join('')}
                </div>
                <div class="shifts-timeline">
                    ${shifts.map(shift => this.renderTimelineShift(shift)).join('')}
                </div>
            </div>
        `;
        
        return html;
    }

    renderShiftItem(shift, detailed = false) {
        if (!auth.canEditShift(shift) && !auth.isAdmin()) {
            return ''; // No mostrar turnos que no puede editar
        }

        const shortName = shift.doctorName.split(' ')[0];
        
        return `
            <div class="shift-item ${shift.type}" 
                 data-id="${shift.id}"
                 title="${shift.doctorName} - ${shift.type} (${shift.startTime}-${shift.endTime})">
                ${detailed ? `
                    <strong>${shortName}</strong><br>
                    ${shift.type}<br>
                    ${shift.startTime}
                ` : `
                    ${shortName} - ${shift.startTime.split(':')[0]}h
                `}
            </div>
        `;
    }

    renderTimelineShift(shift) {
        if (!auth.canEditShift(shift) && !auth.isAdmin()) {
            return ''; // No mostrar turnos que no puede editar
        }

        const start = parseInt(shift.startTime.split(':')[0]);
        const end = parseInt(shift.endTime.split(':')[0]);
        const startMinutes = parseInt(shift.startTime.split(':')[1]) || 0;
        const endMinutes = parseInt(shift.endTime.split(':')[1]) || 0;
        
        const top = ((start * 60 + startMinutes) / 1440) * 100;
        const height = (((end * 60 + endMinutes) - (start * 60 + startMinutes)) / 1440) * 100;

        return `
            <div class="timeline-shift ${shift.type}" 
                 data-id="${shift.id}"
                 style="top: ${top}%; height: ${height}%;"
                 title="${shift.doctorName} - ${shift.type} (${shift.startTime}-${shift.endTime})">
                <div class="shift-content">
                    <strong>${shift.doctorName.split(' ')[0]}</strong><br>
                    ${shift.type}<br>
                    ${shift.startTime} - ${shift.endTime}
                </div>
            </div>
        `;
    }

    attachCalendarEvents() {
        console.log('🔗 Adjuntando eventos al calendario...');
        
        // Click en días para crear turnos (solo usuarios logueados)
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', (e) => {
                if (!e.target.classList.contains('shift-item') && 
                    !e.target.closest('.shift-item')) {
                    
                    const date = day.dataset.date;
                    if (date && auth.isLoggedIn) {
                        console.log('📅 Creando turno para fecha:', date);
                        this.openShiftModal(null, date);
                    } else if (!auth.isLoggedIn) {
                        auth.showNotification('Debe iniciar sesión para crear turnos', 'warning');
                    }
                }
            });
        });

        // Click en turnos existentes para editarlos
        document.querySelectorAll('.shift-item, .timeline-shift').forEach(shift => {
            shift.addEventListener('click', (e) => {
                e.stopPropagation();
                const shiftId = parseInt(shift.dataset.id);
                const shiftData = this.getShiftById(shiftId);
                
                if (shiftId && shiftData && auth.canEditShift(shiftData)) {
                    console.log('✏️ Editando turno:', shiftId);
                    this.openShiftModal(shiftId);
                } else if (!auth.isLoggedIn) {
                    auth.showNotification('Debe iniciar sesión para editar turnos', 'warning');
                } else if (!auth.canEditShift(shiftData)) {
                    auth.showNotification('No tiene permisos para editar este turno', 'error');
                }
            });
        });
        
        console.log('✅ Eventos del calendario configurados');
    }

    openShiftModal(shiftId = null, date = null) {
        if (!auth.isLoggedIn) {
            auth.showNotification('Debe iniciar sesión para gestionar turnos', 'error');
            return;
        }

        const modal = document.getElementById('shift-modal');
        const title = document.getElementById('shift-modal-title');
        const deleteBtn = document.getElementById('delete-shift-btn');
        
        if (!modal || !title) {
            console.error('❌ No se encontró el modal de turnos');
            return;
        }

        this.populateDoctorsSelect();

        if (shiftId) {
            // Editar turno existente
            const shift = this.getShiftById(shiftId);
            if (shift) {
                if (!auth.canEditShift(shift)) {
                    auth.showNotification('No tiene permisos para editar este turno', 'error');
                    return;
                }
                
                title.textContent = 'Editar Turno';
                this.fillShiftForm(shift);
                if (deleteBtn && auth.isAdmin()) {
                    deleteBtn.style.display = 'inline-block';
                }
                console.log('📝 Abriendo modal para editar turno:', shiftId);
            }
        } else {
            // Nuevo turno
            title.textContent = 'Nuevo Turno';
            this.clearShiftForm(date);
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
            }
            console.log('🆕 Abriendo modal para nuevo turno');
        }

        modal.style.display = 'block';
    }

    closeShiftModal() {
        const modal = document.getElementById('shift-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        console.log('📭 Modal de turno cerrado');
    }

    populateDoctorsSelect() {
        const select = document.getElementById('shift-doctor');
        if (!select) return;

        const doctors = window.doctorsManager?.getDoctors() || [];
        select.innerHTML = '<option value="">Seleccionar médico</option>';
        
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = `${doctor.name} - ${doctor.specialty}`;
            select.appendChild(option);
        });
        
        console.log('✅ Selector de médicos poblado:', doctors.length, 'médicos');
    }

    fillShiftForm(shift) {
        document.getElementById('shift-id').value = shift.id;
        document.getElementById('shift-doctor').value = shift.doctorId;
        document.getElementById('shift-date').value = shift.date;
        document.getElementById('shift-type').value = shift.type;
        document.getElementById('shift-start').value = shift.startTime;
        document.getElementById('shift-end').value = shift.endTime;
        document.getElementById('shift-notes').value = shift.notes || '';
    }

    clearShiftForm(date = null) {
        document.getElementById('shift-form').reset();
        document.getElementById('shift-id').value = '';
        
        // Valores por defecto
        if (date) {
            document.getElementById('shift-date').value = date;
        } else {
            document.getElementById('shift-date').value = new Date().toISOString().split('T')[0];
        }
        
        document.getElementById('shift-start').value = '08:00';
        document.getElementById('shift-end').value = '16:00';
    }

    saveShift() {
        console.log('💾 Intentando guardar turno...');
        const formData = this.getShiftFormData();

        if (!this.validateShift(formData)) {
            console.error('❌ Validación de turno falló');
            return;
        }

        const shiftData = {
            doctorId: parseInt(formData.doctorId),
            date: formData.date,
            type: formData.type,
            startTime: formData.startTime,
            endTime: formData.endTime,
            notes: formData.notes
        };

        // Obtener nombre del médico
        const doctor = window.doctorsManager?.getDoctorById(shiftData.doctorId);
        if (doctor) {
            shiftData.doctorName = doctor.name;
        } else {
            auth.showNotification('Médico no encontrado', 'error');
            return;
        }

        let successMessage = '';

        if (formData.id) {
            // Editar turno existente
            const shift = this.getShiftById(parseInt(formData.id));
            if (!shift) {
                auth.showNotification('Turno no encontrado', 'error');
                return;
            }

            if (!auth.canEditShift(shift)) {
                auth.showNotification('No tiene permisos para editar este turno', 'error');
                return;
            }

            shiftData.id = parseInt(formData.id);
            shiftData.createdAt = shift.createdAt;

            const index = this.shifts.findIndex(s => s.id === shiftData.id);
            if (index !== -1) {
                this.shifts[index] = shiftData;
                successMessage = 'Turno actualizado correctamente';
                console.log('✅ Turno actualizado:', shiftData.id);
            }
        } else {
            // Nuevo turno
            shiftData.id = this.generateShiftId();
            shiftData.createdAt = new Date().toISOString();
            this.shifts.push(shiftData);
            successMessage = 'Turno creado correctamente';
            console.log('✅ Nuevo turno creado:', shiftData.id);
        }

        // Guardar en Firestore si está disponible
        if (window.firestoreService) {
            window.firestoreService.save('shifts', shiftData.id, shiftData).then(() => {
                console.log('🔥 Turno guardado en Firestore');
                this.loadShifts();
                this.closeShiftModal();
                auth.showNotification(successMessage, 'success');

                // Forzar actualización inmediata en todos los componentes
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('forceRefresh'));
                }, 100);

                // Notificar actualización de datos con más detalle
                window.dispatchEvent(new CustomEvent('dataUpdated', {
                    detail: {
                        key: 'shifts',
                        action: formData.id ? 'update' : 'create',
                        id: shiftData.id,
                        timestamp: Date.now()
                    }
                }));

                return true;
            }).catch(error => {
                console.error('❌ Error guardando en Firestore:', error);
                // Fallback a localStorage
                if (this.saveShiftsToLocalStorage()) {
                    this.loadShifts();
                    this.closeShiftModal();
                    auth.showNotification(successMessage, 'success');
                    return true;
                } else {
                    auth.showNotification('Error al guardar los cambios', 'error');
                    return false;
                }
            });
        } else {
            // Fallback a localStorage
            if (this.saveShiftsToLocalStorage()) {
                this.loadShifts();
                this.closeShiftModal();
                auth.showNotification(successMessage, 'success');
                return true;
            } else {
                auth.showNotification('Error al guardar los cambios', 'error');
                return false;
            }
        }
    }

    getShiftFormData() {
        return {
            id: document.getElementById('shift-id').value,
            doctorId: document.getElementById('shift-doctor').value,
            date: document.getElementById('shift-date').value,
            type: document.getElementById('shift-type').value,
            startTime: document.getElementById('shift-start').value,
            endTime: document.getElementById('shift-end').value,
            notes: document.getElementById('shift-notes').value
        };
    }

    validateShift(data) {
        console.log('🔍 Validando turno...', data);
        
        // Validar campos requeridos
        const requiredFields = ['doctorId', 'date', 'type', 'startTime', 'endTime'];
        for (const field of requiredFields) {
            if (!data[field]) {
                auth.showNotification(`El campo ${field} es requerido`, 'error');
                return false;
            }
        }

        // Validar que la hora de fin sea posterior a la de inicio
        if (data.startTime >= data.endTime) {
            auth.showNotification('La hora de fin debe ser posterior a la hora de inicio', 'error');
            return false;
        }

        // Verificar conflictos de horario (solo para el mismo médico en la misma fecha)
        const shiftDate = new Date(data.date);
        const existingShifts = this.shifts.filter(shift => {
            if (data.id && shift.id === parseInt(data.id)) return false; // Excluir el turno actual
            if (shift.doctorId !== parseInt(data.doctorId)) return false;
            
            const existingDate = new Date(shift.date);
            return existingDate.toDateString() === shiftDate.toDateString();
        });

        for (const existingShift of existingShifts) {
            if (this.isTimeOverlap(data.startTime, data.endTime, existingShift.startTime, existingShift.endTime)) {
                auth.showNotification(
                    `Conflicto de horario: El médico ya tiene un turno de ${existingShift.startTime} a ${existingShift.endTime}`,
                    'error'
                );
                return false;
            }
        }

        console.log('✅ Validación de turno exitosa');
        return true;
    }

    isTimeOverlap(start1, end1, start2, end2) {
        return (start1 < end2 && end1 > start2);
    }

    deleteShift() {
        if (!auth.isAdmin()) {
            auth.showNotification('Solo los administradores pueden eliminar turnos', 'error');
            return;
        }

        const shiftId = document.getElementById('shift-id').value;
        if (!shiftId) {
            console.error('❌ ID de turno no válido para eliminar');
            return;
        }

        const shift = this.getShiftById(parseInt(shiftId));
        if (!shift) {
            auth.showNotification('Turno no encontrado', 'error');
            return;
        }

        if (confirm(`¿Estás seguro de eliminar el turno del ${this.formatDate(new Date(shift.date))}?`)) {
            // Eliminar de Firestore si está disponible
            if (window.firestoreService) {
                window.firestoreService.delete('shifts', parseInt(shiftId)).then(() => {
                    console.log('🔥 Turno eliminado de Firestore');
                    // Eliminar de array local
                    this.shifts = this.shifts.filter(s => s.id !== parseInt(shiftId));

                    this.loadShifts();
                    this.closeShiftModal();
                    auth.showNotification('Turno eliminado correctamente', 'success');

                    // Forzar actualización inmediata en todos los componentes
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('forceRefresh'));
                    }, 100);

                    // Notificar eliminación de datos con más detalle
                    window.dispatchEvent(new CustomEvent('dataUpdated', {
                        detail: {
                            key: 'shifts',
                            action: 'delete',
                            id: parseInt(shiftId),
                            timestamp: Date.now()
                        }
                    }));

                    console.log('✅ Turno eliminado:', shiftId);
                }).catch(error => {
                    console.error('❌ Error eliminando de Firestore:', error);
                    // Fallback a localStorage
                    this.shifts = this.shifts.filter(s => s.id !== parseInt(shiftId));
                    if (this.saveShiftsToLocalStorage()) {
                        this.loadShifts();
                        this.closeShiftModal();
                        auth.showNotification('Turno eliminado correctamente', 'success');
                    } else {
                        auth.showNotification('Error al eliminar el turno', 'error');
                    }
                });
            } else {
                // Fallback a localStorage
                this.shifts = this.shifts.filter(s => s.id !== parseInt(shiftId));
                if (this.saveShiftsToLocalStorage()) {
                    this.loadShifts();
                    this.closeShiftModal();
                    auth.showNotification('Turno eliminado correctamente', 'success');
                } else {
                    auth.showNotification('Error al eliminar el turno', 'error');
                }
            }
        }
    }

    getWeekStart(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        return new Date(start.setDate(diff));
    }

    formatDate(date) {
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    generateShiftId() {
        const maxId = this.shifts.reduce((max, shift) => Math.max(max, shift.id), 0);
        return maxId + 1;
    }

    getShifts() {
        return this.shifts;
    }

    getShiftById(id) {
        return this.shifts.find(shift => shift.id === id);
    }

    getShiftsByDate(date) {
        return this.shifts.filter(shift => shift.date === date);
    }

    getShiftsByDoctor(doctorId) {
        return this.shifts.filter(shift => shift.doctorId === doctorId);
    }

    getShiftsByDateRange(startDate, endDate) {
        return this.shifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            return shiftDate >= startDate && shiftDate <= endDate;
        });
    }

    // Método para calcular horas trabajadas
    calculateHours(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        // Si el turno cruza la medianoche, ajustar
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        
        const diffMs = end - start;
        return diffMs / (1000 * 60 * 60); // Convertir a horas
    }

    // Método para generar reporte de horas
    generateHoursReport(startDate, endDate) {
        console.log('📊 Generando reporte de horas...');
        const doctors = window.doctorsManager?.getDoctors() || [];
        const report = {
            period: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
            doctors: [],
            totals: {
                daily: 0,
                weekly: 0,
                monthly: 0,
                sunday: 0,
                holiday: 0,
                total: 0
            }
        };
        
        doctors.forEach(doctor => {
            const doctorShifts = this.shifts.filter(shift => 
                shift.doctorId === doctor.id && 
                new Date(shift.date) >= startDate && 
                new Date(shift.date) <= endDate
            );
            
            const doctorReport = {
                id: doctor.id,
                name: doctor.name,
                specialty: doctor.specialty,
                hours: {
                    daily: 0,
                    weekly: 0,
                    monthly: 0,
                    sunday: 0,
                    holiday: 0,
                    total: 0
                },
                shifts: doctorShifts.length
            };
            
            doctorShifts.forEach(shift => {
                const hours = this.calculateHours(shift.startTime, shift.endTime);
                const shiftDate = new Date(shift.date);
                const dayOfWeek = shiftDate.getDay();
                
                // Clasificar las horas
                doctorReport.hours.total += hours;
                doctorReport.hours.daily += hours;
                
                // Horas dominicales
                if (dayOfWeek === 0) {
                    doctorReport.hours.sunday += hours;
                }
                
                // Aquí podrías agregar lógica para identificar festivos
                // Por ahora, asumimos que no hay festivos en el ejemplo
            });
            
            // Calcular promedios semanales y mensuales
            const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const weeksInPeriod = Math.ceil(daysInPeriod / 7);
            const monthsInPeriod = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  (endDate.getMonth() - startDate.getMonth()) + 1;
            
            doctorReport.hours.weekly = doctorReport.hours.total / Math.max(weeksInPeriod, 1);
            doctorReport.hours.monthly = doctorReport.hours.total / Math.max(monthsInPeriod, 1);
            
            report.doctors.push(doctorReport);
            
            // Acumular totales
            report.totals.daily += doctorReport.hours.daily;
            report.totals.weekly += doctorReport.hours.weekly;
            report.totals.monthly += doctorReport.hours.monthly;
            report.totals.sunday += doctorReport.hours.sunday;
            report.totals.holiday += doctorReport.hours.holiday;
            report.totals.total += doctorReport.hours.total;
        });
        
        console.log('✅ Reporte generado:', report.doctors.length, 'médicos');
        return report;
    }

    // Método para exportar a Excel - CORREGIDO
    exportToExcel() {
        if (!auth.isAdmin()) {
            auth.showNotification('Solo los administradores pueden descargar backups', 'error');
            return;
        }

        console.log('📥 Iniciando descarga de backup...');
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const report = this.generateHoursReport(startDate, endDate);
        
        // Crear contenido CSV (compatible con Excel)
        let csvContent = "REPORTE DE HORAS MÉDICAS\n\n";
        csvContent += `Período: ${report.period}\n`;
        csvContent += `Generado: ${new Date().toLocaleDateString('es-ES')}\n\n`;
        
        // Encabezados
        csvContent += "Médico,Especialidad,Horas Diarias,Horas Semanales,Horas Mensuales,Horas Dominicales,Horas Festivas,Total Horas,Cantidad Turnos\n";
        
        // Datos de cada médico
        report.doctors.forEach(doctor => {
            csvContent += `"${doctor.name}","${doctor.specialty}",${doctor.hours.daily.toFixed(2)},${doctor.hours.weekly.toFixed(2)},${doctor.hours.monthly.toFixed(2)},${doctor.hours.sunday.toFixed(2)},${doctor.hours.holiday.toFixed(2)},${doctor.hours.total.toFixed(2)},${doctor.shifts}\n`;
        });
        
        // Totales
        csvContent += `\n"TOTALES","",${report.totals.daily.toFixed(2)},${report.totals.weekly.toFixed(2)},${report.totals.monthly.toFixed(2)},${report.totals.sunday.toFixed(2)},${report.totals.holiday.toFixed(2)},${report.totals.total.toFixed(2)},\n`;
        
        // Crear y descargar archivo - CORREGIDO
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `reporte_horas_medicas_${now.toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('✅ Backup descargado correctamente');
            auth.showNotification('Reporte descargado correctamente en formato Excel', 'success');
        } catch (error) {
            console.error('❌ Error al descargar backup:', error);
            auth.showNotification('Error al descargar el reporte', 'error');
        }
    }
}

// Instancia global
const shiftsManager = new ShiftsManager();