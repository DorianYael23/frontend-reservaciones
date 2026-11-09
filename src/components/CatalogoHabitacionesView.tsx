import React, { useState, useEffect } from "react";
import type {
    Hotel,
    TipoHabitacion,
    Habitacion,
    OcupacionFecha,
    SesionUsuario,
    ReservacionPayload,
} from "../types";
import {
    obtenerHabitaciones,
    obtenerHoteles,
    obtenerTipos,
    obtenerOcupacionFechas,
    crearReservacion,
} from "../services/api";

interface CatalogoProps {
    sesion: SesionUsuario;
    onReservacionExitosa?: () => void;
}

const FOTOS_POR_TIPO: Record<string, string> = {
    suite: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    master: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
    doble: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
    individual: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
    deluxe: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80",
    estándar: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
};

const FOTOS_HOTELES_DEFAULT: Record<number, string> = {
    1: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
    2: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80",
};

// Estilos exclusivos del catálogo (prefijo "cat-" para no chocar con tu CSS global)
const estilosCatalogo = `
@keyframes catFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.cat-fade { animation: catFade .55s cubic-bezier(.2,.7,.2,1) both; }

.cat-card {
    cursor: pointer;
    transition: transform .25s ease, box-shadow .25s ease;
}

.cat-card-room { cursor: default; }

/* Fotos más bajas en celular para que se vean más tarjetas */
.cat-hero { position: relative; height: 180px; overflow: hidden; }
.cat-hero img { transition: transform .6s ease; }
.cat-room-img { position: relative; height: 170px; overflow: hidden; }
.cat-room-img img { transition: transform .6s ease; }

@media (min-width: 576px) {
    .cat-hero { height: 260px; }
    .cat-room-img { height: 200px; }
}

@media (hover: hover) {
    .cat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 18px 40px -18px rgba(24, 24, 27, 0.35) !important;
    }
    .cat-card:hover .cat-hero img,
    .cat-card:hover .cat-room-img img { transform: scale(1.06); }
}

@media (prefers-reduced-motion: reduce) {
    .cat-fade { animation: none; }
    .cat-card, .cat-hero img, .cat-room-img img { transition: none; }
}
`;

