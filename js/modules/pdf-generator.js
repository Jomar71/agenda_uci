
/**
 * PDF Generator Module
 * Uses jsPDF and autoTable to generate professional reports
 */

export class PDFGenerator {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    async generateMonthlyReport(year, month) {
        // Init jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Fetch Data
        const doctors = await this.dataManager.getAll('doctors');
        const shifts = await this.dataManager.getAll('shifts');

        // Filter info
        const dateObj = new Date(year, month);
        const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

        const filteredShifts = shifts.filter(s => {
            const d = new Date(s.date);
            return d.getFullYear() === year && d.getMonth() === month;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Header
        this.addHeader(doc, `REPORTE MENSUAL DE GUARDIAS - ${monthName}`);

        // Content
        const tableData = filteredShifts.map(s => {
            const doctor = doctors.find(d => d.id.toString().trim() === s.doctorId.toString().trim());
            return [
                s.date,
                this.getDayName(s.date),
                doctor ? doctor.name : 'Desconocido',
                s.type.toUpperCase(),
                `${s.startTime} - ${s.endTime}`
            ];
        });

        doc.autoTable({
            head: [['Fecha', 'Día', 'Médico', 'Tipo', 'Horario']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [52, 152, 219] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });


        // Summary Statistics
        const finalY = doc.lastAutoTable.finalY + 10;
        this.addSummary(doc, finalY, filteredShifts);

        // Save
        const filename = `reporte_uci_${year}_${month + 1}.pdf`;
        doc.save(filename);

        if (window.app && window.app.auth) {
            window.app.auth.showNotification(`Reporte descargado: ${filename}`, 'success');
        }
    }

    async generateDoctorReport(doctorId) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const doctors = await this.dataManager.getAll('doctors');
        const doctor = doctors.find(d => d.id.toString().trim() === doctorId.toString().trim());

        if (!doctor) return;

        const shifts = await this.dataManager.getAll('shifts');
        const doctorShifts = shifts
            .filter(s => s.doctorId.toString().trim() === doctorId.toString().trim())
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        this.addHeader(doc, `HISTORIAL DE TURNOS: ${doctor.name.toUpperCase()}`);
        doc.text(`Especialidad: ${doctor.specialty}`, 14, 35);
        doc.text(`Email: ${doctor.email}`, 14, 42);

        const tableData = doctorShifts.map(s => [
            s.date,
            s.type.toUpperCase(),
            `${s.startTime} - ${s.endTime}`,
            s.notes || '-'
        ]);

        doc.autoTable({
            head: [['Fecha', 'Tipo', 'Horario', 'Notas']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [46, 204, 113] }
        });

        doc.save(`reporte_doctor_${doctor.name.replace(/\s+/g, '_')}.pdf`);
    }

    addHeader(doc, title) {
        doc.setFontSize(22);
        doc.setTextColor(44, 62, 80);
        doc.text("UCI MEDICAL CENTER", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(title, 105, 30, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(20, 32, 190, 32);
    }

    addSummary(doc, y, shifts) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Resumen Estadístico", 14, y);

        const total = shifts.length;
        const guardias = shifts.filter(s => s.type === 'guardia').length;

        doc.setFontSize(10);
        doc.text(`Total Turnos: ${total}`, 14, y + 10);
        doc.text(`Guardias: ${guardias}`, 14, y + 15);
        doc.text(`Consultas: ${shifts.filter(s => s.type === 'consulta').length}`, 14, y + 20);
    }

    getDayName(dateStr) {
        const d = new Date(dateStr);
        // Correct timezone offset manually if needed, or just use UTC functions if storing simpler dates
        // For simplicity assuming local
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[d.getDay()];
    }

    async generateCertificate(type, data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Settings
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        // Header (Logo placeholder)
        doc.setFillColor(30, 58, 138); // Primary Color
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("UCI MEDICAL CENTER", pageWidth / 2, 25, { align: "center" });

        // Title
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(type.toUpperCase(), pageWidth / 2, 60, { align: "center" });

        // Body Content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        let text = "";

        if (type === 'Carta Laboral') {
            text = `
A quien corresponda:

Por medio de la presente, certificamos que el/la Dr/a. ${data.name}, identificado/a con ID ${data.id}, se desempeña como ESPECIALISTA EN ${data.specialty.toUpperCase()} en nuestra institución.

El/La Dr/a. ${data.name} presta sus servicios en nuestra Unidad de Cuidados Intensivos, demostrando un alto nivel de profesionalismo y ética médica.

Esta certificación se expide a solicitud del interesado/a a los ${new Date().getDate()} días del mes de ${new Date().toLocaleDateString('es-ES', { month: 'long' })} del año ${new Date().getFullYear()}.

Atentamente,

_____________________________
DIRECCIÓN MÉDICA
UCI Medical Center
Tel: +123 456 7890
`;
        }

        // Split text to fit width
        const splitText = doc.splitTextToSize(text, contentWidth);
        doc.text(splitText, margin, 80);

        // Footer
        const dateY = 250;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${dateStr}`, margin, dateY);
        doc.text("Este documento es una copia digital válida.", margin, dateY + 5);

        // Save
        const filename = `certificado_${type.toLowerCase().replace(/\s/g, '_')}_${data.name.replace(/\s/g, '_')}.pdf`;
        doc.save(filename);

        if (window.app && window.app.auth) {
            window.app.auth.showNotification(`Certificado descargado: ${filename}`, 'success');
        }
    }
}
