export interface Hotel {
    id_hotel?: number;
    nombre: string;
    direccion: string;
    ciudad: string;
    telefono: string;
    email: string;
    activo: boolean;
}

export interface TipoHabitacion {
    id_tipo?: number;
    nombre: string;
    capacidad: number;
    descripcion: string;
    precio_base: number;
}

export interface Habitacion {
    id_habitacion?: number;
    hotel: Hotel;
    tipoHabitacion: TipoHabitacion;
    numero: string;
    piso: number;
    estado: 'Disponible' | 'Ocupada' | 'Mantenimiento' | string;
}

export interface HabitacionPayload {
    hotel: { id_hotel: number };
    tipoHabitacion: { id_tipo: number };
    numero: string;
    piso: number;
    estado: string;
}