import React, { useState, useEffect } from "react";

interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "HUESPED";
  verificado: boolean;
  fecha_registro: string;
}

const API_USUARIOS = "http://localhost:8082/api/usuarios";

export const UsuariosCrud: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de notificaciones y errores (alineados con TiposCrud)
  const [exito, setExito] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Estados de modales
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuarioDetalle, setUsuarioDetalle] = useState<Usuario | null>(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);

  // Estados del formulario
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [rol, setRol] = useState<"ADMIN" | "HUESPED">("HUESPED");
  const [verificado, setVerificado] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_USUARIOS);
      if (res.ok) {
        setUsuarios(await res.json());
      } else {
        setErrorBanner("No se pudo cargar la lista de usuarios.");
      }
    } catch {
      setErrorBanner("Error de conexión al cargar la lista de usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Auto-cierre de notificaciones flotantes a los 3.5 segundos
  useEffect(() => {
    if (exito || errorBanner) {
      const timer = setTimeout(() => {
        setExito(null);
        setErrorBanner(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [exito, errorBanner]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setMostrarPassword(false);
    setRol("HUESPED");
    setVerificado(true);
    setErrorModal(null);
    setMostrarModal(true);
  };

  const abrirEditar = (u: Usuario) => {
    setEditandoId(u.id_usuario);
    setNombre(u.nombre);
    setEmail(u.email);
    setPassword("");
    setMostrarPassword(false);
    setRol(u.rol);
    setVerificado(u.verificado);
    setErrorModal(null);
    setMostrarModal(true);
  };

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    setGuardando(true);

    const url = editandoId ? `${API_USUARIOS}/${editandoId}` : API_USUARIOS;
    const metodo = editandoId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, rol, verificado }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorModal(data.mensaje || "Error al guardar los datos del usuario.");
        return;
      }

      setExito(data.mensaje || (editandoId ? "Usuario actualizado." : "Usuario registrado."));
      setMostrarModal(false);
      cargarUsuarios();
    } catch {
      setErrorModal("Error de conexión con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminarUsuario = async () => {
    if (!usuarioAEliminar) return;
    const id = usuarioAEliminar.id_usuario;
    setErrorBanner(null);

    try {
      const res = await fetch(`${API_USUARIOS}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setExito(data.mensaje || "Usuario eliminado correctamente.");
        setUsuarioAEliminar(null);
        cargarUsuarios();
      } else {
        setErrorBanner(data.mensaje || "No se pudo eliminar el usuario.");
        setUsuarioAEliminar(null);
      }
    } catch {
      setErrorBanner("Error de conexión al eliminar el usuario.");
      setUsuarioAEliminar(null);
    }
  };

  return (
    <div>
      {/* NOTIFICACIONES FLOTANTES */}
      {exito && (
        <div className="toast-alert alert alert-success border-0 rounded-4 shadow-sm d-flex justify-content-between align-items-center mb-4">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            {exito}
          </div>
          <button className="btn-close" onClick={() => setExito(null)}></button>
        </div>
      )}
      {errorBanner && (
        <div className="toast-alert alert alert-danger border-0 rounded-4 shadow-sm d-flex justify-content-between align-items-center mb-4">
          <div>
            <i className="bi bi-exclamation-octagon-fill me-2"></i>
            {errorBanner}
          </div>
          <button className="btn-close" onClick={() => setErrorBanner(null)}></button>
        </div>
      )}

      {/* TARJETA PRINCIPAL */}
      <div className="luxury-card">
        <div className="luxury-card-header">
          <div>
            <h5 className="fw-bold mb-1">Gestión de Usuarios y Roles</h5>
            <p className="text-muted small mb-0">
              Control de cuentas registradas, verificación de correo y permisos de acceso.
            </p>
          </div>
          <button onClick={abrirNuevo} className="btn-luxury-primary">
            <i className="bi bi-person-plus"></i>
            <span>Nuevo Usuario</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Estado de Correo</th>
                <th>Fecha de Registro</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id_usuario}>
                    <td>
                      <div className="fw-bold">{u.nombre}</div>
                      <small className="text-muted">ID #{u.id_usuario}</small>
                    </td>
                    <td className="text-muted">
                      <i className="bi bi-envelope me-2"></i>
                      {u.email}
                    </td>
                    <td>
                      <span
                        className={`badge-soft ${u.rol === "ADMIN" ? "badge-amber" : "badge-stone"
                          }`}
                      >
                        <i
                          className={`bi ${u.rol === "ADMIN" ? "bi-shield-lock-fill" : "bi-person"
                            }`}
                        ></i>
                        {u.rol}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge-soft ${u.verificado ? "badge-emerald" : "badge-rose"
                          }`}
                      >
                        <span className="dot"></span>
                        {u.verificado ? "Verificado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="text-muted small">
                      <i className="bi bi-calendar3 me-1"></i>
                      {u.fecha_registro}
                    </td>
                    <td className="text-end">

                      <button
                        className="action-icon-btn me-1"
                        title="Editar"
                        onClick={() => abrirEditar(u)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="action-icon-btn delete"
                        title="Eliminar"
                        onClick={() => setUsuarioAEliminar(u)}
                      >
                        <i className="bi bi-trash3"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA CREAR / EDITAR USUARIO */}
      {mostrarModal && (
        <div className="modal-backdrop-custom" onClick={() => setMostrarModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-window-header">
              <h6 className="fw-bold mb-0">
                {editandoId ? `Modificar Usuario #${editandoId}` : "Registrar Nuevo Usuario"}
              </h6>
              <button
                type="button"
                className="btn-close"
                onClick={() => setMostrarModal(false)}
              ></button>
            </div>

            <form onSubmit={guardarUsuario}>
              <div className="modal-window-body">
                {errorModal && (
                  <div className="login-alert login-alert-danger">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>{errorModal}</div>
                  </div>
                )}

                {/* Nombre completo */}
                <div className="mb-3">
                  <label className="input-label">
                    Nombre Completo <span className="login-req">*</span>
                  </label>
                  <div className="login-input-wrap">
                    <i className="bi bi-person login-input-icon"></i>
                    <input
                      type="text"
                      className="input-luxury"
                      placeholder="Ej. Alejandro Mendoza"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>
                </div>

                {/* Correo electrónico */}
                <div className="mb-3">
                  <label className="input-label">
                    Correo Electrónico <span className="login-req">*</span>
                  </label>
                  <div className="login-input-wrap">
                    <i className="bi bi-envelope login-input-icon"></i>
                    <input
                      type="email"
                      className="input-luxury"
                      placeholder="usuario@ejemplo.com"
                      required
                      disabled={!!editandoId}
                      style={
                        editandoId
                          ? { backgroundColor: "#f4f4f5", color: "#71717a", cursor: "not-allowed" }
                          : undefined
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {editandoId && (
                    <small className="login-help">
                      El correo electrónico vinculado a la cuenta no es modificable.
                    </small>
                  )}
                </div>

                {/* Contraseña con botón de mostrar/ocultar */}
                <div className="mb-3">
                  <label className="input-label">
                    {editandoId ? "Nueva Contraseña (Opcional)" : "Contraseña"}{" "}
                    {!editandoId && <span className="login-req">*</span>}
                  </label>
                  <div className="login-input-wrap">
                    <i className="bi bi-lock login-input-icon"></i>
                    <input
                      type={mostrarPassword ? "text" : "password"}
                      className="input-luxury has-extra"
                      placeholder={
                        editandoId ? "Dejar en blanco para mantener la actual" : "Mínimo 6 caracteres"
                      }
                      required={!editandoId}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="login-eye"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      tabIndex={-1}
                      title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <i className={`bi ${mostrarPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                </div>

                {/* Selectores segmentados para Rol y Estado */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="input-label">Rol de Acceso</label>
                    <div className="ia-segment">
                      <button
                        type="button"
                        className={`ia-segment-btn ${rol === "HUESPED" ? "active" : ""}`}
                        onClick={() => setRol("HUESPED")}
                      >
                        <i className="bi bi-person"></i>
                        <span>Huésped</span>
                      </button>
                      <button
                        type="button"
                        className={`ia-segment-btn ${rol === "ADMIN" ? "active" : ""}`}
                        onClick={() => setRol("ADMIN")}
                      >
                        <i className="bi bi-shield-lock"></i>
                        <span>Admin</span>
                      </button>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="input-label">Estado de Correo</label>
                    <div className="ia-segment">
                      <button
                        type="button"
                        className={`ia-segment-btn ${verificado ? "active" : ""}`}
                        onClick={() => setVerificado(true)}
                      >
                        <i className="bi bi-patch-check"></i>
                        <span>Verificado</span>
                      </button>
                      <button
                        type="button"
                        className={`ia-segment-btn ${!verificado ? "active" : ""}`}
                        onClick={() => setVerificado(false)}
                      >
                        <i className="bi bi-clock-history"></i>
                        <span>Pendiente</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-window-footer">
                <button
                  type="button"
                  className="btn-luxury-outline"
                  onClick={() => setMostrarModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-luxury-primary" disabled={guardando}>
                  {guardando
                    ? "Guardando..."
                    : editandoId
                      ? "Actualizar Usuario"
                      : "Guardar Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {usuarioDetalle && (
        <div className="modal-backdrop-custom" onClick={() => setUsuarioDetalle(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-window-header">
              <h6 className="fw-bold mb-0">
                Ficha de Usuario #{usuarioDetalle.id_usuario}
              </h6>
              <button
                className="btn-close"
                onClick={() => setUsuarioDetalle(null)}
              ></button>
            </div>
            <div className="modal-window-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4 className="fw-bold mb-1">{usuarioDetalle.nombre}</h4>
                  <p className="text-muted mb-0">
                    <i className="bi bi-envelope me-1"></i>
                    {usuarioDetalle.email}
                  </p>
                </div>
                <span
                  className={`badge-soft ${usuarioDetalle.rol === "ADMIN" ? "badge-amber" : "badge-stone"
                    }`}
                >
                  <i
                    className={`bi ${usuarioDetalle.rol === "ADMIN" ? "bi-shield-lock-fill" : "bi-person"
                      }`}
                  ></i>
                  {usuarioDetalle.rol}
                </span>
              </div>

              <div className="p-3 bg-light rounded-3 border d-flex justify-content-between align-items-center">
                <div>
                  <small className="text-muted d-block">Verificación de Cuenta</small>
                  <strong className={usuarioDetalle.verificado ? "text-success" : "text-danger"}>
                    {usuarioDetalle.verificado ? "Correo Verificado" : "Verificación Pendiente"}
                  </strong>
                </div>
                <div className="text-end">
                  <small className="text-muted d-block">Fecha de Registro</small>
                  <strong>{usuarioDetalle.fecha_registro}</strong>
                </div>
              </div>
            </div>
            <div className="modal-window-footer">
              <button
                className="btn-luxury-outline"
                onClick={() => setUsuarioDetalle(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR USUARIO */}
      {usuarioAEliminar && (
        <div className="modal-backdrop-custom" onClick={() => setUsuarioAEliminar(null)}>
          <div
            className="modal-window"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-window-body text-center p-4">
              <div className="mb-3 text-danger fs-1">
                <i className="bi bi-exclamation-circle"></i>
              </div>
              <h5 className="fw-bold mb-2">
                ¿Eliminar usuario #{usuarioAEliminar.id_usuario}?
              </h5>
              <p className="text-muted small mb-0">
                Se dará de baja la cuenta de <strong>{usuarioAEliminar.nombre}</strong> (
                {usuarioAEliminar.email}).
              </p>
            </div>
            <div className="modal-window-footer justify-content-center">
              <button
                type="button"
                className="btn-luxury-outline"
                onClick={() => setUsuarioAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger rounded-3 px-4"
                onClick={confirmarEliminarUsuario}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosCrud;