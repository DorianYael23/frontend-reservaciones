import { useEffect, useState } from 'react';
import type { Hotel, TipoHabitacion } from '../types';
import {
    API_URL, // <-- Lo traemos de tu archivo central
    consultarDisponibles,
    consultarDistribucion,
    consultarConteoDisponibles,
    obtenerHoteles,
    obtenerTipos,
} from '../services/api';

const API_RESERVACIONES = `${API_URL}/reservaciones`;

// Estilos exclusivos del dashboard (prefijo "wow-" para no chocar con tu CSS actual)
const estilosWow = `
@keyframes wowFade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes wowGrowY { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes wowGrowX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes wowSheen { 0% { transform: translateX(-120%); } 60%, 100% { transform: translateX(260%); } }
@keyframes wowPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); } 50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); } }
@keyframes wowDraw { from { stroke-dashoffset: 400; } to { stroke-dashoffset: 0; } }

.wow-fade { animation: wowFade .65s cubic-bezier(.2,.7,.2,1) both; }

.wow-card {
    transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.wow-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 40px -18px rgba(24, 24, 27, 0.35) !important;
    border-color: rgba(217, 119, 6, 0.35) !important;
}

.wow-panel {
    position: relative;
    overflow: hidden;
    background: linear-gradient(180deg, #ffffff 0%, #fdfcfa 100%) !important;
}
.wow-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #f59e0b, #d97706, #8b5cf6, #0284c7, #10b981);
    opacity: .9;
}

.wow-kpi {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
}
.wow-kpi::after {
    content: '';
    position: absolute;
    right: -30px; top: -30px;
    width: 110px; height: 110px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.18), transparent 70%);
    pointer-events: none;
}
.wow-kpi-dark {
    background: linear-gradient(135deg, #18181b 0%, #27272a 55%, #3f3f46 100%) !important;
    border: 1px solid rgba(245, 158, 11, 0.35) !important;
    color: #fafaf9;
}
.wow-kpi-dark::after {
    background: radial-gradient(circle, rgba(245, 158, 11, 0.35), transparent 70%);
}
.wow-kpi-accent-emerald { border-top: 3px solid #10b981 !important; }
.wow-kpi-accent-amber { border-top: 3px solid #f59e0b !important; }
.wow-kpi-accent-rose { border-top: 3px solid #e11d48 !important; }

.wow-gold-text {
    background: linear-gradient(90deg, #fbbf24, #f59e0b, #fde68a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.wow-hbar {
    position: relative;
    overflow: hidden;
    transform-origin: left center;
    animation: wowGrowX .9s cubic-bezier(.2,.7,.2,1) both;
}
.wow-hbar::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
    animation: wowSheen 3.2s ease-in-out infinite;
}

.wow-vbar {
    transform-origin: bottom center;
    animation: wowGrowY .85s cubic-bezier(.2,.7,.2,1) both;
    transition: filter .2s ease, transform .2s ease;
}
.wow-vcol:hover .wow-vbar { filter: brightness(1.12) saturate(1.2); }

.wow-grid-bg {
    background-image: repeating-linear-gradient(to top, rgba(24,24,27,.06) 0, rgba(24,24,27,.06) 1px, transparent 1px, transparent 36px);
}

.wow-star {
    animation: wowPulse 2.2s ease-in-out infinite;
}

.wow-insight {
    border-radius: 1rem;
    padding: 1rem 1.1rem;
    background: linear-gradient(135deg, #fffbeb 0%, #ffffff 70%);
    border: 1px solid #fde68a;
    height: 100%;
}
.wow-insight-label {
    font-size: .68rem;
    letter-spacing: .09em;
    text-transform: uppercase;
    color: #a16207;
    font-weight: 700;
}

.wow-cat-rank {
    width: 26px; height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: .75rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
}

.wow-donut-seg {
    transition: stroke-width .2s ease;
    animation: wowDraw 1.2s ease both;
}
.wow-donut-seg:hover { stroke-width: 15; }

@media (prefers-reduced-motion: reduce) {
    .wow-fade, .wow-hbar, .wow-vbar, .wow-star, .wow-hbar::after, .wow-donut-seg { animation: none !important; }
    .wow-card { transition: none; }
}
`;

