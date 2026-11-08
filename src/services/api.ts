import type {
    Hotel,
    TipoHabitacion,
    Habitacion,
    HabitacionPayload,
    Reservacion,
    ReservacionPayload,
    OcupacionFecha,
    Usuario,
    SesionUsuario,
} from '../types';

// Detecta dinámicamente si estás en localhost o entrando desde la IP del celular
const hostActual = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_URL = (import.meta as any).env?.VITE_API_URL || `http://${hostActual}:8082/api`;

// Función auxiliar estándar para procesar respuestas y capturar errores del backend 
async function procesarRespuesta(res: Response) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw data;
    }
    return data;
}

// ==========================================
// 1. AUTENTICACIÓN
// ==========================================
export const authLogin = async (credenciales: { email: string; password: string }): Promise<SesionUsuario> => {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales),
    });
    return procesarRespuesta(res);
};

export const authRegistro = async (datos: { nombre: string; email: string; password: string }) => {
    const res = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return procesarRespuesta(res);
};

export const authVerificarCodigo = async (datos: { email: string; codigo: string }) => {
    const res = await fetch(`${API_URL}/auth/verificar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
    });
    return procesarRespuesta(res);
};

// ==========================================
// 2. GESTIÓN DE USUARIOS
// ==========================================
export const obtenerUsuarios = async (): Promise<Usuario[]> => {
    const res = await fetch(`${API_URL}/usuarios`);
    return procesarRespuesta(res);
};

export const crearUsuario = async (usuario: Partial<Usuario>) => {
    const res = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario),
    });
    return procesarRespuesta(res);
};

export const actualizarUsuario = async (id: number, usuario: Partial<Usuario>) => {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario),
    });
    return procesarRespuesta(res);
};

export const eliminarUsuario = async (id: number) => {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
    });
    return procesarRespuesta(res);
};

// ==========================================
// 3. HOTELES
// ==========================================
export const obtenerHoteles = async (): Promise<Hotel[]> => {
    const res = await fetch(`${API_URL}/hoteles`);
    return procesarRespuesta(res);
};

export const crearHotel = async (hotel: Hotel) => {
    const res = await fetch(`${API_URL}/hoteles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hotel),
    });
    return procesarRespuesta(res);
};

export const actualizarHotel = async (id: number, hotel: Hotel) => {
    const res = await fetch(`${API_URL}/hoteles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hotel),
    });
    return procesarRespuesta(res);
};

export const eliminarHotel = async (id: number) => {
    const res = await fetch(`${API_URL}/hoteles/${id}`, { method: 'DELETE' });
    return procesarRespuesta(res);
};

// ==========================================
// 4. TIPOS DE HABITACIÓN
// ==========================================
export const obtenerTipos = async (): Promise<TipoHabitacion[]> => {
    const res = await fetch(`${API_URL}/tipos-habitacion`);
    return procesarRespuesta(res);
};

export const crearTipo = async (tipo: TipoHabitacion) => {
    const res = await fetch(`${API_URL}/tipos-habitacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipo),
    });
    return procesarRespuesta(res);
};

export const actualizarTipo = async (id: number, tipo: TipoHabitacion) => {
    const res = await fetch(`${API_URL}/tipos-habitacion/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipo),
    });
    return procesarRespuesta(res);
};

export const eliminarTipo = async (id: number) => {
    const res = await fetch(`${API_URL}/tipos-habitacion/${id}`, { method: 'DELETE' });
    return procesarRespuesta(res);
};

// ==========================================
// 5. HABITACIONES Y CONSULTAS SQL
// ==========================================
export const obtenerHabitaciones = async (): Promise<Habitacion[]> => {
    const res = await fetch(`${API_URL}/habitaciones`);
    return procesarRespuesta(res);
};

export const crearHabitacion = async (habitacion: HabitacionPayload) => {
    const res = await fetch(`${API_URL}/habitaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitacion),
    });
    return procesarRespuesta(res);
};

export const actualizarHabitacion = async (id: number, habitacion: HabitacionPayload) => {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitacion),
    });
    return procesarRespuesta(res);
};

export const eliminarHabitacion = async (id: number) => {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, { method: 'DELETE' });
    return procesarRespuesta(res);
};

export const consultarDisponibles = async () => {
    const res = await fetch(`${API_URL}/habitaciones/consultas/disponibles`);
    return procesarRespuesta(res);
};

export const consultarDistribucion = async () => {
    const res = await fetch(`${API_URL}/habitaciones/consultas/distribucion`);
    return procesarRespuesta(res);
};

export const consultarConteoDisponibles = async () => {
    const res = await fetch(`${API_URL}/habitaciones/consultas/conteo-disponibles`);
    return procesarRespuesta(res);
};

// ==========================================
// 6. RESERVACIONES
// ==========================================
export const obtenerReservaciones = async (): Promise<Reservacion[]> => {
    const res = await fetch(`${API_URL}/reservaciones`);
    return procesarRespuesta(res);
};

export const obtenerOcupacionFechas = async (): Promise<OcupacionFecha[]> => {
    const res = await fetch(`${API_URL}/reservaciones/ocupacion-fechas`);
    return procesarRespuesta(res);
};

export const crearReservacion = async (payload: ReservacionPayload) => {
    const res = await fetch(`${API_URL}/reservaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return procesarRespuesta(res);
};

export const actualizarReservacion = async (id: number, payload: ReservacionPayload) => {
    const res = await fetch(`${API_URL}/reservaciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return procesarRespuesta(res);
};

export const eliminarReservacion = async (id: number) => {
    const res = await fetch(`${API_URL}/reservaciones/${id}`, { method: 'DELETE' });
    return procesarRespuesta(res);
};

export const realizarCheckIn = async (id: number) => {
    const res = await fetch(`${API_URL}/reservaciones/${id}/check-in`, { method: 'POST' });
    return procesarRespuesta(res);
};

export const realizarCheckOut = async (id: number) => {
    const res = await fetch(`${API_URL}/reservaciones/${id}/check-out`, { method: 'POST' });
    return procesarRespuesta(res);
};

// ==========================================
// 7. ASISTENTE IA (HOTEL-AI)
// ==========================================
export const preguntarAsistenteIA = async (payload: {
    pregunta: string;
    question?: string;
    modelo: string;
    model?: string;
    conversationId?: string;
}): Promise<{ respuesta?: string; answer?: string; modeloUsado?: string; tiempoMs?: number }> => {
    const res = await fetch(`${API_URL}/hotel-ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return procesarRespuesta(res);
};

export const obtenerSesionesIA = async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/hotel-ai/sesiones`);
    return procesarRespuesta(res);
};

export const guardarSesionIA = async (sesion: {
    id: string;
    title: string;
    updatedAt: string;
    messagesJson: string;
}) => {
    const res = await fetch(`${API_URL}/hotel-ai/sesiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sesion),
    });
    return procesarRespuesta(res);
};

export const eliminarSesionIA = async (id: string) => {
    const res = await fetch(`${API_URL}/hotel-ai/history/${id}`, { method: 'DELETE' });
    return procesarRespuesta(res);
};