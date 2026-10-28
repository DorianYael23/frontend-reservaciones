import React, { useState } from "react";

export interface SesionUsuario {
  token: string;
  id_usuario: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "HUESPED";
}

export const SesionUsuario = {};

interface LoginViewProps {
  onLoginSuccess: (sesion: SesionUsuario) => void;
}

const API_AUTH = "http://localhost:8082/api/auth";

type Modo = "login" | "registro" | "verificar";

const TEXTOS: Record<
  Modo,
  { tag: string; icono: string; titulo: string; subtitulo: string; boton: string }
> = {
  login: {
    tag: "ACCESO AL SISTEMA",
    icono: "bi-key-fill",
    titulo: "Bienvenido de nuevo",
    subtitulo: "Ingrese sus credenciales para acceder al sistema.",
    boton: "Iniciar sesión",
  },
  registro: {
    tag: "NUEVA CUENTA",
    icono: "bi-person-plus-fill",
    titulo: "Crear cuenta",
    subtitulo: "Regístrese y le enviaremos un código de verificación a su correo.",
    boton: "Registrarme y enviar código",
  },
  verificar: {
    tag: "ACTIVACIÓN DE SEGURIDAD",
    icono: "bi-shield-check",
    titulo: "Verifique su correo",
    subtitulo: "Ingrese el código de 6 dígitos que enviamos a su correo para activar la cuenta.",
    boton: "Confirmar y activar cuenta",
  },
};

const CARACTERISTICAS = [
  {
    icono: "bi-building",
    titulo: "Hoteles y habitaciones",
    texto: "Administre sedes, tipos de habitación y su estado en un solo lugar.",
  },
  {
    icono: "bi-graph-up-arrow",
    titulo: "Consultas y reportes",
    texto: "Disponibilidad y ocupación al instante, sin hojas de cálculo.",
  },
  {
    icono: "bi-stars",
    titulo: "Asistente inteligente",
    texto: "Pregunte en lenguaje natural y obtenga datos reales de su operación.",
  },
];

const ICONO_ALERTA = {
  success: "bi-check-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  danger: "bi-exclamation-circle-fill",
} as const;

