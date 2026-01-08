
import { PDFGenerator } from './pdf-generator.js';
import { dataManager } from '../services/data-manager.js';

export class ReportsController {
    constructor() {
        this.generator = new PDFGenerator(dataManager);
        this.init();
    }

    init() {
        // Handled by app.js
    }

    showReportModal() {
        // Dynamically create a modal for report selection
        let modal = document.getElementById('report-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'report-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content animate__animated animate__fadeInDown">
                    <span class="close">&times;</span>
                    <h2>Generador de Documentos</h2>
                    <div style="margin-top: 20px; display: grid; gap: 15px;">
                        <button class="btn btn-primary" id="rep-monthly" style="width:100%; justify-content: flex-start;">
                            <i class="fas fa-calendar-alt"></i> Reporte Mensual de Guardias
                        </button>
                        <button class="btn btn-secondary" id="rep-doctor" style="width:100%; justify-content: flex-start;">
                            <i class="fas fa-user-md"></i> Historial por Médico
                        </button>
                         <button class="btn btn-secondary" id="cert-laboral" style="width:100%; justify-content: flex-start;">
                            <i class="fas fa-file-contract"></i> Certificado Laboral
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Close event
            modal.querySelector('.close').addEventListener('click', () => modal.style.display = 'none');

            // Events
            modal.querySelector('#rep-monthly').addEventListener('click', () => {
                const date = new Date();
                this.generator.generateMonthlyReport(date.getFullYear(), date.getMonth());
                modal.style.display = 'none';
            });

            modal.querySelector('#rep-doctor').addEventListener('click', () => this.handleDoctorSelection('report'));
            modal.querySelector('#cert-laboral').addEventListener('click', () => this.handleDoctorSelection('certificate'));
        }

        modal.style.display = 'block';
    }

    async handleDoctorSelection(type) {
        // Load doctors
        const doctors = await dataManager.getAll('doctors');
        if (doctors.length === 0) {
            alert('No hay médicos registrados.');
            return;
        }

        // Create selection modal
        const listHtml = doctors.map(d => `
            <div class="doctor-select-item" data-id="${d.id}" style="padding: 12px; border-bottom: 1px solid #374151; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
                <span style="color: white; font-weight: 500;">${d.name}</span>
                <span class="badge badge-primary" style="font-size: 0.7rem;">${d.specialty}</span>
            </div>
        `).join('');

        const selectionModal = document.createElement('div');
        selectionModal.className = 'modal';
        selectionModal.style.display = 'block';
        selectionModal.style.zIndex = '10000'; // Higher than main modal
        selectionModal.innerHTML = `
             <div class="modal-content animate__animated animate__fadeIn" style="max-width: 400px; border: 1px solid #374151;">
                <span class="close-select" style="position: absolute; right: 20px; top: 15px; cursor: pointer; font-size: 1.5rem; color: #9ca3af;">&times;</span>
                <h3 style="color: var(--primary-color); margin-bottom: 15px;">Seleccionar Médico</h3>
                <div class="doctor-selection-list" style="max-height: 300px; overflow-y: auto; margin-top: 15px; border-top: 1px solid #374151;">
                    ${listHtml}
                </div>
            </div>
        `;
        document.body.appendChild(selectionModal);

        selectionModal.querySelector('.close-select').addEventListener('click', () => selectionModal.remove());

        selectionModal.querySelectorAll('.doctor-select-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.style.backgroundColor = 'rgba(255,255,255,0.05)');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const doctor = doctors.find(d => d.id.toString() === id.toString());

                if (type === 'report') {
                    this.generator.generateDoctorReport(id);
                } else if (type === 'certificate') {
                    this.generator.generateCertificate('Carta Laboral', doctor);
                }

                selectionModal.remove();
                document.getElementById('report-modal').style.display = 'none';
            });
        });
    }
}
