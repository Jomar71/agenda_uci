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

/**
 * Paleta de colores por médico (asignables por el administrador).
 * Incluye los colores originales más gamas completas de amarillos,
 * rojos, verdes, lilas, fucsia, cafés, blanco y negro para maximizar
 * la diferenciación entre médicos.
 */
export const DOCTOR_COLORS = [
    // Colores originales
    '#0ea5e9', // Azul cielo
    '#f59e0b', // Ámbar
    '#10b981', // Esmeralda
    '#ef4444', // Rojo
    '#8b5cf6', // Violeta
    '#ec4899', // Rosa
    '#14b8a6', // Teal
    '#f97316', // Naranja
    '#3b82f6', // Azul
    '#22c55e', // Verde
    '#e11d48', // Carmesí
    '#06b6d4', // Cian
    // Colores adicionales
    '#eab308', // Amarillo
    '#84cc16', // Lima
    '#6366f1', // Índigo
    '#a855f7', // Púrpura
    '#d946ef', // Fucsia
    '#f43f5e', // Rosado
    '#92400e', // Marrón
    '#64748b', // Pizarra (gris azulado)
    '#1d4ed8', // Azul oscuro
    '#166534', // Verde oscuro
    '#b91c1c', // Rojo oscuro
    '#0f766e', // Teal oscuro
    // Gama de amarillos
    '#fef9c3', // Amarillo muy claro
    '#fef08a', // Amarillo claro
    '#fde047', // Amarillo suave
    '#facc15', // Amarillo
    '#fbbf24', // Amarillo dorado
    '#f59e0b', // Ámbar
    '#d97706', // Ámbar oscuro
    '#ca8a04', // Amarillo oliva
    '#a16207', // Amarillo mostaza oscuro
    // Gama de rojos
    '#fecaca', // Rojo muy claro
    '#fca5a5', // Rojo claro
    '#f87171', // Rojo coral
    '#dc2626', // Rojo intenso
    '#b91c1c', // Rojo oscuro
    '#991b1b', // Rojo granate
    '#7f1d1d', // Rojo vino
    // Gama de verdes
    '#dcfce7', // Verde muy claro
    '#bbf7d0', // Verde menta claro
    '#86efac', // Verde menta
    '#4ade80', // Verde brillante
    '#22c55e', // Verde
    '#16a34a', // Verde intenso
    '#15803d', // Verde bosque
    '#14532d', // Verde oscuro profundo
    // Gama de lilas
    '#f3e8ff', // Lila muy claro
    '#e9d5ff', // Lila claro
    '#d8b4fe', // Lila suave
    '#c084fc', // Lila
    '#a855f7', // Lila intenso
    '#9333ea', // Lila profundo
    '#7e22ce', // Lila oscuro
    // Gama de fucsia
    '#fae8ff', // Fucsia muy claro
    '#f5d0fe', // Fucsia claro
    '#f0abfc', // Fucsia suave
    '#e879f9', // Fucsia
    '#d946ef', // Fucsia intenso
    '#c026d3', // Fucsia profundo
    '#a21caf', // Fucsia oscuro
    // Gama de cafés
    '#d6a577', // Café claro
    '#c28b5e', // Café medio claro
    '#b07d5b', // Café canela
    '#9a6a3f', // Café
    '#8b5a2b', // Café intenso
    '#6b4226', // Café oscuro
    '#4a2f1d', // Café oscuro profundo
    // Blanco y negro
    '#ffffff', // Blanco
    '#000000'  // Negro
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
