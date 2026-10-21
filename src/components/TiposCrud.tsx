import { useEffect, useState } from 'react';
import type { TipoHabitacion } from '../types';
import { obtenerTipos, crearTipo, actualizarTipo, eliminarTipo } from '../services/api';

const tipoInicial: TipoHabitacion = {
    nombre: '',
    capacidad: 2,
    descripcion: '',
    precio_base: 0,
};

export default function TiposCrud() {
    const [tipos, setTipos] = useState<TipoHabitacion[]>([]);
    const [form, setForm] = useState<TipoHabitacion>(tipoInicial);
    const [editandoId, setEditandoId] = useState<number | null>(null);

    const [modalFormAbierto, setModalFormAbierto] = useState(false);
    const [tipoDetalle, setTipoDetalle] = useState<TipoHabitacion | null>(null);
    const [tipoAEliminar, setTipoAEliminar] = useState<TipoHabitacion | null>(null);

    const [exito, setExito] = useState<string | null>(null);
    const [errorBanner, setErrorBanner] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<string | null>(null);
    const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});

    const formatoMoneda = (valor: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);

    const cargarDatos = async () => {
        try {
            setTipos(await obtenerTipos());
        } catch {
            setErrorBanner('No se pudo cargar el catálogo de categorías.');
        }
    };

    useEffect(() => {
        cargarDatos();
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
        setForm(tipoInicial);
        setEditandoId(null);
        setErrorModal(null);
        setErroresCampo({});
        setModalFormAbierto(true);
    };

    const abrirModalEditar = (t: TipoHabitacion) => {
        setForm(t);
        setEditandoId(t.id_tipo!);
        setErrorModal(null);
        setErroresCampo({});
        setModalFormAbierto(true);
    };

    const manejarSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorModal(null);
        setErroresCampo({});
        try {
            if (editandoId) {
                const res = await actualizarTipo(editandoId, form);
                setExito(res.mensaje);
            } else {
                const res = await crearTipo(form);
                setExito(res.mensaje);
            }
            setModalFormAbierto(false);
            cargarDatos();
        } catch (err: any) {
            setErrorModal(err.mensaje || 'Error de validación.');
            if (err.errores) setErroresCampo(err.errores);
        }
    };

    const confirmarEliminacion = async () => {
        if (!tipoAEliminar) return;
        setErrorBanner(null);
        try {
            const res = await eliminarTipo(tipoAEliminar.id_tipo!);
            setExito(res.mensaje);
            setTipoAEliminar(null);
            cargarDatos();
        } catch (err: any) {
            setErrorBanner(err.mensaje || 'No se pudo eliminar la categoría.');
            setTipoAEliminar(null);
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
                        <h5 className="fw-bold mb-1">Catálogo de Categorías y Tarifas</h5>
                        <p className="text-muted small mb-0">Configura los tipos de habitación, aforo máximo y precios base por noche.</p>
                    </div>
                    <button className="btn-luxury-primary" onClick={abrirModalNuevo}>
                        <i className="bi bi-plus-lg"></i>
                        <span>Nueva Categoría</span>
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table-luxury">
                        <thead>
                            <tr>
                                <th>Categoría</th>
                                <th>Descripción de Amenidades</th>
                                <th>Capacidad</th>
                                <th>Tarifa Base</th>
                                <th className="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tipos.map((t) => (
                                <tr key={t.id_tipo}>
                                    <td>
                                        <div className="fw-bold">{t.nombre}</div>
                                        <small className="text-muted">ID #{t.id_tipo}</small>
                                    </td>
                                    <td className="text-muted" style={{ maxWidth: 380 }}>
                                        {t.descripcion || 'Sin descripción'}
                                    </td>
                                    <td>
                                        <span className="badge-soft badge-stone">
                                            <i className="bi bi-people me-1"></i>
                                            {t.capacidad} {t.capacidad === 1 ? 'huésped' : 'huéspedes'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="fw-bold fs-6" style={{ color: '#065f46' }}>
                                            {formatoMoneda(t.precio_base)}
                                        </span>
                                        <small className="text-muted d-block">por noche</small>
                                    </td>
                                    <td className="text-end">
                                        <button className="action-icon-btn me-1" title="Detalle" onClick={() => setTipoDetalle(t)}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button className="action-icon-btn me-1" title="Editar" onClick={() => abrirModalEditar(t)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="action-icon-btn delete" title="Eliminar" onClick={() => setTipoAEliminar(t)}>
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL CREAR / EDITAR */}
            {modalFormAbierto && (
                <div className="modal-backdrop-custom" onClick={() => setModalFormAbierto(false)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-header">
                            <h6 className="fw-bold mb-0">
                                {editandoId ? 'Modificar Categoría Tarifaria' : 'Nueva Categoría de Habitación'}
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
                                    <label className="input-label">Nombre de la Categoría *</label>
                                    <input
                                        type="text"
                                        className="input-luxury"
                                        value={form.nombre}
                                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                        placeholder="Ej. Master Suite Vista al Mar"
                                    />
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="input-label">Capacidad (Personas) *</label>
                                        <input
                                            type="number"
                                            className="input-luxury"
                                            value={form.capacidad}
                                            onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="input-label">Tarifa Base (MXN) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input-luxury"
                                            value={form.precio_base}
                                            onChange={(e) => setForm({ ...form, precio_base: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className="input-label">Descripción y Amenidades</label>
                                    <textarea
                                        className="input-luxury"
                                        rows={3}
                                        value={form.descripcion}
                                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                        placeholder="Detalle el equipamiento y tipo de camas..."
                                    />
                                </div>
                            </div>
                            <div className="modal-window-footer">
                                <button type="button" className="btn-luxury-outline" onClick={() => setModalFormAbierto(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-luxury-primary">
                                    {editandoId ? 'Actualizar Categoría' : 'Guardar Categoría'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETALLE */}
            {tipoDetalle && (
                <div className="modal-backdrop-custom" onClick={() => setTipoDetalle(null)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-header">
                            <h6 className="fw-bold mb-0">Especificación de Categoría #{tipoDetalle.id_tipo}</h6>
                            <button className="btn-close" onClick={() => setTipoDetalle(null)}></button>
                        </div>
                        <div className="modal-window-body">
                            <h4 className="fw-bold mb-1">{tipoDetalle.nombre}</h4>
                            <p className="text-muted mb-3">{tipoDetalle.descripcion || 'Sin descripción adicional.'}</p>
                            <div className="p-3 bg-light rounded-3 border d-flex justify-content-between">
                                <div>
                                    <small className="text-muted d-block">Ocupación Máxima</small>
                                    <strong>{tipoDetalle.capacidad} Huéspedes</strong>
                                </div>
                                <div className="text-end">
                                    <small className="text-muted d-block">Precio Base por Noche</small>
                                    <strong className="fs-5" style={{ color: '#065f46' }}>{formatoMoneda(tipoDetalle.precio_base)}</strong>
                                </div>
                            </div>
                        </div>
                        <div className="modal-window-footer">
                            <button className="btn-luxury-outline" onClick={() => setTipoDetalle(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR */}
            {tipoAEliminar && (
                <div className="modal-backdrop-custom" onClick={() => setTipoAEliminar(null)}>
                    <div className="modal-window" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-body text-center p-4">
                            <div className="mb-3 text-danger fs-1"><i className="bi bi-exclamation-circle"></i></div>
                            <h5 className="fw-bold mb-2">¿Eliminar categoría?</h5>
                            <p className="text-muted small mb-0">
                                Se eliminará la categoría <strong>{tipoAEliminar.nombre}</strong> si no tiene habitaciones asignadas.
                            </p>
                        </div>
                        <div className="modal-window-footer justify-content-center">
                            <button className="btn-luxury-outline" onClick={() => setTipoAEliminar(null)}>Cancelar</button>
                            <button className="btn btn-danger rounded-3 px-4" onClick={confirmarEliminacion}>Sí, eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}