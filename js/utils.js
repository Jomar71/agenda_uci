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

/** Paleta de colores por médico (asignables por el administrador). */
export const DOCTOR_COLORS = [
    '#0ea5e9', '#f59e0b', '#10b981', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#3b82f6', '#22c55e', '#e11d48', '#06b6d4'
];

/** Calcula iniciales a partir de un nombre (ej: 'Dr. Juan Pérez' → 'JP'). */
export function computeInitials(name) {
    const clean = String(name || '').trim().replace(/\s+/g, ' ');
    if (!clean) return '?';
    const honorifics = /^(dr|dra|dr\.|dra\.|lic|lic\.|prof|prof\.|sr|sra|sr\.|sra\.)$/i;
    const words = clean.split(' ').filter(w => !honorifics.test(w));
    if (words.length >= 2) {
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return (words[0] || clean.split(' ')[0]).slice(0, 2).toUpperCase();
}

/** Devuelve las iniciales del médico (las definidas por el admin o derivadas del nombre). */
export function getDoctorInitials(doctor) {
    if (doctor && doctor.initials && String(doctor.initials).trim()) {
        return String(doctor.initials).trim().toUpperCase().slice(0, 4);
    }
    return computeInitials(doctor?.name);
}

/** Normaliza un color hexadecimal (#rgb o #rrggbb). */
function parseHex(hex) {
    const h = String(hex || '#94a3b8').trim().replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    if (!/^[0-9a-f]{6}$/i.test(full)) return null;
    const int = parseInt(full, 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/** Devuelve el color del médico (configurado o uno determinista derivado de su ID). */
export function getDoctorColor(doctor, fallbackIndex = 0) {
    if (doctor && doctor.color && parseHex(doctor.color)) {
        return String(doctor.color).trim();
    }
    let seed = fallbackIndex;
    if (doctor) {
        const key = String(doctor.id || doctor.name || '');
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
        seed = hash;
    }
    return DOCTOR_COLORS[seed % DOCTOR_COLORS.length];
}

/** Convierte un color hex a rgba (para fondos suaves). */
export function hexToRgba(hex, alpha = 0.18) {
    const rgb = parseHex(hex);
    if (!rgb) return `rgba(148, 163, 184, ${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Devuelve un texto legible (claro u oscuro) sobre un color de fondo. */
export function getContrastColor(hex) {
    const rgb = parseHex(hex);
    if (!rgb) return '#ffffff';
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.6 ? '#111827' : '#ffffff';
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
