import { useEffect, useState } from 'react';
import type { Hotel } from '../types';
import { obtenerHoteles, crearHotel, actualizarHotel, eliminarHotel } from '../services/api';

const hotelInicial: Hotel = {
    nombre: '',
    direccion: '',
    ciudad: '',
    telefono: '',
    email: '',
    activo: true,
};

export default function HotelesCrud() {
    const [hoteles, setHoteles] = useState<Hotel[]>([]);
    const [form, setForm] = useState<Hotel>(hotelInicial);
    const [editandoId, setEditandoId] = useState<number | null>(null);

    // Control de Modales
    const [modalFormAbierto, setModalFormAbierto] = useState(false);
    const [hotelDetalle, setHotelDetalle] = useState<Hotel | null>(null);
    const [hotelAEliminar, setHotelAEliminar] = useState<Hotel | null>(null);

    // Mensajes
    const [exito, setExito] = useState<string | null>(null);
    const [errorBanner, setErrorBanner] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<string | null>(null);
    const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});

    const cargarDatos = async () => {
        try {
            setHoteles(await obtenerHoteles());
        } catch {
            setErrorBanner('No se pudo conectar con el servidor.');
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
        setForm(hotelInicial);
        setEditandoId(null);
        setErrorModal(null);
        setErroresCampo({});
        setModalFormAbierto(true);
    };

    const abrirModalEditar = (h: Hotel) => {
        setForm(h);
        setEditandoId(h.id_hotel!);
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
                const res = await actualizarHotel(editandoId, form);
                setExito(res.mensaje);
            } else {
                const res = await crearHotel(form);
                setExito(res.mensaje);
            }
            setModalFormAbierto(false);
            cargarDatos();
        } catch (err: any) {
            setErrorModal(err.mensaje || 'Verifique los datos ingresados.');
            if (err.errores) setErroresCampo(err.errores);
        }
    };

    const confirmarEliminacion = async () => {
        if (!hotelAEliminar) return;
        setErrorBanner(null);
        try {
            const res = await eliminarHotel(hotelAEliminar.id_hotel!);
            setExito(res.mensaje);
            setHotelAEliminar(null);
            cargarDatos();
        } catch (err: any) {
            setErrorBanner(err.mensaje || 'No se pudo eliminar la propiedad.');
            setHotelAEliminar(null);
        }
    };

    const activos = hoteles.filter((h) => h.activo).length;

    return (
        <div>
            {/* RESUMEN SUPERIOR */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="stat-box d-flex justify-content-between align-items-center">
                        <div>
                            <div className="text-muted small fw-medium">Propiedades Registradas</div>
                            <div className="fs-3 fw-bold mt-1">{hoteles.length}</div>
                        </div>
                        <i className="bi bi-buildings fs-2 text-muted opacity-50"></i>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-box d-flex justify-content-between align-items-center">
                        <div>
                            <div className="text-muted small fw-medium">Complejos en Operación</div>
                            <div className="fs-3 fw-bold mt-1" style={{ color: '#065f46' }}>{activos}</div>
                        </div>
                        <i className="bi bi-check2-circle fs-2 text-success opacity-50"></i>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="stat-box d-flex justify-content-between align-items-center">
                        <div>
                            <div className="text-muted small fw-medium">Sedes Inactivas</div>
                            <div className="fs-3 fw-bold text-muted mt-1">{hoteles.length - activos}</div>
                        </div>
                        <i className="bi bi-pause-circle fs-2 text-muted opacity-50"></i>
                    </div>
                </div>
            </div>

            {/* ALERTAS GLOBALES */}
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

            {/* TABLA FULL-WIDTH */}
            <div className="luxury-card">
                <div className="luxury-card-header">
                    <div>
                        <h5 className="fw-bold mb-1">Directorio de Propiedades Hoteleras</h5>
                        <p className="text-muted small mb-0">Gestiona las sedes corporativas, ubicaciones y estatus operativo.</p>
                    </div>
                    <button className="btn-luxury-primary" onClick={abrirModalNuevo}>
                        <i className="bi bi-plus-lg"></i>
                        <span>Nueva Propiedad</span>
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table-luxury">
                        <thead>
                            <tr>
                                <th>Propiedad</th>
                                <th>Ciudad y Dirección</th>
                                <th>Contacto de Recepción</th>
                                <th>Estatus</th>
                                <th className="text-end">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hoteles.map((h) => (
                                <tr key={h.id_hotel}>
                                    <td>
                                        <div className="fw-bold">{h.nombre}</div>
                                        <small className="text-muted">Código #{h.id_hotel}</small>
                                    </td>
                                    <td>
                                        <div className="fw-medium">{h.ciudad}</div>
                                        <small className="text-muted">{h.direccion}</small>
                                    </td>
                                    <td>
                                        <div>{h.telefono}</div>
                                        <small className="text-muted">{h.email}</small>
                                    </td>
                                    <td>
                                        <span className={`badge-soft ${h.activo ? 'badge-emerald' : 'badge-stone'}`}>
                                            <span className="dot"></span>
                                            {h.activo ? 'Operando' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="text-end">
                                        <button className="action-icon-btn me-1" title="Ver Ficha" onClick={() => setHotelDetalle(h)}>
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button className="action-icon-btn me-1" title="Editar" onClick={() => abrirModalEditar(h)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="action-icon-btn delete" title="Eliminar" onClick={() => setHotelAEliminar(h)}>
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* =========================================================
          MODAL 1: CREAR / EDITAR PROPIEDAD
      ========================================================= */}
            {modalFormAbierto && (
                <div className="modal-backdrop-custom" onClick={() => setModalFormAbierto(false)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-header">
                            <h6 className="fw-bold mb-0">
                                {editandoId ? 'Editar Propiedad Hotelera' : 'Registrar Nueva Propiedad'}
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
                                    <label className="input-label">Nombre del Hotel *</label>
                                    <input
                                        type="text"
                                        className="input-luxury"
                                        value={form.nombre}
                                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                        placeholder="Ej. Grand Aurelia Cancún"
                                    />
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="input-label">Ciudad / Destino *</label>
                                        <input
                                            type="text"
                                            className="input-luxury"
                                            value={form.ciudad}
                                            onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                                            placeholder="Ej. Ciudad de México"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="input-label">Teléfono *</label>
                                        <input
                                            type="text"
                                            className="input-luxury"
                                            value={form.telefono}
                                            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                            placeholder="55-1234-5678"
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="input-label">Dirección Física *</label>
                                    <input
                                        type="text"
                                        className="input-luxury"
                                        value={form.direccion}
                                        onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                                        placeholder="Av. Paseo de la Reforma #125"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="input-label">Correo Electrónico *</label>
                                    <input
                                        type="text"
                                        className="input-luxury"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="contacto@hotel.com"
                                    />
                                </div>

                                <div className="form-check form-switch p-3 bg-light rounded-3 border mt-3">
                                    <input
                                        className="form-check-input ms-0 me-2"
                                        type="checkbox"
                                        id="checkActivoModal"
                                        checked={form.activo}
                                        onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                                    />
                                    <label className="form-check-label fw-medium small" htmlFor="checkActivoModal">
                                        Propiedad activa y habilitada para recepción
                                    </label>
                                </div>
                            </div>

                            <div className="modal-window-footer">
                                <button type="button" className="btn-luxury-outline" onClick={() => setModalFormAbierto(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-luxury-primary">
                                    {editandoId ? 'Guardar Cambios' : 'Registrar Propiedad'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =========================================================
          MODAL 2: VER DETALLE DE PROPIEDAD
      ========================================================= */}
            {hotelDetalle && (
                <div className="modal-backdrop-custom" onClick={() => setHotelDetalle(null)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-header">
                            <h6 className="fw-bold mb-0">Ficha de Propiedad #{hotelDetalle.id_hotel}</h6>
                            <button className="btn-close" onClick={() => setHotelDetalle(null)}></button>
                        </div>
                        <div className="modal-window-body">
                            <div className="d-flex justify-content-between align-items-start mb-4">
                                <div>
                                    <h4 className="fw-bold mb-1">{hotelDetalle.nombre}</h4>
                                    <span className="text-muted small"><i className="bi bi-geo-alt me-1"></i>{hotelDetalle.ciudad}</span>
                                </div>
                                <span className={`badge-soft ${hotelDetalle.activo ? 'badge-emerald' : 'badge-stone'}`}>
                                    <span className="dot"></span>
                                    {hotelDetalle.activo ? 'En Operación' : 'Inactivo'}
                                </span>
                            </div>
                            <div className="p-3 bg-light rounded-3 border">
                                <div className="mb-2"><strong>Dirección:</strong> {hotelDetalle.direccion}</div>
                                <div className="mb-2"><strong>Teléfono:</strong> {hotelDetalle.telefono}</div>
                                <div><strong>Correo:</strong> {hotelDetalle.email}</div>
                            </div>
                        </div>
                        <div className="modal-window-footer">
                            <button className="btn-luxury-outline" onClick={() => setHotelDetalle(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
          MODAL 3: CONFIRMAR ELIMINACIÓN
      ========================================================= */}
            {hotelAEliminar && (
                <div className="modal-backdrop-custom" onClick={() => setHotelAEliminar(null)}>
                    <div className="modal-window" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-window-body text-center p-4">
                            <div className="mb-3 text-danger fs-1">
                                <i className="bi bi-exclamation-circle"></i>
                            </div>
                            <h5 className="fw-bold mb-2">¿Eliminar propiedad?</h5>
                            <p className="text-muted small mb-0">
                                Estás a punto de eliminar <strong>{hotelAEliminar.nombre}</strong>. Si tiene habitaciones asociadas, el sistema bloqueará la baja por integridad.
                            </p>
                        </div>
                        <div className="modal-window-footer justify-content-center">
                            <button className="btn-luxury-outline" onClick={() => setHotelAEliminar(null)}>
                                Cancelar
                            </button>
                            <button className="btn btn-danger rounded-3 px-4" onClick={confirmarEliminacion}>
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}