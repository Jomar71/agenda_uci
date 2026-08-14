/**
 * ReportsController - Modal de selección para generar reportes y certificados.
 */

import { PDFGenerator } from './pdf-generator.js';
import { dataManager } from '../services/data-manager.js';
import { escapeHtml } from '../utils.js';

export class ReportsController {
    constructor() {
        this.generator = new PDFGenerator(dataManager);
        this.init();
    }

    init() {
        // Botones de la sección "Documentos" (accesible para médicos y admin)
        document.getElementById('doc-monthly')?.addEventListener('click', () => this.handleDocAction('monthly'));
        document.getElementById('doc-doctor')?.addEventListener('click', () => this.handleDocAction('report'));
        document.getElementById('doc-cert')?.addEventListener('click', () => this.handleDocAction('certificate'));

        window.addEventListener('uci_auth_changed', () => this.updateDocButtonLabels());
        this.updateDocButtonLabels();
    }

    updateDocButtonLabels() {
        const auth = window.app?.auth;
        const isMedic = auth?.isLoggedIn && !auth.isAdmin();
        const monthlyBtn = document.getElementById('doc-monthly');
        const docBtn = document.getElementById('doc-doctor');
        const certBtn = document.getElementById('doc-cert');
        if (monthlyBtn) monthlyBtn.innerHTML = isMedic
            ? '<i class="fas fa-file-pdf" aria-hidden="true"></i> Mi Reporte Mensual'
            : '<i class="fas fa-file-pdf" aria-hidden="true"></i> Reporte Mensual por Médico';
        if (docBtn) docBtn.innerHTML = isMedic
            ? '<i class="fas fa-clock" aria-hidden="true"></i> Mi Historial de Turnos'
            : '<i class="fas fa-file-lines" aria-hidden="true"></i> Historial por Médico';
        if (certBtn) certBtn.innerHTML = isMedic
            ? '<i class="fas fa-id-card" aria-hidden="true"></i> Mi Certificado Laboral'
            : '<i class="fas fa-file-circle-check" aria-hidden="true"></i> Certificado Laboral';
    }

    handleDocAction(type) {
        const auth = window.app?.auth;
        if (!auth?.isLoggedIn) return;

        if (auth.isAdmin()) {
            this.handleDoctorSelection(type);
            return;
        }

        const doctor = auth.currentUser;
        if (!doctor?.id) {
            auth.showNotification('No se encontró tu perfil de médico', 'error');
            return;
        }
        this.generateOwnDocument(type, doctor);
    }

    async generateOwnDocument(type, doctor) {
        const auth = window.app?.auth;
        const buttonMap = { monthly: 'doc-monthly', report: 'doc-doctor', certificate: 'doc-cert' };
        const btn = document.getElementById(buttonMap[type]);
        const original = btn?.innerHTML;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Generando...';
        }
        try {
            if (type === 'monthly') {
                const date = new Date();
                await this.generator.generateMonthlyReport(date.getFullYear(), date.getMonth(), doctor.id);
            } else if (type === 'report') {
                await this.generator.generateDoctorReport(doctor.id);
            } else {
                await this.generator.generateCertificate('Carta Laboral', doctor);
            }
        } catch (err) {
            console.error(err);
            auth?.showNotification('Error al generar el documento', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        }
    }

    openModal(modal) {
        if (!modal) return;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        if (!document.querySelectorAll('.modal.open').length) {
            document.body.style.overflow = '';
        }
    }

    async handleDoctorSelection(type) {
        const doctors = await dataManager.getAll('doctors');
        if (doctors.length === 0) {
            window.app?.auth?.showNotification('No hay médicos registrados', 'warning');
            return;
        }

        const selectionModal = document.createElement('div');
        selectionModal.className = 'modal';
        selectionModal.innerHTML = `
            <div class="modal-content" style="max-width: 440px;">
                <button type="button" class="modal-close close" aria-label="Cerrar">&times;</button>
                <h3 style="color: var(--primary); margin-bottom: 10px;">Seleccionar Médico</h3>
                <div class="doctor-selection-list">
                    ${doctors.map(d => `
                        <div class="doctor-select-item" data-id="${escapeHtml(d.id)}">
                            <span style="font-weight: 600;">${escapeHtml(d.name)}</span>
                            <span class="badge">${escapeHtml(d.specialty)}</span>
                        </div>`).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(selectionModal);
        this.openModal(selectionModal);

        selectionModal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal(selectionModal);
            selectionModal.remove();
        });
        selectionModal.addEventListener('click', (e) => {
            if (e.target === selectionModal) {
                this.closeModal(selectionModal);
                selectionModal.remove();
            }
        });

        selectionModal.querySelectorAll('.doctor-select-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const doctor = doctors.find(d => String(d.id) === String(id));
                if (!doctor) return;

                selectionModal.classList.add('loading');
                try {
                    if (type === 'monthly') {
                        const date = new Date();
                        await this.generator.generateMonthlyReport(date.getFullYear(), date.getMonth(), id);
                    } else if (type === 'report') {
                        await this.generator.generateDoctorReport(id);
                    } else if (type === 'certificate') {
                        await this.generator.generateCertificate('Carta Laboral', doctor);
                    }
                    this.closeModal(selectionModal);
                    selectionModal.remove();
                } catch (err) {
                    console.error(err);
                    window.app?.auth?.showNotification('Error al generar el documento', 'error');
                    selectionModal.classList.remove('loading');
                }
            });
        });
    }
}
