/**
 * PDFGenerator - Genera reportes profesionales en PDF.
 * Requiere jsPDF y jsPDF-autotable (cargados por CDN).
 */

import { getShiftType, toDateLocal } from '../utils.js';

export class PDFGenerator {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    async generateMonthlyReport(year, month, doctorId = null) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const doctors = await this.dataManager.getAll('doctors');
        const shifts = await this.dataManager.getAll('shifts');

        const doctor = doctorId
            ? doctors.find(d => String(d.id).trim() === String(doctorId).trim())
            : null;

        const dateObj = new Date(year, month);
        const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

        let filteredShifts = shifts
            .filter(s => {
                const d = toDateLocal(s.date);
                return d.getFullYear() === year && d.getMonth() === month;
            })
            .sort((a, b) => toDateLocal(a.date) - toDateLocal(b.date));

        if (doctor) {
            filteredShifts = filteredShifts.filter(s => String(s.doctorId).trim() === String(doctor.id).trim());
        }

        const title = doctor
            ? `REPORTE MENSUAL DE GUARDIAS - ${doctor.name.toUpperCase()}`
            : `REPORTE MENSUAL DE GUARDIAS - ${monthName}`;
        this.addHeader(doc, title);

        const personal = !!doctor;
        const tableData = filteredShifts.map(s => {
            const d = doctor || doctors.find(x => String(x.id).trim() === String(s.doctorId).trim());
            const row = [s.date, this.getDayName(s.date)];
            if (!personal) row.push(d ? d.name : 'Desconocido');
            row.push(getShiftType(s.type).label, `${s.startTime} - ${s.endTime}`);
            return row;
        });

        doc.autoTable({
            head: personal ? [['Fecha', 'Día', 'Tipo', 'Horario']] : [['Fecha', 'Día', 'Médico', 'Tipo', 'Horario']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { fontSize: 9 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        this.addSummary(doc, finalY, filteredShifts);

        const filename = doctor
            ? `reporte_${doctor.name.replace(/\s+/g, '_')}_${year}_${month + 1}.pdf`
            : `reporte_uci_${year}_${month + 1}.pdf`;
        doc.save(filename);
        this.notify(`Reporte descargado: ${filename}`);
    }

    async generateDoctorReport(doctorId) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const doctors = await this.dataManager.getAll('doctors');
        const doctor = doctors.find(d => String(d.id).trim() === String(doctorId).trim());
        if (!doctor) return;

        const shifts = await this.dataManager.getAll('shifts');
        const doctorShifts = shifts
            .filter(s => String(s.doctorId).trim() === String(doctorId).trim())
            .sort((a, b) => toDateLocal(b.date) - toDateLocal(a.date));

        this.addHeader(doc, `HISTORIAL DE TURNOS: ${doctor.name.toUpperCase()}`);
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(`Especialidad: ${doctor.specialty}`, 14, 35);
        doc.text(`Email: ${doctor.email}`, 14, 41);
        doc.text(`Total de turnos registrados: ${doctorShifts.length}`, 14, 47);

        const tableData = doctorShifts.map(s => [
            s.date,
            getShiftType(s.type).label,
            `${s.startTime} - ${s.endTime}`,
            s.notes || '-'
        ]);

        doc.autoTable({
            head: [['Fecha', 'Tipo', 'Horario', 'Notas']],
            body: tableData,
            startY: 52,
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 }
        });

        const filename = `reporte_doctor_${doctor.name.replace(/\s+/g, '_')}.pdf`;
        doc.save(filename);
        this.notify(`Reporte descargado: ${filename}`);
    }

    addHeader(doc, title) {
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.text('UCI MEDICAL CENTER', 105, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 105, 30, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.setDrawColor(30, 58, 138);
        doc.line(20, 33, 190, 33);
    }

    addSummary(doc, y, shifts) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Resumen Estadístico', 14, y);

        const total = shifts.length;
        const byType = {};
        shifts.forEach(s => {
            const key = getShiftType(s.type).label;
            byType[key] = (byType[key] || 0) + 1;
        });

        doc.setFontSize(10);
        let line = y + 8;
        doc.text(`Total de turnos: ${total}`, 14, line);
        line += 5;
        Object.entries(byType).forEach(([type, count]) => {
            doc.text(`${type}: ${count}`, 14, line);
            line += 5;
        });
    }

    getDayName(dateStr) {
        const d = toDateLocal(dateStr);
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[d.getDay()];
    }

    async generateCertificate(type, data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        // Encabezado
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('UCI MEDICAL CENTER', pageWidth / 2, 25, { align: 'center' });

        // Título
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(String(type).toUpperCase(), pageWidth / 2, 60, { align: 'center' });

        // Cuerpo
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        let text = '';
        if (type === 'Carta Laboral') {
            text = [
                'A quien corresponda:',
                '',
                `Por medio de la presente, certificamos que el/la Dr/a. ${data.name}, identificado/a con ID ${data.id}, se desempeña como ESPECIALISTA EN ${data.specialty.toUpperCase()} en nuestra institución.`,
                '',
                `El/La Dr/a. ${data.name} presta sus servicios en nuestra Unidad de Cuidados Intensivos, demostrando un alto nivel de profesionalismo y ética médica.`,
                '',
                `Esta certificación se expide a solicitud del interesado/a a los ${now.getDate()} días del mes de ${now.toLocaleDateString('es-ES', { month: 'long' })} del año ${now.getFullYear()}.`,
                '',
                'Atentamente,',
                '',
                '_______________________________',
                'DIRECCIÓN MÉDICA',
                'UCI Medical Center',
                'Tel: +123 456 7890'
            ].join('\n');
        }

        const splitText = doc.splitTextToSize(text, contentWidth);
        doc.text(splitText, margin, 80);

        // Pie de página
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${dateStr}`, margin, 265);
        doc.text('Este documento es una copia digital válida.', margin, 270);

        const filename = `certificado_${String(type).toLowerCase().replace(/\s/g, '_')}_${data.name.replace(/\s/g, '_')}.pdf`;
        doc.save(filename);
        this.notify(`Certificado descargado: ${filename}`);
    }

    notify(msg) {
        if (window.app?.auth) {
            window.app.auth.showNotification(msg, 'success');
        }
    }
}