/* Campo de formulario con ícono a la izquierda y espacio opcional a la derecha */
const Campo: React.FC<{
  id: string;
  label: string;
  icono: string;
  extra?: React.ReactNode;
  ayuda?: string;
  children: React.ReactNode;
}> = ({ id, label, icono, extra, ayuda, children }) => (
  <div className="login-field">
    <label htmlFor={id} className="input-label">
      {label} <span className="login-req">*</span>
    </label>
    <div className="login-input-wrap">
      <i className={`bi ${icono} login-input-icon`} aria-hidden="true"></i>
      {children}
      {extra}
    </div>
    {ayuda && <small className="login-help">{ayuda}</small>}
  </div>
);

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [modo, setModo] = useState<Modo>("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const [alerta, setAlerta] = useState<{
    tipo: "success" | "danger" | "warning";
    texto: string;
  } | null>(null);

  const cambiarModo = (nuevo: Modo) => {
    setModo(nuevo);
    setAlerta(null);
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlerta(null);
    setLoading(true);

    try {
      if (modo === "login") {
        const res = await fetch(`${API_AUTH}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAlerta({
            tipo: res.status === 403 ? "warning" : "danger",
            texto: data.mensaje || "No se pudo iniciar sesión.",
          });
          if (res.status === 403) {
            setModo("verificar");
          }
          return;
        }

        onLoginSuccess({
          token: data.token,
          id_usuario: data.id_usuario,
          nombre: data.nombre,
          email: data.email,
          rol: data.rol,
        });
      } else if (modo === "registro") {
        const res = await fetch(`${API_AUTH}/registro`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombre.trim(),
            email: email.trim(),
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAlerta({
            tipo: "danger",
            texto: data.mensaje || "No se pudo completar el registro.",
          });
          return;
        }

        setAlerta({
          tipo: "success",
          texto: data.mensaje,
        });
        setPassword("");
        setModo("verificar");
      } else if (modo === "verificar") {
        const res = await fetch(`${API_AUTH}/verificar-codigo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            codigo: codigo.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAlerta({
            tipo: "danger",
            texto: data.mensaje || "Código de verificación inválido.",
          });
          return;
        }

        setAlerta({
          tipo: "success",
          texto: data.mensaje,
        });
        setCodigo("");
        setModo("login");
      }
    } catch {
      setAlerta({
        tipo: "danger",
        texto: "Error al conectar con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  const textos = TEXTOS[modo];

  return (
    <div className="login-page">
      {/* ======================= Panel de marca ======================= */}
      <aside className="login-brand">
        <div className="login-brand-inner">
          <div className="login-brand-top">
            <div className="exec-logo">
              <i className="bi bi-buildings-fill" aria-hidden="true"></i>
            </div>
            <div>
              <div className="exec-brand-name">Grupo Hotelero Paraíso</div>
              <div className="exec-brand-sub login-brand-sub">
                Sistema de Gestión de Hoteles y Habitaciones
              </div>
            </div>
          </div>

          <div className="login-brand-body">
            <span className="exec-tag">PORTAL DE ACCESO</span>
            <h1 className="login-brand-title">
              Toda su operación hotelera, <span>bajo control</span>.
            </h1>
            <p className="login-brand-lead">
              Una plataforma pensada para que su equipo administre hoteles, habitaciones y
              disponibilidad con claridad y sin complicaciones.
            </p>

            <ul className="login-features">
              {CARACTERISTICAS.map((c) => (
                <li key={c.titulo} className="login-feature">
                  <span className="login-feature-icon">
                    <i className={`bi ${c.icono}`} aria-hidden="true"></i>
                  </span>
                  <span>
                    <strong>{c.titulo}</strong>
                    <small>{c.texto}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="login-brand-foot">
            © {new Date().getFullYear()} Grupo Hotelero Paraíso. Todos los derechos reservados.
          </div>
        </div>
      </aside>

      {/* ======================= Formulario ======================= */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-body">
            <header className="login-head">
              {/* Emblema superior contextual */}
              <div className="login-head-badge-row">
                <div className="login-head-icon">
                  <i className={`bi ${textos.icono}`} aria-hidden="true"></i>
                </div>
                <span className="login-head-tag">{textos.tag}</span>
              </div>

              <h2>{textos.titulo}</h2>

              {alerta ? (
                <div
                  className={`login-alert login-alert-${alerta.tipo}`}
                  role={alerta.tipo === "danger" ? "alert" : "status"}
                >
                  <i className={`bi ${ICONO_ALERTA[alerta.tipo]}`} aria-hidden="true"></i>
                  <span>{alerta.texto}</span>
                </div>
              ) : (
                <p>{textos.subtitulo}</p>
              )}
            </header>

            <form onSubmit={manejarSubmit} className="login-form">
              {modo === "registro" && (
                <Campo id="login-nombre" label="Nombre completo" icono="bi-person">
                  <input
                    id="login-nombre"
                    type="text"
                    className="input-luxury"
                    placeholder="Ej. María López García"
                    autoComplete="name"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </Campo>
              )}

              <Campo id="login-email" label="Correo electrónico" icono="bi-envelope">
                <input
                  id="login-email"
                  type="email"
                  className="input-luxury"
                  placeholder="nombre@correo.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Campo>

              {modo !== "verificar" ? (
                <Campo
                  id="login-password"
                  label="Contraseña"
                  icono="bi-lock"
                  ayuda={modo === "registro" ? "Mínimo 6 caracteres." : undefined}
                  extra={
                    <button
                      type="button"
                      className="login-eye"
                      onClick={() => setVerPassword((v) => !v)}
                      aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      tabIndex={-1}
                    >
                      <i className={`bi ${verPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  }
                >
                  <input
                    id="login-password"
                    type={verPassword ? "text" : "password"}
                    className="input-luxury has-extra"
                    placeholder="••••••••"
                    autoComplete={modo === "login" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Campo>
              ) : (
                <div className="login-field">
                  <label htmlFor="login-codigo" className="input-label">
                    Código de verificación <span className="login-req">*</span>
                  </label>
                  <input
                    id="login-codigo"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="input-luxury login-code"
                    placeholder="000000"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <small className="login-help login-help-center">
                    <i className="bi bi-envelope-check me-1" aria-hidden="true"></i>
                    Revise su bandeja de entrada y escriba aquí los 6 números.
                  </small>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-luxury-primary login-submit"
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    <span>Procesando…</span>
                  </>
                ) : (
                  <>
                    <span>{textos.boton}</span>
                    <span className="login-submit-arrow">
                      <i className="bi bi-arrow-right" aria-hidden="true"></i>
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Pie de acciones rediseñado */}
          <div className="login-switch">
            {modo === "login" ? (
              <>
                <div className="login-divider">
                  <span>¿Necesita otra opción?</span>
                </div>
                <div className="login-switch-grid">
                  <button
                    type="button"
                    className="login-action-btn"
                    onClick={() => cambiarModo("registro")}
                  >
                    <i className="bi bi-person-plus"></i>
                    <span>Crear cuenta</span>
                  </button>
                  <button
                    type="button"
                    className="login-action-btn"
                    onClick={() => cambiarModo("verificar")}
                  >
                    <i className="bi bi-shield-check"></i>
                    <span>Tengo un código</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="login-switch-back">
                <span className="text-muted small">
                  {modo === "registro" ? "¿Ya tiene una cuenta registrada?" : "¿Ya activó su cuenta?"}
                </span>
                <button
                  type="button"
                  className="login-action-btn w-100 mt-2"
                  onClick={() => cambiarModo("login")}
                >
                  <i className="bi bi-arrow-left"></i>
                  <span>Volver a iniciar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="login-copy">© {new Date().getFullYear()} Grupo Hotelero Paraíso</p>
      </main>
    </div>
  );
};

export default LoginView;