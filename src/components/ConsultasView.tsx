import { useEffect, useState } from 'react';
import type { Hotel, TipoHabitacion } from '../types';
import {
    consultarDisponibles,
    consultarDistribucion,
    consultarConteoDisponibles,
    obtenerHoteles,
    obtenerTipos,
} from '../services/api';

const hostActual = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE = (import.meta as any).env?.VITE_API_URL || `http://${hostActual}:8082/api`;
const API_RESERVACIONES = `${API_BASE}/reservaciones`;

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

    return (
        <div className="luxury-card">
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
                        <div className="row g-3 mb-4 p-3 rounded-4 border" style={{ backgroundColor: '#fafaf9' }}>
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

                        <div className="row g-3 mb-4">
                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="stat-box d-flex justify-content-between align-items-center h-100">
                                    <div>
                                        <div className="text-muted small fw-medium">Ingresos Efectivos</div>
                                        <h4 className="fw-bold mb-0 mt-1" style={{ color: '#065f46' }}>
                                            {formatoMonedaCompacto(ingresosTotales)}
                                        </h4>
                                        <small className="text-muted">Sin contar cancelaciones</small>
                                    </div>
                                    <div className="brand-badge">
                                        <i className="bi bi-cash-stack"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="stat-box d-flex justify-content-between align-items-center h-100">
                                    <div>
                                        <div className="text-muted small fw-medium">Reservaciones Efectivas</div>
                                        <h4 className="fw-bold mb-0 mt-1">{reservasEfectivas.length}</h4>
                                        <small className="text-muted">
                                            De {reservasFiltradasDash.length} registradas
                                        </small>
                                    </div>
                                    <div className="brand-badge">
                                        <i className="bi bi-calendar2-check"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="stat-box d-flex justify-content-between align-items-center h-100">
                                    <div>
                                        <div className="text-muted small fw-medium">Ticket Promedio</div>
                                        <h4 className="fw-bold mb-0 mt-1">
                                            {formatoMonedaCompacto(ticketPromedio)}
                                        </h4>
                                        <small className="text-muted">Promedio por estancia</small>
                                    </div>
                                    <div className="brand-badge">
                                        <i className="bi bi-receipt"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-sm-6 col-xl-3">
                                <div className="stat-box d-flex justify-content-between align-items-center h-100">
                                    <div>
                                        <div className="text-muted small fw-medium">Cancelaciones</div>
                                        <h4 className="fw-bold mb-0 mt-1 text-danger">
                                            {reservasCanceladas.length}
                                        </h4>
                                        <small className="text-muted">
                                            {reservasFiltradasDash.length > 0
                                                ? `${((reservasCanceladas.length / reservasFiltradasDash.length) * 100).toFixed(1)}% del total`
                                                : '0% del total'}
                                        </small>
                                    </div>
                                    <div className="brand-badge">
                                        <i className="bi bi-x-octagon"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row g-4">
                            <div className="col-12 col-lg-6">
                                <div className="p-4 rounded-4 border h-100 bg-white shadow-sm">
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
                                                        <span className="fw-semibold text-dark">{t.etiqueta}</span>
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
                                                            className="h-100 rounded-pill"
                                                            style={{
                                                                width: `${pctBarra}%`,
                                                                backgroundColor: t.color,
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

                            <div className="col-12 col-lg-6">
                                <div className="p-4 rounded-4 border h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
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
                                        className="d-flex align-items-end justify-content-between gap-2 pt-4 pb-2 px-2 border-bottom"
                                        style={{ height: '220px' }}
                                    >
                                        {datosAnuales.map((d, idx) => {
                                            const alturaPx = Math.max(
                                                14,
                                                Math.round((d.reservas / maxAnioReservas) * 145)
                                            );
                                            const activo = filtroAnioDash === d.anio;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="d-flex flex-column align-items-center flex-fill"
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
                                                        {d.reservas}
                                                    </span>
                                                    <div
                                                        className="w-100 rounded-top-3"
                                                        style={{
                                                            maxWidth: '42px',
                                                            height: `${alturaPx}px`,
                                                            background: activo
                                                                ? '#d97706'
                                                                : 'linear-gradient(180deg, #18181b 0%, #3f3f46 100%)',
                                                            transition: 'height 0.4s ease',
                                                        }}
                                                    />
                                                    <span className="small fw-semibold text-muted mt-2">
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

                            <div className="col-12 col-lg-7">
                                <div className="p-4 rounded-4 border h-100 bg-white shadow-sm d-flex flex-column justify-content-between">
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
                                        className="d-flex align-items-end justify-content-between gap-1 pt-4 pb-2 px-1 border-bottom"
                                        style={{ height: '210px' }}
                                    >
                                        {datosMensuales.map((m, idx) => {
                                            const alturaPx = Math.max(
                                                12,
                                                Math.round((m.reservas / maxMesReservas) * 140)
                                            );
                                            return (
                                                <div
                                                    key={idx}
                                                    className="d-flex flex-column align-items-center flex-fill"
                                                    title={`${m.mesNombre}: ${m.reservas} reservaciones (${formatoMonedaCompacto(m.ingresos)})`}
                                                >
                                                    <span
                                                        className="fw-bold text-dark mb-1"
                                                        style={{ fontSize: '0.7rem' }}
                                                    >
                                                        {m.reservas}
                                                    </span>
                                                    <div
                                                        className="w-100 rounded-top-2"
                                                        style={{
                                                            maxWidth: '28px',
                                                            height: `${alturaPx}px`,
                                                            backgroundColor: m.esTemporadaAlta
                                                                ? '#f59e0b'
                                                                : '#64748b',
                                                            transition: 'height 0.4s ease',
                                                        }}
                                                    />
                                                    <span
                                                        className="text-muted fw-medium mt-2"
                                                        style={{ fontSize: '0.72rem' }}
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

                            <div className="col-12 col-lg-5">
                                <div className="p-4 rounded-4 border h-100 bg-white shadow-sm">
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
                                                <div key={idx} className="p-3 rounded-3 border bg-light">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span className="fw-bold text-dark">{cat.nombre}</span>
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
                                                            className="h-100 rounded-pill"
                                                            style={{
                                                                width: `${pctAncho}%`,
                                                                backgroundColor: cat.color,
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
                                <div className="stat-box d-flex justify-content-between align-items-center">
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