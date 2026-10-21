import type { Hotel, TipoHabitacion, Habitacion, HabitacionPayload } from '../types';

const API_URL = 'http://localhost:8082/api';

// Función auxiliar  procesar respuestas y lanzar errores claros del Backend
async function procesarRespuesta(res: Response) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw data;
    }
    return data;
}

// 1. SERVICIOS DE HOTELES

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
    const res = await fetch(`${API_URL}/hoteles/${id}`, {
        method: 'DELETE',
    });
    return procesarRespuesta(res);
};

// 2. SERVICIOS DE TIPOS DE HABITACIÓN
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
    const res = await fetch(`${API_URL}/tipos-habitacion/${id}`, {
        method: 'DELETE',
    });
    return procesarRespuesta(res);
};

// 3. SERVICIOS DE HABITACIONES Y CONSULTAS
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
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
        method: 'DELETE',
    });
    return procesarRespuesta(res);
};

// Consultas SQL (Historias de usuario 4, 5 y Extra)
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