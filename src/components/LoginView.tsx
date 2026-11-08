import React, { useState } from "react";
import type { SesionUsuario } from "../types";
import { authLogin, authRegistro, authVerificarCodigo } from "../services/api";

export type { SesionUsuario };

interface LoginViewProps {
  onLoginSuccess: (sesion: SesionUsuario) => void;
}

type Modo = "login" | "registro" | "verificar";

const TEXTOS: Record<
  Modo,
  { tag: string; icono: string; titulo: string; subtitulo: string; boton: string }
> = {
  login: {
    tag: "ACCESO AL SISTEMA",
    icono: "bi-key-fill",
    titulo: "Bienvenido de nuevo",
    subtitulo: "Ingrese sus credenciales para acceder.",
    boton: "Iniciar sesión",
  },
  registro: {
    tag: "NUEVA CUENTA",
    icono: "bi-person-plus-fill",
    titulo: "Crear cuenta",
    subtitulo: "Regístrese para activar su acceso.",
    boton: "Registrarme y enviar código",
  },
  verificar: {
    tag: "ACTIVACIÓN DE SEGURIDAD",
    icono: "bi-shield-check",
    titulo: "Verifique su correo",
    subtitulo: "Ingrese el código de 6 dígitos enviado.",
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

const Campo: React.FC<{
  id: string;
  label: string;
  icono: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, label, icono, extra, children }) => (
  <div className="login-field">
    <label htmlFor={id} className="input-label mb-1" style={{ fontSize: "0.73rem" }}>
      {label} <span className="login-req">*</span>
    </label>
    <div className="login-input-wrap">
      <i className={`bi ${icono} login-input-icon`} aria-hidden="true"></i>
      {children}
      {extra}
    </div>
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
        const sesion = await authLogin({ email: email.trim(), password });
        onLoginSuccess(sesion);
      } else if (modo === "registro") {
        const data = await authRegistro({
          nombre: nombre.trim(),
          email: email.trim(),
          password,
        });
        setAlerta({
          tipo: "success",
          texto: data.mensaje || "Registro exitoso.",
        });
        setPassword("");
        setModo("verificar");
      } else if (modo === "verificar") {
        const data = await authVerificarCodigo({
          email: email.trim(),
          codigo: codigo.trim(),
        });
        setAlerta({
          tipo: "success",
          texto: data.mensaje || "Cuenta activada con éxito.",
        });
        setCodigo("");
        setModo("login");
      }
    } catch (err: any) {
      const msg = err?.mensaje || "Error al conectar con el servidor.";
      const esNoVerificado =
        msg.toLowerCase().includes("verific") || msg.toLowerCase().includes("activ");

      setAlerta({
        tipo: modo === "login" && esNoVerificado ? "warning" : "danger",
        texto: msg,
      });

      if (modo === "login" && esNoVerificado) {
        setModo("verificar");
      }
    } finally {
      setLoading(false);
    }
  };

  const textos = TEXTOS[modo];

  return (
    <div className="login-page">
      {/* Panel de marca */}
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

      {/* Formulario */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-body">
            <header className="login-head mb-2">
              <div className="login-head-badge-row mb-1">
                <div className="login-head-icon" style={{ width: 28, height: 28, fontSize: "0.8rem" }}>
                  <i className={`bi ${textos.icono}`} aria-hidden="true"></i>
                </div>
                <span className="login-head-tag" style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem" }}>
                  {textos.tag}
                </span>
              </div>

              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.1rem" }}>{textos.titulo}</h2>

              {alerta ? (
                <div
                  className={`login-alert login-alert-${alerta.tipo} py-1 px-2 my-1`}
                  role={alerta.tipo === "danger" ? "alert" : "status"}
                  style={{ fontSize: "0.75rem" }}
                >
                  <i className={`bi ${ICONO_ALERTA[alerta.tipo]}`} aria-hidden="true"></i>
                  <span>{alerta.texto}</span>
                </div>
              ) : (
                <p className="text-muted" style={{ fontSize: "0.78rem", lineHeight: "1.2" }}>
                  {textos.subtitulo}
                </p>
              )}
            </header>

            <form onSubmit={manejarSubmit} className="login-form" style={{ gap: "0.45rem" }}>
              {modo === "registro" && (
                <Campo id="login-nombre" label="Nombre completo" icono="bi-person">
                  <input
                    id="login-nombre"
                    type="text"
                    className="input-luxury"
                    style={{ height: "36px", fontSize: "0.85rem" }}
                    placeholder="Ej. María López"
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
                  style={{ height: "36px", fontSize: "0.85rem" }}
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
                  label="Contraseña (mín. 6 carac.)"
                  icono="bi-lock"
                  extra={
                    <button
                      type="button"
                      className="login-eye"
                      onClick={() => setVerPassword((v) => !v)}
                      aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      tabIndex={-1}
                      style={{ width: 28, height: 28 }}
                    >
                      <i className={`bi ${verPassword ? "bi-eye-slash" : "bi-eye"}`} style={{ fontSize: "0.85rem" }}></i>
                    </button>
                  }
                >
                  <input
                    id="login-password"
                    type={verPassword ? "text" : "password"}
                    className="input-luxury has-extra"
                    style={{ height: "36px", fontSize: "0.85rem" }}
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
                  <label htmlFor="login-codigo" className="input-label mb-1" style={{ fontSize: "0.73rem" }}>
                    Código de verificación <span className="login-req">*</span>
                  </label>
                  <input
                    id="login-codigo"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="input-luxury login-code"
                    style={{ height: "42px", fontSize: "1.2rem" }}
                    placeholder="000000"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <small className="login-help text-muted" style={{ fontSize: "0.68rem" }}>
                    Ingrese los 6 números enviados a su correo.
                  </small>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-luxury-primary login-submit mt-1"
                style={{ height: "38px", fontSize: "0.82rem" }}
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
                    <span className="login-submit-arrow" style={{ width: 26, height: 26 }}>
                      <i className="bi bi-arrow-right" aria-hidden="true" style={{ fontSize: "0.75rem" }}></i>
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="login-switch pt-1">
            {modo === "login" ? (
              <>
                <div className="login-divider mb-2">
                  <span style={{ fontSize: "0.62rem" }}>¿Necesita otra opción?</span>
                </div>
                <div className="login-switch-grid">
                  <button
                    type="button"
                    className="login-action-btn py-1 px-2"
                    style={{ fontSize: "0.74rem" }}
                    onClick={() => cambiarModo("registro")}
                  >
                    <i className="bi bi-person-plus"></i>
                    <span>Crear cuenta</span>
                  </button>
                  <button
                    type="button"
                    className="login-action-btn py-1 px-2"
                    style={{ fontSize: "0.74rem" }}
                    onClick={() => cambiarModo("verificar")}
                  >
                    <i className="bi bi-shield-check"></i>
                    <span>Tengo un código</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="login-switch-back pt-1">
                <button
                  type="button"
                  className="login-action-btn w-0 py-1 px-3 w-100"
                  style={{ fontSize: "0.75rem" }}
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