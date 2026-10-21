import { useEffect, useState } from 'react';
import type { Hotel, TipoHabitacion } from '../types';
import {
    consultarDisponibles,
    consultarDistribucion,
    consultarConteoDisponibles,
    obtenerHoteles,
    obtenerTipos,
} from '../services/api';

export default function ConsultasView() {
    const [vistaReporte, setVistaReporte] = useState<'recepcion' | 'matriz' | 'resumen'>('recepcion');
    const [disponibles, setDisponibles] = useState<any[]>([]);
    const [distribucion, setDistribucion] = useState<any[]>([]);
    const [conteo, setConteo] = useState<any[]>([]);

    const [hoteles, setHoteles] = useState<Hotel[]>([]);
    const [tipos, setTipos] = useState<TipoHabitacion[]>([]);

    const [filtroHotel, setFiltroHotel] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroCapacidad, setFiltroCapacidad] = useState('');
    const [error, setError] = useState<string | null>(null);

    const formatoMoneda = (valor: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);

    const badgeClass = (estado: string) => {
        if (estado === 'Disponible') return 'badge-emerald';
        if (estado === 'Ocupada') return 'badge-rose';
        return 'badge-amber';
    };

    const cargarConsultas = async () => {
        setError(null);
        try {
            const [resDisp, resDist, resCont, resHot, resTip] = await Promise.all([
                consultarDisponibles(),
                consultarDistribucion(),
                consultarConteoDisponibles(),
                obtenerHoteles(),
                obtenerTipos(),
            ]);
            setDisponibles(resDisp);
            setDistribucion(resDist);
            setConteo(resCont);
            setHoteles(resHot);
            setTipos(resTip);
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

    return (
        <div className="luxury-card">
            <div className="luxury-card-header">
                <div className="nav-pills-luxury">
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