export default function ConsultasView() {
    const [vistaReporte, setVistaReporte] = useState<'dashboard' | 'recepcion' | 'matriz' | 'resumen'>('dashboard');
    const [disponibles, setDisponibles] = useState<any[]>([]);
    const [distribucion, setDistribucion] = useState<any[]>([]);
    const [conteo, setConteo] = useState<any[]>([]);
    const [reservaciones, setReservaciones] = useState<any[]>([]);

    const [hoteles, setHoteles] = useState<Hotel[]>([]);
    const [tipos, setTipos] = useState<TipoHabitacion[]>([]);

    const [filtroHotel, setFiltroHotel] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroCapacidad, setFiltroCapacidad] = useState('');

    // Filtros del Dashboard de Gráficas
    const [filtroAnioDash, setFiltroAnioDash] = useState('');
    const [filtroSedeDash, setFiltroSedeDash] = useState('');

    const [error, setError] = useState<string | null>(null);

    const formatoMoneda = (valor: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);

    const formatoMonedaCompacto = (valor: number) =>
        new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            maximumFractionDigits: 0,
        }).format(valor || 0);

    const badgeClass = (estado: string) => {
        if (estado === 'Disponible') return 'badge-emerald';
        if (estado === 'Ocupada') return 'badge-rose';
        return 'badge-amber';
    };

    const cargarConsultas = async () => {
        setError(null);
        try {
            const [resDisp, resDist, resCont, resHot, resTip, resReservas] = await Promise.all([
                consultarDisponibles(),
                consultarDistribucion(),
                consultarConteoDisponibles(),
                obtenerHoteles(),
                obtenerTipos(),
                fetch(API_RESERVACIONES).then((r) => (r.ok ? r.json() : [])),
            ]);
            setDisponibles(resDisp);
            setDistribucion(resDist);
            setConteo(resCont);
            setHoteles(resHot);
            setTipos(resTip);
            setReservaciones(Array.isArray(resReservas) ? resReservas : []);
        } catch {
            setError('Error al sincronizar los reportes con la base de datos.');
        }
    };

    useEffect(() => {
        cargarConsultas();
    }, []);

    const disponiblesFiltradas = disponibles.filter((item) => {
        const okHotel = filtroHotel ? item.hotel === filtroHotel : true;
        const okTipo = filtroTipo ? item.tipo === filtroTipo : true;
        const okCap = filtroCapacidad ? Number(item.capacidad) >= Number(filtroCapacidad) : true;
        return okHotel && okTipo && okCap;
    });

    // Cálculos del Dashboard de Gráficas
    const reservasFiltradasDash = reservaciones.filter((r) => {
        const anio = String(r.fecha_entrada || '').slice(0, 4);
        const sede = r.habitacion?.hotel?.nombre || '';
        const okAnio = filtroAnioDash ? anio === filtroAnioDash : true;
        const okSede = filtroSedeDash ? sede === filtroSedeDash : true;
        return okAnio && okSede;
    });

    const reservasEfectivas = reservasFiltradasDash.filter((r) => r.estado !== 'Cancelada');
    const reservasCanceladas = reservasFiltradasDash.filter((r) => r.estado === 'Cancelada');
    const ingresosTotales = reservasEfectivas.reduce((acc, r) => acc + Number(r.total || 0), 0);
    const ticketPromedio = reservasEfectivas.length > 0 ? ingresosTotales / reservasEfectivas.length : 0;

    const datosTemporadas = (() => {
        const grupos = [
            { etiqueta: 'Alta Verano (Jul - Ago)', reservas: 0, ingresos: 0, color: '#f59e0b' },
            { etiqueta: 'Semana Santa (Mar - Abr)', reservas: 0, ingresos: 0, color: '#8b5cf6' },
            { etiqueta: 'Alta Invierno (Dic - Ene)', reservas: 0, ingresos: 0, color: '#0284c7' },
            { etiqueta: 'Media (May / Oct / Nov)', reservas: 0, ingresos: 0, color: '#10b981' },
            { etiqueta: 'Baja (Feb / Jun / Sep)', reservas: 0, ingresos: 0, color: '#64748b' },
        ];
        reservasEfectivas.forEach((r) => {
            const mes = Number((r.fecha_entrada || '').split('-')[1] || 1);
            const monto = Number(r.total || 0);
            if (mes === 7 || mes === 8) {
                grupos[0].reservas++;
                grupos[0].ingresos += monto;
            } else if (mes === 3 || mes === 4) {
                grupos[1].reservas++;
                grupos[1].ingresos += monto;
            } else if (mes === 12 || mes === 1) {
                grupos[2].reservas++;
                grupos[2].ingresos += monto;
            } else if (mes === 5 || mes === 10 || mes === 11) {
                grupos[3].reservas++;
                grupos[3].ingresos += monto;
            } else {
                grupos[4].reservas++;
                grupos[4].ingresos += monto;
            }
        });
        return grupos;
    })();
    const maxTempReservas = Math.max(1, ...datosTemporadas.map((d) => d.reservas));

    const aniosLista = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
    const datosAnuales = aniosLista.map((anio) => {
        const delAnio = reservasEfectivas.filter((r) => String(r.fecha_entrada || '').startsWith(anio));
        const ingresos = delAnio.reduce((acc, r) => acc + Number(r.total || 0), 0);
        return { anio, reservas: delAnio.length, ingresos };
    });
    const maxAnioReservas = Math.max(1, ...datosAnuales.map((d) => d.reservas));

    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const datosMensuales = nombresMeses.map((mesNombre, idx) => {
        const numMes = idx + 1;
        const delMes = reservasEfectivas.filter(
            (r) => Number((r.fecha_entrada || '').split('-')[1]) === numMes
        );
        const ingresos = delMes.reduce((acc, r) => acc + Number(r.total || 0), 0);
        const esTemporadaAlta = [1, 3, 4, 7, 8, 12].includes(numMes);
        return { mesNombre, reservas: delMes.length, ingresos, esTemporadaAlta };
    });
    const maxMesReservas = Math.max(1, ...datosMensuales.map((d) => d.reservas));

    const datosCategorias = (() => {
        const mapa: Record<string, { reservas: number; ingresos: number }> = {};
        reservasEfectivas.forEach((r) => {
            const cat = r.habitacion?.tipoHabitacion?.nombre || 'Estándar';
            if (!mapa[cat]) mapa[cat] = { reservas: 0, ingresos: 0 };
            mapa[cat].reservas++;
            mapa[cat].ingresos += Number(r.total || 0);
        });
        const colores = ['#10b981', '#0284c7', '#f59e0b', '#8b5cf6'];
        return Object.entries(mapa).map(([nombre, val], idx) => ({
            nombre,
            reservas: val.reservas,
            ingresos: val.ingresos,
            color: colores[idx % colores.length],
        }));
    })();
    const maxCatIngresos = Math.max(1, ...datosCategorias.map((d) => d.ingresos));

    // ---- Solo presentación (derivados visuales, no alteran la lógica anterior) ----
    const mejorAnio = datosAnuales.reduce(
        (best, d) => (d.reservas > best.reservas ? d : best),
        { anio: '', reservas: 0, ingresos: 0 }
    );
    const mesPico = datosMensuales.reduce(
        (best, d) => (d.reservas > best.reservas ? d : best),
        { mesNombre: '', reservas: 0, ingresos: 0, esTemporadaAlta: false }
    );
    const catLider = datosCategorias.reduce(
        (best, d) => (d.ingresos > best.ingresos ? d : best),
        { nombre: '', reservas: 0, ingresos: 0, color: '#10b981' }
    );
    const tasaCancelacion =
        reservasFiltradasDash.length > 0
            ? (reservasCanceladas.length / reservasFiltradasDash.length) * 100
            : 0;

    const maxIngresoMes = Math.max(1, ...datosMensuales.map((d) => d.ingresos));
    const sparkLinea = datosMensuales
        .map((m, i) => `${((i / 11) * 120).toFixed(1)},${(34 - (m.ingresos / maxIngresoMes) * 30).toFixed(1)}`)
        .join(' ');
    const sparkArea = `M0,36 L${sparkLinea.split(' ').join(' L')} L120,36 Z`;

    const RADIO_DONUT = 42;
    const CIRC_DONUT = 2 * Math.PI * RADIO_DONUT;
    const segmentosDonut = (() => {
        const total = reservasEfectivas.length;
        let acumulado = 0;
        return datosTemporadas.map((t) => {
            const largo = total > 0 ? (t.reservas / total) * CIRC_DONUT : 0;
            const seg = { color: t.color, largo, offset: -acumulado, etiqueta: t.etiqueta, reservas: t.reservas };
            acumulado += largo;
            return seg;
        });
    })();

    return (
        <div className="luxury-card">
            <style>{estilosWow}</style>

            <div className="luxury-card-header">
                <div className="nav-pills-luxury">
                    <button
                        className={`nav-pill-btn ${vistaReporte === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setVistaReporte('dashboard')}
                    >
                        <i className="bi bi-pie-chart-fill"></i>
                        <span>Dashboard de Gráficas</span>
                    </button>
                    <button
                        className={`nav-pill-btn ${vistaReporte === 'recepcion' ? 'active' : ''}`}
                        onClick={() => setVistaReporte('recepcion')}
                    >
                        <i className="bi bi-search"></i>
                        <span>Buscador de Disponibilidad</span>
                    </button>
                    <button
                        className={`nav-pill-btn ${vistaReporte === 'matriz' ? 'active' : ''}`}
                        onClick={() => setVistaReporte('matriz')}
                    >
                        <i className="bi bi-grid-3x3-gap"></i>
                        <span>Matriz General de Inventario</span>
                    </button>
                    <button
                        className={`nav-pill-btn ${vistaReporte === 'resumen' ? 'active' : ''}`}
                        onClick={() => setVistaReporte('resumen')}
                    >
                        <i className="bi bi-bar-chart"></i>
                        <span>Disponibilidad por Sede</span>
                    </button>
                </div>

                <button className="btn-luxury-outline" onClick={cargarConsultas}>
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Actualizar Datos
                </button>
            </div>

            <div className="p-4">
                {error && <div className="alert alert-danger">{error}</div>}

                {vistaReporte === 'dashboard' && (
                    <div>
                        <div
                            className="row g-3 mb-4 p-3 rounded-4 border wow-fade"
                            style={{ backgroundColor: '#fafaf9' }}
                        >
                            <div className="col-md-5">
                                <label className="input-label">Filtrar por Sede Hotelera</label>
                                <select
                                    className="input-luxury"
                                    value={filtroSedeDash}
                                    onChange={(e) => setFiltroSedeDash(e.target.value)}
                                >
                                    <option value="">Todas las propiedades (Consolidado)</option>
                                    {hoteles.map((h) => (
                                        <option key={h.id_hotel} value={h.nombre}>
                                            {h.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-5">
                                <label className="input-label">Periodo Anual</label>
                                <select
                                    className="input-luxury"
                                    value={filtroAnioDash}
                                    onChange={(e) => setFiltroAnioDash(e.target.value)}
                                >
                                    <option value="">Histórico Completo (2020 – 2026)</option>
                                    {aniosLista.map((a) => (
                                        <option key={a} value={a}>
                                            Año {a}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2 d-flex align-items-end">
                                <button
                                    type="button"
                                    className="btn-luxury-outline w-100 justify-content-center"
                                    onClick={() => {
                                        setFiltroSedeDash('');
                                        setFiltroAnioDash('');
                                    }}
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>

                        {/* ===== KPIs ===== */}
                        <div className="row g-3 mb-4">
                            <div className="col-12 col-sm-6 col-xl-3">
                                <div
                                    className="stat-box wow-kpi wow-kpi-dark wow-card wow-fade d-flex justify-content-between align-items-center h-100"
                                    style={{ animationDelay: '0.05s' }}
                                >
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div className="small fw-medium" style={{ color: '#d6d3d1' }}>
                                            Ingresos Efectivos
                                        </div>
                                        <h4 className="fw-bold mb-0 mt-1 wow-gold-text" style={{ fontSize: '1.6rem' }}>
                                            {formatoMonedaCompacto(ingresosTotales)}
                                        </h4>
                                        <small style={{ color: '#a8a29e' }}>Sin contar cancelaciones</small>
                                        <svg
                                            viewBox="0 0 120 36"
                                            width="120"
                                            height="36"
                                            className="d-block mt-2"
                                            aria-hidden="true"
                                        >
                                            <defs>
                                                <linearGradient id="wowSparkFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path d={sparkArea} fill="url(#wowSparkFill)" />
                                            <polyline
                                                points={sparkLinea}
                                                fill="none"
                                                stroke="#fbbf24"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeDasharray="400"
                                                style={{ animation: 'wowDraw 1.4s ease both' }}
                                            />
                                        </svg>
                                    </div>
                                    <div className="brand-badge" style={{ position: 'relative', zIndex: 1 }}>
                                        <i className="bi bi-cash-stack"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div
                                    className="stat-box wow-kpi wow-kpi-accent-emerald wow-card wow-fade d-flex justify-content-between align-items-center h-100"
                                    style={{ animationDelay: '0.15s' }}
                                >
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div className="text-muted small fw-medium">Reservaciones Efectivas</div>
                                        <h4 className="fw-bold mb-0 mt-1" style={{ fontSize: '1.6rem' }}>
                                            {reservasEfectivas.length}
                                        </h4>
                                        <small className="text-muted">
                                            De {reservasFiltradasDash.length} registradas
                                        </small>
                                        <div
                                            className="mt-2 rounded-pill overflow-hidden"
                                            style={{ height: '5px', background: '#e7e5e4', maxWidth: '130px' }}
                                        >
                                            <div
                                                className="h-100 rounded-pill wow-hbar"
                                                style={{
                                                    width: `${reservasFiltradasDash.length > 0 ? (reservasEfectivas.length / reservasFiltradasDash.length) * 100 : 0}%`,
                                                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="brand-badge" style={{ position: 'relative', zIndex: 1 }}>
                                        <i className="bi bi-calendar2-check"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div
                                    className="stat-box wow-kpi wow-kpi-accent-amber wow-card wow-fade d-flex justify-content-between align-items-center h-100"
                                    style={{ animationDelay: '0.25s' }}
                                >
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div className="text-muted small fw-medium">Ticket Promedio</div>
                                        <h4 className="fw-bold mb-0 mt-1" style={{ fontSize: '1.6rem' }}>
                                            {formatoMonedaCompacto(ticketPromedio)}
                                        </h4>
                                        <small className="text-muted">Promedio por estancia</small>
                                    </div>
                                    <div className="brand-badge" style={{ position: 'relative', zIndex: 1 }}>
                                        <i className="bi bi-receipt"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div
                                    className="stat-box wow-kpi wow-kpi-accent-rose wow-card wow-fade d-flex justify-content-between align-items-center h-100"
                                    style={{ animationDelay: '0.35s' }}
                                >
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div className="text-muted small fw-medium">Cancelaciones</div>
                                        <h4
                                            className="fw-bold mb-0 mt-1 text-danger"
                                            style={{ fontSize: '1.6rem' }}
                                        >
                                            {reservasCanceladas.length}
                                        </h4>
                                        <small className="text-muted">
                                            {reservasFiltradasDash.length > 0
                                                ? `${((reservasCanceladas.length / reservasFiltradasDash.length) * 100).toFixed(1)}% del total`
                                                : '0% del total'}
                                        </small>
                                        <div
                                            className="mt-2 rounded-pill overflow-hidden"
                                            style={{ height: '5px', background: '#e7e5e4', maxWidth: '130px' }}
                                        >
                                            <div
                                                className="h-100 rounded-pill wow-hbar"
                                                style={{
                                                    width: `${tasaCancelacion}%`,
                                                    background: 'linear-gradient(90deg, #e11d48, #fb7185)',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="brand-badge" style={{ position: 'relative', zIndex: 1 }}>
                                        <i className="bi bi-x-octagon"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ===== Insights rápidos ===== */}
                        <div className="row g-3 mb-4">
                            <div className="col-12 col-md-4">
                                <div className="wow-insight wow-card wow-fade" style={{ animationDelay: '0.4s' }}>
                                    <div className="wow-insight-label">
                                        <i className="bi bi-trophy-fill me-1"></i> Mejor año
                                    </div>
                                    <div className="fw-bold fs-5 mt-1">
                                        {mejorAnio.reservas > 0 ? mejorAnio.anio : '—'}
                                    </div>
                                    <small className="text-muted">
                                        {mejorAnio.reservas > 0
                                            ? `${mejorAnio.reservas} estancias · ${formatoMonedaCompacto(mejorAnio.ingresos)}`
                                            : 'Sin datos en el filtro actual'}
                                    </small>
                                </div>
                            </div>
                            <div className="col-12 col-md-4">
                                <div className="wow-insight wow-card wow-fade" style={{ animationDelay: '0.48s' }}>
                                    <div className="wow-insight-label">
                                        <i className="bi bi-lightning-charge-fill me-1"></i> Mes pico
                                    </div>
                                    <div className="fw-bold fs-5 mt-1">
                                        {mesPico.reservas > 0 ? mesPico.mesNombre : '—'}
                                    </div>
                                    <small className="text-muted">
                                        {mesPico.reservas > 0
                                            ? `${mesPico.reservas} reservaciones · ${formatoMonedaCompacto(mesPico.ingresos)}`
                                            : 'Sin datos en el filtro actual'}
                                    </small>
                                </div>
                            </div>
                            <div className="col-12 col-md-4">
                                <div className="wow-insight wow-card wow-fade" style={{ animationDelay: '0.56s' }}>
                                    <div className="wow-insight-label">
                                        <i className="bi bi-gem me-1"></i> Categoría líder
                                    </div>
                                    <div className="fw-bold fs-5 mt-1">
                                        {catLider.ingresos > 0 ? catLider.nombre : '—'}
                                    </div>
                                    <small className="text-muted">
                                        {catLider.ingresos > 0
                                            ? `${formatoMonedaCompacto(catLider.ingresos)} en ingresos`
                                            : 'Sin datos en el filtro actual'}
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div className="row g-4">
                            {/* ===== Temporadas ===== */}
                            <div className="col-12 col-lg-6">
                                <div
                                    className="p-4 rounded-4 border h-100 bg-white shadow-sm wow-panel wow-card wow-fade"
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h6 className="fw-bold mb-0">
                                                <i className="bi bi-sun-fill text-warning me-2"></i>
                                                Ocupación e Ingresos por Temporada
                                            </h6>
                                            <small className="text-muted">
                                                Comparativa entre Temporada Alta, Media y Baja
                                            </small>
                                        </div>
                                        <span className="badge-soft badge-amber">Estacionalidad</span>
                                    </div>

                                    <div className="d-flex justify-content-center my-3">
                                        <svg
                                            viewBox="0 0 120 120"
                                            width="150"
                                            height="150"
                                            role="img"
                                            aria-label="Distribución de reservaciones por temporada"
                                        >
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r={RADIO_DONUT}
                                                fill="none"
                                                stroke="#f5f5f4"
                                                strokeWidth="12"
                                            />
                                            <g transform="rotate(-90 60 60)">
                                                {segmentosDonut.map((s, i) =>
                                                    s.largo > 0 ? (
                                                        <circle
                                                            key={i}
                                                            className="wow-donut-seg"
                                                            cx="60"
                                                            cy="60"
                                                            r={RADIO_DONUT}
                                                            fill="none"
                                                            stroke={s.color}
                                                            strokeWidth="12"
                                                            strokeDasharray={`${Math.max(0, s.largo - 1.5)} ${CIRC_DONUT}`}
                                                            strokeDashoffset={s.offset}
                                                            strokeLinecap="butt"
                                                        >
                                                            <title>{`${s.etiqueta}: ${s.reservas} res.`}</title>
                                                        </circle>
                                                    ) : null
                                                )}
                                            </g>
                                            <text
                                                x="60"
                                                y="58"
                                                textAnchor="middle"
                                                style={{ fontSize: '20px', fontWeight: 800, fill: '#18181b' }}
                                            >
                                                {reservasEfectivas.length}
                                            </text>
                                            <text
                                                x="60"
                                                y="74"
                                                textAnchor="middle"
                                                style={{ fontSize: '8px', fill: '#78716c', letterSpacing: '0.08em' }}
                                            >
                                                ESTANCIAS
                                            </text>
                                        </svg>
                                    </div>

                                    <div className="d-flex flex-column gap-3 mt-3">
                                        {datosTemporadas.map((t, idx) => {
                                            const pctBarra = Math.max(
                                                6,
                                                Math.round((t.reservas / maxTempReservas) * 100)
                                            );
                                            const pctTotal =
                                                reservasEfectivas.length > 0
                                                    ? ((t.reservas / reservasEfectivas.length) * 100).toFixed(1)
                                                    : '0.0';
                                            return (
                                                <div key={idx}>
                                                    <div className="d-flex justify-content-between small mb-1">
                                                        <span className="fw-semibold text-dark">
                                                            <span
                                                                className="d-inline-block rounded-circle me-2"
                                                                style={{
                                                                    width: '9px',
                                                                    height: '9px',
                                                                    backgroundColor: t.color,
                                                                }}
                                                            />
                                                            {t.etiqueta}
                                                        </span>
                                                        <span className="text-muted">
                                                            <strong>{t.reservas}</strong> res. ({pctTotal}%) ·{' '}
                                                            <strong style={{ color: '#065f46' }}>
                                                                {formatoMonedaCompacto(t.ingresos)}
                                                            </strong>
                                                        </span>
                                                    </div>
                                                    <div
                                                        className="w-100 bg-light rounded-pill overflow-hidden"
                                                        style={{ height: '12px' }}
                                                    >
                                                        <div
                                                            className="h-100 rounded-pill wow-hbar"
                                                            style={{
                                                                width: `${pctBarra}%`,
                                                                background: `linear-gradient(90deg, ${t.color}, ${t.color}cc)`,
                                                                boxShadow: `0 0 12px ${t.color}66`,
                                                                animationDelay: `${0.1 * idx}s`,
                                                                transition: 'width 0.4s ease',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* ===== Evolución anual ===== */}
                            <div className="col-12 col-lg-6">
                                <div
                                    className="p-4 rounded-4 border h-100 bg-white shadow-sm d-flex flex-column justify-content-between wow-panel wow-card wow-fade"
                                    style={{ animationDelay: '0.3s' }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h6 className="fw-bold mb-0">
                                                <i className="bi bi-graph-up-arrow text-success me-2"></i>
                                                Evolución Anual de Reservaciones (2020 – 2026)
                                            </h6>
                                            <small className="text-muted">
                                                Volumen de estancias e ingresos por año
                                            </small>
                                        </div>
                                        <span className="badge-soft badge-emerald">Histórico</span>
                                    </div>

                                    <div
                                        className="d-flex align-items-end justify-content-between gap-2 pt-4 pb-2 px-2 border-bottom wow-grid-bg"
                                        style={{ height: '220px' }}
                                    >
                                        {datosAnuales.map((d, idx) => {
                                            const alturaPx = Math.max(
                                                14,
                                                Math.round((d.reservas / maxAnioReservas) * 145)
                                            );
                                            const activo = filtroAnioDash === d.anio;
                                            const esMejor = mejorAnio.reservas > 0 && d.anio === mejorAnio.anio;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="d-flex flex-column align-items-center flex-fill wow-vcol"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() =>
                                                        setFiltroAnioDash(activo ? '' : d.anio)
                                                    }
                                                    title={`${d.anio}: ${d.reservas} reservaciones (${formatoMonedaCompacto(d.ingresos)})`}
                                                >
                                                    <span
                                                        className="fw-bold text-dark mb-1"
                                                        style={{ fontSize: '0.75rem' }}
                                                    >
                                                        {esMejor && (
                                                            <i
                                                                className="bi bi-star-fill me-1"
                                                                style={{ color: '#f59e0b', fontSize: '0.65rem' }}
                                                            ></i>
                                                        )}
                                                        {d.reservas}
                                                    </span>
                                                    <div
                                                        className={`w-100 rounded-top-3 wow-vbar ${activo || esMejor ? 'wow-star' : ''}`}
                                                        style={{
                                                            maxWidth: '42px',
                                                            height: `${alturaPx}px`,
                                                            background: activo
                                                                ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)'
                                                                : esMejor
                                                                    ? 'linear-gradient(180deg, #27272a 0%, #d97706 140%)'
                                                                    : 'linear-gradient(180deg, #18181b 0%, #3f3f46 100%)',
                                                            animationDelay: `${0.07 * idx}s`,
                                                            transition: 'height 0.4s ease',
                                                        }}
                                                    />
                                                    <span
                                                        className="small fw-semibold mt-2"
                                                        style={{ color: activo ? '#d97706' : '#78716c' }}
                                                    >
                                                        {d.anio}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
                                        <span>Haz clic en una barra anual para filtrar el tablero</span>
                                        <span className="fw-semibold text-dark">
                                            Total: {reservasEfectivas.length} estancias
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ===== Mensual ===== */}
                            <div className="col-12 col-lg-7">
                                <div
                                    className="p-4 rounded-4 border h-100 bg-white shadow-sm d-flex flex-column justify-content-between wow-panel wow-card wow-fade"
                                    style={{ animationDelay: '0.4s' }}
                                >
                                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                                        <div>
                                            <h6 className="fw-bold mb-0">
                                                <i className="bi bi-calendar3-range text-primary me-2"></i>
                                                Comportamiento Mensual Acumulado
                                            </h6>
                                            <small className="text-muted">
                                                Picos de demanda mensual (Dorado: Meses de Temporada Alta)
                                            </small>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 small">
                                            <span className="badge-soft badge-amber">Alta Demanda</span>
                                            <span className="badge-soft badge-stone">Regular</span>
                                        </div>
                                    </div>

                                    <div
                                        className="d-flex align-items-end justify-content-between gap-1 pt-4 pb-2 px-1 border-bottom wow-grid-bg"
                                        style={{ height: '210px' }}
                                    >
                                        {datosMensuales.map((m, idx) => {
                                            const alturaPx = Math.max(
                                                12,
                                                Math.round((m.reservas / maxMesReservas) * 140)
                                            );
                                            const esPico = mesPico.reservas > 0 && m.mesNombre === mesPico.mesNombre;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="d-flex flex-column align-items-center flex-fill wow-vcol"
                                                    title={`${m.mesNombre}: ${m.reservas} reservaciones (${formatoMonedaCompacto(m.ingresos)})`}
                                                >
                                                    <span
                                                        className="fw-bold text-dark mb-1"
                                                        style={{ fontSize: '0.7rem' }}
                                                    >
                                                        {m.reservas}
                                                    </span>
                                                    <div
                                                        className={`w-100 rounded-top-2 wow-vbar ${esPico ? 'wow-star' : ''}`}
                                                        style={{
                                                            maxWidth: '28px',
                                                            height: `${alturaPx}px`,
                                                            background: m.esTemporadaAlta
                                                                ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)'
                                                                : 'linear-gradient(180deg, #94a3b8 0%, #475569 100%)',
                                                            animationDelay: `${0.05 * idx}s`,
                                                            transition: 'height 0.4s ease',
                                                        }}
                                                    />
                                                    <span
                                                        className="fw-medium mt-2"
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            color: m.esTemporadaAlta ? '#b45309' : '#78716c',
                                                        }}
                                                    >
                                                        {m.mesNombre}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="small text-muted mt-2">
                                        Los meses de <strong>Julio, Agosto, Diciembre, Enero, Marzo y Abril</strong> concentran el mayor flujo turístico.
                                    </div>
                                </div>
                            </div>

                            {/* ===== Categorías ===== */}
                            <div className="col-12 col-lg-5">
                                <div
                                    className="p-4 rounded-4 border h-100 bg-white shadow-sm wow-panel wow-card wow-fade"
                                    style={{ animationDelay: '0.5s' }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <h6 className="fw-bold mb-0">
                                                <i className="bi bi-tags-fill text-warning me-2"></i>
                                                Rentabilidad por Tipo de Habitación
                                            </h6>
                                            <small className="text-muted">
                                                Ingresos y volumen por categoría tarifaria
                                            </small>
                                        </div>
                                        <span className="badge-soft badge-stone">Categorías</span>
                                    </div>

                                    <div className="d-flex flex-column gap-3 mt-3">
                                        {datosCategorias.map((cat, idx) => {
                                            const pctAncho = Math.max(
                                                8,
                                                Math.round((cat.ingresos / maxCatIngresos) * 100)
                                            );
                                            const pctIngresos =
                                                ingresosTotales > 0
                                                    ? ((cat.ingresos / ingresosTotales) * 100).toFixed(1)
                                                    : '0.0';
                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-3 rounded-3 border bg-light wow-card"
                                                    style={{ borderLeft: `4px solid ${cat.color}` }}
                                                >
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span className="fw-bold text-dark d-flex align-items-center gap-2">
                                                            <span
                                                                className="wow-cat-rank"
                                                                style={{ background: cat.color }}
                                                            >
                                                                {idx + 1}
                                                            </span>
                                                            {cat.nombre}
                                                        </span>
                                                        <span
                                                            className="fw-bold"
                                                            style={{ color: '#065f46' }}
                                                        >
                                                            {formatoMonedaCompacto(cat.ingresos)}
                                                        </span>
                                                    </div>
                                                    <div className="d-flex justify-content-between small text-muted mb-2">
                                                        <span>{cat.reservas} reservaciones</span>
                                                        <span>{pctIngresos}% de los ingresos</span>
                                                    </div>
                                                    <div
                                                        className="w-100 bg-white rounded-pill overflow-hidden border"
                                                        style={{ height: '10px' }}
                                                    >
                                                        <div
                                                            className="h-100 rounded-pill wow-hbar"
                                                            style={{
                                                                width: `${pctAncho}%`,
                                                                background: `linear-gradient(90deg, ${cat.color}, ${cat.color}bb)`,
                                                                boxShadow: `0 0 10px ${cat.color}55`,
                                                                animationDelay: `${0.12 * idx}s`,
                                                                transition: 'width 0.4s ease',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {vistaReporte === 'recepcion' && (
                    <div>
                        <div className="row g-3 mb-4 p-3 rounded-4 border" style={{ backgroundColor: '#fafaf9' }}>
                            <div className="col-md-4">
                                <label className="input-label">Propiedad Activa</label>
                                <select
                                    className="input-luxury"
                                    value={filtroHotel}
                                    onChange={(e) => setFiltroHotel(e.target.value)}
                                >
                                    <option value="">Todas las propiedades</option>
                                    {hoteles
                                        .filter((h) => h.activo)
                                        .map((h) => (
                                            <option key={h.id_hotel} value={h.nombre}>{h.nombre}</option>
                                        ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="input-label">Categoría de Alojamiento</label>
                                <select
                                    className="input-luxury"
                                    value={filtroTipo}
                                    onChange={(e) => setFiltroTipo(e.target.value)}
                                >
                                    <option value="">Todas las categorías</option>
                                    {tipos.map((t) => (
                                        <option key={t.id_tipo} value={t.nombre}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="input-label">Capacidad Mínima</label>
                                <input
                                    type="number"
                                    className="input-luxury"
                                    placeholder="Huéspedes requeridos..."
                                    value={filtroCapacidad}
                                    onChange={(e) => setFiltroCapacidad(e.target.value)}
                                />
                            </div>
                        </div>

                        {disponiblesFiltradas.length === 0 ? (
                            <div className="text-center py-5">
                                <i className="bi bi-calendar2-x fs-1 text-muted"></i>
                                <h6 className="fw-bold mt-2">No existen habitaciones disponibles actualmente</h6>
                            </div>
                        ) : (
                            <div className="table-responsive border rounded-4">
                                <table className="table-luxury">
                                    <thead>
                                        <tr>
                                            <th>Propiedad</th>
                                            <th>Unidad</th>
                                            <th>Nivel</th>
                                            <th>Categoría</th>
                                            <th>Capacidad</th>
                                            <th>Tarifa Base</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {disponiblesFiltradas.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="fw-bold">{item.hotel}</td>
                                                <td><span className="badge-soft badge-stone">#{item.habitacion}</span></td>
                                                <td>Piso {item.piso}</td>
                                                <td>{item.tipo}</td>
                                                <td>{item.capacidad} huéspedes</td>
                                                <td className="fw-bold" style={{ color: '#065f46' }}>{formatoMoneda(item.precioBase)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {vistaReporte === 'matriz' && (
                    <div className="table-responsive border rounded-4">
                        <table className="table-luxury">
                            <thead>
                                <tr>
                                    <th>Propiedad</th>
                                    <th>Habitación</th>
                                    <th>Nivel</th>
                                    <th>Estatus</th>
                                    <th>Categoría</th>
                                    <th>Capacidad</th>
                                    <th>Tarifa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {distribucion.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="fw-bold">{item.hotel}</td>
                                        <td><span className="badge-soft badge-stone">#{item.habitacion}</span></td>
                                        <td>Piso {item.piso}</td>
                                        <td>
                                            <span className={`badge-soft ${badgeClass(item.estado)}`}>
                                                <span className="dot"></span>
                                                {item.estado}
                                            </span>
                                        </td>
                                        <td>{item.tipo}</td>
                                        <td>{item.capacidad} personas</td>
                                        <td className="fw-bold" style={{ color: '#065f46' }}>{formatoMoneda(item.precioBase)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {vistaReporte === 'resumen' && (
                    <div className="row g-3">
                        {conteo.map((item, idx) => (
                            <div className="col-md-6" key={idx}>
                                <div
                                    className="stat-box wow-card wow-fade d-flex justify-content-between align-items-center"
                                    style={{ animationDelay: `${0.08 * idx}s` }}
                                >
                                    <div>
                                        <span className="badge-soft badge-emerald mb-2">Propiedad Activa</span>
                                        <h5 className="fw-bold mb-0">{item.hotel}</h5>
                                        <small className="text-muted">Unidades listas para Check-in inmediato</small>
                                    </div>
                                    <div className="text-end">
                                        <div className="display-6 fw-bold" style={{ color: '#065f46' }}>
                                            {item.habitacionesDisponibles}
                                        </div>
                                        <small className="text-muted">Disponibles</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}