const obtenerFechaLocalIso = (diasSumar = 0, fechaBase?: string): string => {
    const base = fechaBase ? new Date(fechaBase + "T00:00:00") : new Date();
    base.setDate(base.getDate() + diasSumar);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, "0");
    const day = String(base.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const CatalogoHabitacionesView: React.FC<CatalogoProps> = ({
    sesion,
    onReservacionExitosa,
}) => {
    const hoyIso = obtenerFechaLocalIso(0);

    const [hoteles, setHoteles] = useState<Hotel[]>([]);
    const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
    const [tipos, setTipos] = useState<TipoHabitacion[]>([]);
    const [ocupacion, setOcupacion] = useState<OcupacionFecha[]>([]);
    const [loading, setLoading] = useState(true);

    const [hotelSeleccionado, setHotelSeleccionado] = useState<Hotel | null>(null);
    const [fechaEntrada, setFechaEntrada] = useState(hoyIso);
    const [fechaSalida, setFechaSalida] = useState(obtenerFechaLocalIso(1, hoyIso));
    const [filtroTipo, setFiltroTipo] = useState<number | "">("");

    const [habitacionParaReservar, setHabitacionParaReservar] = useState<Habitacion | null>(null);
    const [telefono, setTelefono] = useState("");
    const [numHuespedes, setNumHuespedes] = useState(1);
    const [guardando, setGuardando] = useState(false);
    const [errorModal, setErrorModal] = useState<string | null>(null);
    const [exitoToast, setExitoToast] = useState<string | null>(null);

    const formatoMoneda = (val: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val || 0);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [resHabs, resHoteles, resTipos, resOcupacion] = await Promise.all([
                obtenerHabitaciones(),
                obtenerHoteles(),
                obtenerTipos(),
                obtenerOcupacionFechas(),
            ]);
            setHabitaciones(resHabs);
            setHoteles(resHoteles);
            setTipos(resTipos);
            setOcupacion(resOcupacion);
        } catch {
            // Manejo silencioso
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const estaOcupadaEnFechas = (idHab: number) => {
        return ocupacion.some(
            (r) =>
                r.id_habitacion === idHab &&
                r.estado !== "Cancelada" &&
                r.fecha_entrada < fechaSalida &&
                r.fecha_salida > fechaEntrada
        );
    };

    const resolverFotoHabitacion = (hab: Habitacion) => {
        if (hab.imagen_url) return hab.imagen_url;
        if (hab.tipoHabitacion?.imagen_url) return hab.tipoHabitacion.imagen_url;
        const nombre = (hab.tipoHabitacion?.nombre || "").toLowerCase();
        const coincidencia = Object.entries(FOTOS_POR_TIPO).find(([k]) => nombre.includes(k));
        return coincidencia ? coincidencia[1] : FOTOS_POR_TIPO.estándar;
    };

    const habitacionesVisibles = habitaciones.filter((h) => {
        if (h.estado === "Mantenimiento") return false;
        if (hotelSeleccionado && hotelSeleccionado.id_hotel !== 0 && h.hotel?.id_hotel !== hotelSeleccionado.id_hotel) {
            return false;
        }
        if (filtroTipo && h.tipoHabitacion?.id_tipo !== Number(filtroTipo)) return false;
        return true;
    });

    const calcularNochesYMonto = () => {
        if (!habitacionParaReservar) return { noches: 0, total: 0 };
        const d1 = new Date(fechaEntrada + "T00:00:00");
        const d2 = new Date(fechaSalida + "T00:00:00");
        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        const noches = diff > 0 ? diff : 0;
        const total = noches * (habitacionParaReservar.tipoHabitacion?.precio_base || 0);
        return { noches, total };
    };

    const confirmarReservacion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!habitacionParaReservar?.id_habitacion) return;
        setGuardando(true);
        setErrorModal(null);

        const payload: ReservacionPayload = {
            habitacion: { id_habitacion: habitacionParaReservar.id_habitacion },
            nombre_cliente: sesion.nombre,
            telefono: telefono.trim(),
            email: sesion.email,
            fecha_entrada: fechaEntrada,
            fecha_salida: fechaSalida,
            num_huespedes: numHuespedes,
            estado: "Pendiente",
        };

        try {
            await crearReservacion(payload);
            setHabitacionParaReservar(null);
            setExitoToast("¡Reservación creada con éxito! Redirigiendo a tus reservaciones...");

            // Damos 1.5 segundos para que lea la notificación antes de cambiar de vista
            setTimeout(() => {
                if (onReservacionExitosa) onReservacionExitosa();
            }, 1500);

        } catch (err: any) {
            setErrorModal(err?.mensaje || "Error al procesar la reserva.");
        } finally {
            setGuardando(false);
        }
    };

    const { noches, total } = calcularNochesYMonto();

    return (
        <div>
            <style>{estilosCatalogo}</style>

            {exitoToast && (
                <div className="toast-alert alert alert-success border-0 rounded-4 shadow-sm d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <i className="bi bi-check-circle-fill me-2"></i>
                        {exitoToast}
                    </div>
                    <button className="btn-close" onClick={() => setExitoToast(null)}></button>
                </div>
            )}

            {!hotelSeleccionado && (
                <div>
                    {/* Encabezado: en celular el botón baja a todo el ancho */}
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
                        <div>
                            <span className="badge-soft badge-amber mb-2">
                                <i className="bi bi-geo-alt-fill"></i>
                                <span>Nuestras Sedes</span>
                            </span>
                            <h4 className="fw-bold mb-1">Selecciona tu Destino</h4>
                            <p className="text-muted small mb-0">
                                Elige en cuál de nuestros complejos hoteleros deseas hospedarte.
                            </p>
                        </div>
                        <div className="d-grid d-sm-block flex-shrink-0">
                            <button
                                type="button"
                                className="btn-luxury-outline text-nowrap"
                                onClick={() => setHotelSeleccionado({ id_hotel: 0, nombre: "Todas las Sedes", ciudad: "Nacional" })}
                            >
                                <i className="bi bi-grid me-1"></i>
                                <span>Ver todas las habitaciones</span>
                            </button>
                        </div>
                    </div>

                    <div className="row g-3 g-md-4">
                        {hoteles.map((hotel, idx) => {
                            const fotoHotel =
                                hotel.imagen_url ||
                                (hotel.id_hotel ? FOTOS_HOTELES_DEFAULT[hotel.id_hotel] : undefined) ||
                                FOTOS_HOTELES_DEFAULT[1];
                            const totalHabitaciones = habitaciones.filter(
                                (h) => h.hotel?.id_hotel === hotel.id_hotel
                            ).length;

                            return (
                                <div key={hotel.id_hotel} className="col-12 col-md-6">
                                    <div
                                        className="luxury-card cat-card cat-fade h-100 overflow-hidden shadow-sm"
                                        style={{ animationDelay: `${0.08 * idx}s` }}
                                        onClick={() => setHotelSeleccionado(hotel)}
                                    >
                                        <div className="cat-hero">
                                            <img
                                                src={fotoHotel}
                                                alt={hotel.nombre}
                                                className="w-100 h-100"
                                                style={{ objectFit: "cover" }}
                                            />
                                            <div
                                                className="position-absolute bottom-0 start-0 w-100 p-3"
                                                style={{
                                                    background: "linear-gradient(180deg, transparent 0%, rgba(24, 24, 27, 0.9) 100%)",
                                                }}
                                            >
                                                <span className="badge-soft badge-amber mb-1">
                                                    <i className="bi bi-pin-map-fill"></i> {hotel.ciudad}
                                                </span>
                                                <h4 className="fw-bold text-white mb-0">{hotel.nombre}</h4>
                                            </div>
                                        </div>

                                        {/* Pie: en celular se apila (texto arriba, botón a todo el ancho) */}
                                        <div className="p-3 p-md-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                                            <div>
                                                <small className="text-muted d-block">Capacidad de sede</small>
                                                <span className="fw-semibold text-dark">
                                                    <i className="bi bi-door-closed me-1"></i>
                                                    {totalHabitaciones} habitaciones disponibles
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-luxury-primary justify-content-center text-nowrap"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHotelSeleccionado(hotel);
                                                }}
                                            >
                                                <span>Explorar Habitaciones</span>
                                                <i className="bi bi-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {hotelSeleccionado && (
                <div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 mb-md-4 gap-3">
                        <div>
                            <h4 className="fw-bold mb-1">
                                {hotelSeleccionado.id_hotel === 0
                                    ? "Todas las Habitaciones"
                                    : `Habitaciones en ${hotelSeleccionado.nombre}`}
                            </h4>
                            <p className="text-muted small mb-0">
                                Selecciona tus fechas de entrada y salida para revisar la disponibilidad en tiempo real.
                            </p>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                className="btn-luxury-outline d-inline-flex align-items-center gap-2"
                                onClick={() => setHotelSeleccionado(null)}
                                title="Volver a la selección de hoteles"
                            >
                                <i className="bi bi-arrow-left"></i>
                                <span>Cambiar de hotel</span>
                            </button>
                            <button
                                type="button"
                                onClick={cargarDatos}
                                className="btn-luxury-outline"
                                title="Actualizar disponibilidad"
                            >
                                <i className="bi bi-arrow-clockwise"></i>
                            </button>
                        </div>
                    </div>

                    <div className="luxury-card mb-3 mb-md-4">
                        <div className="p-3 bg-light">
                            <div className="row g-2 align-items-end">
                                {/* Fechas lado a lado en celular para ahorrar espacio */}
                                <div className="col-6 col-md-4">
                                    <label className="input-label small text-muted">Llegada (Check-in)</label>
                                    <input
                                        type="date"
                                        className="input-luxury"
                                        min={hoyIso}
                                        value={fechaEntrada}
                                        onChange={(e) => {
                                            setFechaEntrada(e.target.value);
                                            if (fechaSalida <= e.target.value) {
                                                setFechaSalida(obtenerFechaLocalIso(1, e.target.value));
                                            }
                                        }}
                                    />
                                </div>

                                <div className="col-6 col-md-4">
                                    <label className="input-label small text-muted">Salida (Check-out)</label>
                                    <input
                                        type="date"
                                        className="input-luxury"
                                        min={obtenerFechaLocalIso(1, fechaEntrada)}
                                        value={fechaSalida}
                                        onChange={(e) => setFechaSalida(e.target.value)}
                                    />
                                </div>

                                <div className="col-12 col-md-4">
                                    <label className="input-label small text-muted">Categoría de Habitación</label>
                                    <select
                                        className="input-luxury"
                                        value={filtroTipo}
                                        onChange={(e) => setFiltroTipo(e.target.value ? Number(e.target.value) : "")}
                                    >
                                        <option value="">Todas las categorías</option>
                                        {tipos.map((t) => (
                                            <option key={t.id_tipo} value={t.id_tipo}>
                                                {t.nombre} · {formatoMoneda(t.precio_base)}/noche
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5 text-muted">
                            <div className="spinner-border text-warning mb-2" role="status" />
                            <div>Cargando habitaciones...</div>
                        </div>
                    ) : habitacionesVisibles.length === 0 ? (
                        <div className="luxury-card p-5 text-center text-muted">
                            <i className="bi bi-door-closed fs-1 text-secondary opacity-50 mb-2 d-block"></i>
                            <h5>No hay habitaciones en este hotel con ese criterio</h5>
                            <p className="small mb-0">Intenta cambiar de categoría o seleccionar otras fechas.</p>
                        </div>
                    ) : (
                        <div className="row g-3 g-md-4">
                            {habitacionesVisibles.map((hab, idx) => {
                                const ocupada = hab.id_habitacion ? estaOcupadaEnFechas(hab.id_habitacion) : false;
                                const imagen = resolverFotoHabitacion(hab);

                                return (
                                    <div key={hab.id_habitacion} className="col-12 col-md-6 col-lg-4">
                                        <div
                                            className="luxury-card cat-card cat-card-room cat-fade h-100 d-flex flex-column shadow-sm position-relative"
                                            style={{ animationDelay: `${Math.min(idx, 8) * 0.05}s` }}
                                        >
                                            <div className="cat-room-img">
                                                <img
                                                    src={imagen}
                                                    alt={hab.tipoHabitacion?.nombre || "Habitación"}
                                                    className="w-100 h-100"
                                                    style={{ objectFit: "cover" }}
                                                />
                                                <div
                                                    className="position-absolute top-0 start-0 m-3 px-2 py-1 rounded-3 small fw-bold text-white shadow-sm"
                                                    style={{ backgroundColor: "rgba(24, 24, 27, 0.85)", backdropFilter: "blur(4px)" }}
                                                >
                                                    Hab. #{hab.numero}
                                                </div>

                                                <div className="position-absolute bottom-0 end-0 m-3">
                                                    <span className={`badge-soft ${ocupada ? "badge-rose" : "badge-emerald"}`}>
                                                        <span className="dot"></span>
                                                        {ocupada ? "No disponible" : "Disponible"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-3 p-md-4 d-flex flex-column flex-grow-1 justify-content-between">
                                                <div>
                                                    <h6 className="fw-bold mb-1 text-dark">
                                                        {hab.tipoHabitacion?.nombre || "Estándar"}
                                                    </h6>
                                                    <small className="text-muted d-block mb-2">
                                                        <i className="bi bi-geo-alt me-1"></i>
                                                        {hab.hotel?.nombre} · Piso {hab.piso}
                                                    </small>

                                                    <span className="badge-soft badge-stone mb-3">
                                                        <i className="bi bi-people me-1"></i>
                                                        Hasta {hab.tipoHabitacion?.capacidad || 2} personas
                                                    </span>

                                                    <p
                                                        className="text-muted small mb-3"
                                                        style={{
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {hab.tipoHabitacion?.descripcion ||
                                                            "Habitación equipada con cama matrimonial o queen size, baño completo privado y aire acondicionado."}
                                                    </p>
                                                </div>

                                                <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: "0.72rem" }}>
                                                            Precio por noche
                                                        </small>
                                                        <span className="fw-bold fs-5" style={{ color: "#065f46" }}>
                                                            {formatoMoneda(hab.tipoHabitacion?.precio_base || 0)}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={ocupada}
                                                        onClick={() => {
                                                            setHabitacionParaReservar(hab);
                                                            setNumHuespedes(1);
                                                            setTelefono("");
                                                            setErrorModal(null);
                                                        }}
                                                        className={`btn-luxury-primary py-2 px-3 ${ocupada ? "opacity-50" : ""}`}
                                                        style={ocupada ? { cursor: "not-allowed" } : undefined}
                                                    >
                                                        <i className="bi bi-calendar-plus"></i>
                                                        <span>{ocupada ? "Ocupada" : "Reservar"}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {habitacionParaReservar && (
                <div className="modal-backdrop-custom" onClick={() => setHabitacionParaReservar(null)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-header">
                            <div>
                                <h6 className="fw-bold mb-0">Confirmar Reservación</h6>
                                <small className="text-muted">
                                    Habitación #{habitacionParaReservar.numero} · {habitacionParaReservar.hotel?.nombre}
                                </small>
                            </div>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setHabitacionParaReservar(null)}
                            ></button>
                        </div>

                        <form onSubmit={confirmarReservacion}>
                            <div className="modal-window-body">
                                {errorModal && (
                                    <div className="login-alert login-alert-danger mb-3">
                                        <i className="bi bi-exclamation-triangle-fill"></i>
                                        <div>{errorModal}</div>
                                    </div>
                                )}

                                <div className="p-3 bg-light rounded-3 border mb-3">
                                    <div className="row g-2 text-center">
                                        <div className="col-6 border-end">
                                            <small className="text-muted d-block">Entrada</small>
                                            <strong className="text-dark">{fechaEntrada}</strong>
                                        </div>
                                        <div className="col-6">
                                            <small className="text-muted d-block">Salida</small>
                                            <strong className="text-dark">{fechaSalida}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="input-label">Titular de la Cuenta</label>
                                    <input
                                        type="text"
                                        disabled
                                        className="input-luxury"
                                        style={{ backgroundColor: "#f4f4f5", cursor: "not-allowed" }}
                                        value={sesion.nombre}
                                    />
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="input-label">
                                            Teléfono <span className="login-req">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="Ej. 55 1234 5678"
                                            className="input-luxury"
                                            value={telefono}
                                            onChange={(e) => setTelefono(e.target.value)}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="input-label">
                                            Huéspedes (Máx. {habitacionParaReservar.tipoHabitacion?.capacidad || 2})
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={habitacionParaReservar.tipoHabitacion?.capacidad || 2}
                                            className="input-luxury"
                                            value={numHuespedes}
                                            onChange={(e) => setNumHuespedes(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div
                                    className="rounded-4 p-3 d-flex justify-content-between align-items-center text-white"
                                    style={{
                                        background:
                                            "radial-gradient(circle at 85% 50%, rgba(251, 191, 36, 0.16), transparent 45%), #18181b",
                                        border: "1px solid #27272a",
                                    }}
                                >
                                    <div>
                                        <div className="text-uppercase small text-white-50">Estancia</div>
                                        <div className="fw-bold">
                                            {noches} {noches === 1 ? "noche" : "noches"}
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <div className="text-uppercase small text-white-50">Total Estimado</div>
                                        <div className="fs-5 fw-bold" style={{ color: "#fbbf24" }}>
                                            {formatoMoneda(total)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-window-footer">
                                <button
                                    type="button"
                                    className="btn-luxury-outline"
                                    onClick={() => setHabitacionParaReservar(null)}
                                >
                                    Cancelar
                                </button>
                                <button type="submit" disabled={guardando} className="btn-luxury-primary">
                                    {guardando ? "Procesando..." : "Confirmar y Reservar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatalogoHabitacionesView;