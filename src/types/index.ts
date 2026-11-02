// 1. HOTELES Y TIPOS DE HABITACIÓN
export interface Hotel {
    id_hotel?: number;
    nombre: string;
    direccion?: string;
    ciudad: string;
    telefono?: string;
    email?: string;
    activo?: boolean;
    imagen_url?: string;
    descripcion?: string;
}

export interface TipoHabitacion {
    id_tipo?: number;
    nombre: string;
    capacidad: number;
    descripcion?: string;
    precio_base: number;
    imagen_url?: string;
}

export interface Habitacion {
    id_habitacion?: number;
    hotel: Hotel;
    tipoHabitacion: TipoHabitacion;
    numero: string;
    piso: number;
    estado: 'Disponible' | 'Ocupada' | 'Mantenimiento' | string;
    imagen_url?: string;
}

export interface HabitacionPayload {
    hotel: { id_hotel: number };
    tipoHabitacion: { id_tipo: number };
    numero: string;
    piso: number;
    estado: string;
}

// 2. RESERVACIONES Y OCUPACIÓN
export type EstadoReservacion = 'Pendiente' | 'Confirmada' | 'En Curso' | 'Cancelada' | 'Finalizada';

export interface Reservacion {
    id_reservacion?: number;
    folio?: string;
    habitacion: Habitacion;
    nombre_cliente: string;
    telefono: string;
    email?: string;
    fecha_registro?: string;
    fecha_entrada: string;
    fecha_salida: string;
    num_huespedes: number;
    total: number;
    estado: EstadoReservacion;
}

export interface ReservacionPayload {
    habitacion: { id_habitacion: number };
    nombre_cliente: string;
    telefono: string;
    email?: string | null;
    fecha_entrada: string;
    fecha_salida: string;
    num_huespedes: number;
    estado: string;
}

export interface OcupacionFecha {
    id_reservacion: number;
    id_habitacion: number;
    fecha_entrada: string;
    fecha_salida: string;
    estado: string;
}

// 3. USUARIOS Y AUTENTICACIÓN
export interface Usuario {
    id_usuario?: number;
    nombre: string;
    email: string;
    password?: string;
    rol: 'ADMIN' | 'HUESPED';
    verificado?: boolean;
    fecha_registro?: string;
    activo?: boolean;
}

export interface SesionUsuario {
    token: string;
    id_usuario: number;
    nombre: string;
    email: string;
    rol: 'ADMIN' | 'HUESPED';
}

// 4. CHAT Y ASISTENTE IA
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    model?: string;
    tiempoMs?: number;
    error?: boolean;
    originalQuestion?: string;
}

export interface ConversationSession {
    id: string;
    title: string;
    updatedAt: string;
    messages: ChatMessage[];
}