/**
 * Utilidades compartidas de la aplicación.
 */

/** Configuración de tipos de turno (claves normalizadas + compatibilidad legado). */
export const SHIFT_TYPES = {
    'mañana': { label: 'Día', color: '#f59e0b', short: 'D' },
    'noche': { label: 'Noche', color: '#8b5cf6', short: 'N' },
    'especial': { label: 'Especial / UCI', color: '#ef4444', short: 'E' },
    // Valores legados (solo lectura)
    'guardia': { label: 'Guardia', color: '#f59e0b', short: 'G' },
    'consulta': { label: 'Consulta', color: '#10b981', short: 'C' },
    'emergencia': { label: 'Emergencia', color: '#ef4444', short: 'EM' },
    'descanso': { label: 'Descanso', color: '#94a3b8', short: 'DE' }
};

/** Devuelve la configuración de un tipo de turno (con fallback seguro). */
export function getShiftType(type) {
    return SHIFT_TYPES[type] || { label: type || 'Turno', color: '#6b7280', short: '?' };
}

/** Escapa texto para evitar inyección XSS al inyectar en HTML. */
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Formatea una fecha como YYYY-MM-DD usando la zona horaria LOCAL (evita el bug de toISOString). */
export function formatDateLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Convierte una fecha (Date, string o null) en un objeto Date local. */
export function toDateLocal(value) {
    if (value instanceof Date) return value;
    if (!value) return new Date();
    const [y, m, d] = String(value).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

/** Obtiene la fecha local actual en formato YYYY-MM-DD. */
export function todayLocal() {
    return formatDateLocal(new Date());
}

/** Genera un ID único para registros locales. */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Hash SHA-256 de una contraseña (con fallback simple para contextos no seguros). */
export async function hashPassword(password) {
    try {
        if (crypto.subtle) {
            const data = new TextEncoder().encode(password);
            const digest = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(digest))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
    } catch (e) {
        console.warn('crypto.subtle no disponible, usando hash simple');
    }
    // Fallback: hash djb2 (consistente pero no criptográfico)
    let h1 = 5381;
    let h2 = 52711;
    for (let i = 0; i < password.length; i++) {
        const c = password.charCodeAt(i);
        h1 = (h1 * 33) ^ c;
        h2 = (h2 * 31) ^ c;
    }
    return `legacy_${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

/** Compara una contraseña con un médico (soporta hash nuevo y texto plano legado). */
export async function verifyPassword(doctor, password) {
    if (!doctor || !password) return false;
    if (doctor.passwordHash) {
        const hash = await hashPassword(password);
        return hash === doctor.passwordHash;
    }
    return doctor.password === password;
}

/** Debounce simple para búsquedas en vivo. */
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
