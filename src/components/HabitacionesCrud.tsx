import { useEffect, useState } from 'react';
import type { Habitacion, Hotel, TipoHabitacion } from '../types';
import {
    obtenerHabitaciones,
    obtenerHoteles,
    obtenerTipos,
    crearHabitacion,
    actualizarHabitacion,
    eliminarHabitacion,
} from '../services/api';

export default function HabitacionesCrud() {
    const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
    const [hoteles, setHoteles] = useState<Hotel[]>([]);
    const [tipos, setTipos] = useState<TipoHabitacion[]>([]);

    const formInicial = {
        id_hotel: '',
        id_tipo: '',
        numero: '',
        piso: 1,
        estado: 'Disponible',
    };

    const [form, setForm] = useState(formInicial);
    const [editandoId, setEditandoId] = useState<number | null>(null);

    const [modalFormAbierto, setModalFormAbierto] = useState(false);
    const [habDetalle, setHabDetalle] = useState<Habitacion | null>(null);
    const [habAEliminar, setHabAEliminar] = useState<Habitacion | null>(null);

    const [exito, setExito] = useState<string | null>(null);
    const [errorBanner, setErrorBanner] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<string | null>(null);
    const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});

    const formatoMoneda = (valor: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);

    const badgeClass = (estado: string) => {
        if (estado === 'Disponible') return 'badge-emerald';
        if (estado === 'Ocupada') return 'badge-rose';
        return 'badge-amber';
    };

    const cargarTodo = async () => {
        try {
            const [habs, hots, tips] = await Promise.all([
                obtenerHabitaciones(),
                obtenerHoteles(),
                obtenerTipos(),
            ]);
            setHabitaciones(habs);
            setHoteles(hots);
            setTipos(tips);
        } catch {
            setErrorBanner('Error al cargar el inventario de habitaciones.');
        }
    };

    useEffect(() => {
        cargarTodo();
    }, []);

    useEffect(() => {
        if (exito || errorBanner) {
            const timer = setTimeout(() => {
                setExito(null);
                setErrorBanner(null);
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [exito, errorBanner]);

    const abrirModalNuevo = () => {
        setForm(formInicial);
        setEditandoId(null);
        setErrorModal(null);
        setErroresCampo({});
        setModalFormAbierto(true);
    };

    const abrirModalEditar = (ha: Habitacion) => {
        setForm({
            id_hotel: String(ha.hotel?.id_hotel || ''),
            id_tipo: String(ha.tipoHabitacion?.id_tipo || ''),
            numero: ha.numero,
            piso: ha.piso,
            estado: ha.estado,
        });
        setEditandoId(ha.id_habitacion!);
        setErrorModal(null);
        setErroresCampo({});
        setModalFormAbierto(true);
    };

    const manejarSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorModal(null);
        setErroresCampo({});

        if (!form.id_hotel || !form.id_tipo) {
            setErrorModal('Debe seleccionar una propiedad y una categoría de habitación.');
            return;
        }

        const payload = {
            hotel: { id_hotel: Number(form.id_hotel) },
            tipoHabitacion: { id_tipo: Number(form.id_tipo) },
            numero: form.numero,
            piso: Number(form.piso),
            estado: form.estado,
        };

        try {
            if (editandoId) {
                const res = await actualizarHabitacion(editandoId, payload);
                setExito(res.mensaje);
            } else {
                const res = await crearHabitacion(payload);
                setExito(res.mensaje);
            }
            setModalFormAbierto(false);
            cargarTodo();
        } catch (err: any) {
            setErrorModal(err.mensaje || 'Error al registrar la habitación.');
            if (err.errores) setErroresCampo(err.errores);
        }
    };

    const confirmarEliminacion = async () => {
        if (!habAEliminar) return;
        setErrorBanner(null);
        try {
            const res = await eliminarHabitacion(habAEliminar.id_habitacion!);
            setExito(res.mensaje);
            setHabAEliminar(null);
            cargarTodo();
        } catch (err: any) {
            setErrorBanner(err.mensaje || 'No se pudo eliminar la unidad.');
            setHabAEliminar(null);
        }
    };

    return (
        <div>
            {exito && (
                <div className="alert alert-success border-0 rounded-4 shadow-sm d-flex justify-content-between align-items-center mb-4">
                    <div><i className="bi bi-check-circle-fill me-2"></i>{exito}</div>
                    <button className="btn-close" onClick={() => setExito(null)}></button>
                </div>
            )}
            {errorBanner && (
                <div className="alert alert-danger border-0 rounded-4 shadow-sm d-flex justify-content-between align-items-center mb-4">
                    <div><i className="bi bi-exclamation-octagon-fill me-2"></i>{errorBanner}</div>
                    <button className="btn-close" onClick={() => setErrorBanner(null)}></button>
                </div>
            )}

            <div className="luxury-card">
                <div className="luxury-card-header">
                    <div>
                        <h5 className="fw-bold mb-1">Inventario de Habitaciones</h5>
                        <p className="text-muted small mb-0">Administra la numeración de cuartos, pisos y disponibilidad física por hotel.</p>
                    </div>
                    <button className="btn-luxury-primary" onClick={abrirModalNuevo}>
                        <i className="bi bi-plus-lg"></i>
                        <span>Asignar Habitación</span>
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table-luxury">
                        <thead>
                            <tr>
                                <th>Propiedad</th>
                                <th>Unidad / Piso</th>
                                <th>Categoría Asignada</th>
                                <th>Tarifa por Noche</th>
                                <th>Estatus Actual</th>
                                <th className="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {habitaciones.map((ha) => (
                                <tr key={ha.id_habitacion}>
                                    <td>
                                        <div className="fw-bold">{ha.hotel?.nombre}</div>
                                        <small className="text-muted">{ha.hotel?.ciudad}</small>
                                    </td>
                                    <td>
                                        <span className="fw-bold">Habitación #{ha.numero}</span>
                                        <small className="text-muted d-block">Piso {ha.piso}</small>
                                    </td>
                                    <td>
                                        <div className="fw-medium">{ha.tipoHabitacion?.nombre}</div>
                                        <small className="text-muted">Máx. {ha.tipoHabitacion?.capacidad} personas</small>
                                    </td>
                                    <td className="fw-bold" style={{ color: '#065f46' }}>
                                        {formatoMoneda(ha.tipoHabitacion?.precio_base || 0)}
                                    </td>
                                    <td>
                                        <span className={`badge-soft ${badgeClass(ha.estado)}`}>
                                            <span className="dot"></span>
                                            {ha.estado}
                                        </span>
                                    </td>
                                    <td className="text-end">
                                        <button className="action-icon-btn me-1" title="Ver Detalle" onClick={() => setHabDetalle(ha)}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button className="action-icon-btn me-1" title="Editar" onClick={() => abrirModalEditar(ha)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="action-icon-btn delete" title="Eliminar" onClick={() => setHabAEliminar(ha)}>
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL CREAR / EDITAR HABITACIÓN */}
            {modalFormAbierto && (
                <div className="modal-backdrop-custom" onClick={() => setModalFormAbierto(false)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-header">
                            <h6 className="fw-bold mb-0">
                                {editandoId ? 'Modificar Habitación' : 'Asignar Nueva Habitación'}
                            </h6>
                            <button className="btn-close" onClick={() => setModalFormAbierto(false)}></button>
                        </div>
                        <form onSubmit={manejarSubmit}>
                            <div className="modal-window-body">
                                {errorModal && (
                                    <div className="alert alert-danger py-2 small rounded-3">
                                        <strong>{errorModal}</strong>
                                        {Object.keys(erroresCampo).length > 0 && (
                                            <ul className="mb-0 mt-1 ps-3">
                                                {Object.entries(erroresCampo).map(([k, v]) => (
                                                    <li key={k}>{v}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="input-label">Propiedad Hotelera *</label>
                                    <select
                                        className="input-luxury"
                                        value={form.id_hotel}
                                        onChange={(e) => setForm({ ...form, id_hotel: e.target.value })}
                                    >
                                        <option value="">-- Seleccione una Propiedad --</option>
                                        {hoteles.map((h) => (
                                            <option key={h.id_hotel} value={h.id_hotel}>
                                                {h.nombre} {!h.activo ? '(Inactivo)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="input-label">Categoría de Habitación *</label>
                                    <select
                                        className="input-luxury"
                                        value={form.id_tipo}
                                        onChange={(e) => setForm({ ...form, id_tipo: e.target.value })}
                                    >
                                        <option value="">-- Seleccione una Categoría --</option>
                                        {tipos.map((t) => (
                                            <option key={t.id_tipo} value={t.id_tipo}>
                                                {t.nombre} — {formatoMoneda(t.precio_base)} ({t.capacidad} pers.)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="input-label">Número de Habitación *</label>
                                        <input
                                            type="text"
                                            className="input-luxury"
                                            value={form.numero}
                                            onChange={(e) => setForm({ ...form, numero: e.target.value })}
                                            placeholder="Ej. 101, 205"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="input-label">Piso / Nivel *</label>
                                        <input
                                            type="number"
                                            className="input-luxury"
                                            value={form.piso}
                                            onChange={(e) => setForm({ ...form, piso: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className="input-label">Estado Operativo *</label>
                                    <select
                                        className="input-luxury"
                                        value={form.estado}
                                        onChange={(e) => setForm({ ...form, estado: e.target.value })}
                                    >
                                        <option value="Disponible">Disponible</option>
                                        <option value="Ocupada">Ocupada</option>
                                        <option value="Mantenimiento">Mantenimiento</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-window-footer">
                                <button type="button" className="btn-luxury-outline" onClick={() => setModalFormAbierto(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-luxury-primary">
                                    {editandoId ? 'Guardar Cambios' : 'Registrar Habitación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETALLE */}
            {habDetalle && (
                <div className="modal-backdrop-custom" onClick={() => setHabDetalle(null)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-header">
                            <h6 className="fw-bold mb-0">Expediente de Unidad #{habDetalle.numero}</h6>
                            <button className="btn-close" onClick={() => setHabDetalle(null)}></button>
                        </div>
                        <div className="modal-window-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h4 className="fw-bold mb-0">Habitación #{habDetalle.numero}</h4>
                                    <span className="text-muted small">{habDetalle.hotel?.nombre} — Piso {habDetalle.piso}</span>
                                </div>
                                <span className={`badge-soft ${badgeClass(habDetalle.estado)}`}>
                                    <span className="dot"></span>
                                    {habDetalle.estado}
                                </span>
                            </div>
                            <div className="p-3 bg-light rounded-3 border">
                                <div className="mb-2"><strong>Categoría:</strong> {habDetalle.tipoHabitacion?.nombre}</div>
                                <div className="mb-2"><strong>Capacidad:</strong> {habDetalle.tipoHabitacion?.capacidad} huéspedes</div>
                                <div><strong>Tarifa Base:</strong> {formatoMoneda(habDetalle.tipoHabitacion?.precio_base || 0)} / noche</div>
                            </div>
                        </div>
                        <div className="modal-window-footer">
                            <button className="btn-luxury-outline" onClick={() => setHabDetalle(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR */}
            {habAEliminar && (
                <div className="modal-backdrop-custom" onClick={() => setHabAEliminar(null)}>
                    <div className="modal-window" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-body text-center p-4">
                            <div className="mb-3 text-danger fs-1"><i className="bi bi-exclamation-circle"></i></div>
                            <h5 className="fw-bold mb-2">¿Eliminar habitación #{habAEliminar.numero}?</h5>
                            <p className="text-muted small mb-0">
                                Se dará de baja del inventario de <strong>{habAEliminar.hotel?.nombre}</strong>.
                            </p>
                        </div>
                        <div className="modal-window-footer justify-content-center">
                            <button className="btn-luxury-outline" onClick={() => setHabAEliminar(null)}>Cancelar</button>
                            <button className="btn btn-danger rounded-3 px-4" onClick={confirmarEliminacion}>Sí, eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}