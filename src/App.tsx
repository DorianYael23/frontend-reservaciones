import { useState, useEffect } from 'react';
import HotelesCrud from './components/HotelesCrud';
import TiposCrud from './components/TiposCrud';
import HabitacionesCrud from './components/HabitacionesCrud';
import ReservacionesCrud from './components/ReservacionesCrud';
import ConsultasView from './components/ConsultasView';
import AsistenteIaView from './components/AsistenteIaView';
import UsuariosCrud from './components/UsuariosCrud';
import LoginView, { type SesionUsuario } from './components/LoginView';
import CatalogoHabitacionesView from './components/CatalogoHabitacionesView';

type ModuloActivo =
  | 'hoteles'
  | 'tipos'
  | 'habitaciones'
  | 'catalogo'
  | 'reservaciones'
  | 'consultas'
  | 'usuarios'
  | 'ia';

type Modulo = {
  id: ModuloActivo;
  titulo: string;
  descripcion: string;
  icono: string;
  rolesPermitidos: ('ADMIN' | 'HUESPED')[];
};

const STORAGE_SESION_KEY = 'paraiso_auth_sesion_v1';

// Interceptor único para adjuntar el token JWT a todas las peticiones hacia el backend
const win = window as any;
if (!win.__fetchOriginalParaiso) {
  win.__fetchOriginalParaiso = window.fetch.bind(window);
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;

  const esBackend = url.includes(':8082') || url.includes('/api/');
  const esRutaAuth = url.includes('/api/auth/');

  if (esBackend && !esRutaAuth) {
    const guardada = localStorage.getItem(STORAGE_SESION_KEY);
    if (guardada) {
      try {
        const sesion: SesionUsuario = JSON.parse(guardada);
        if (sesion?.token) {
          const headers = new Headers(init?.headers || {});
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${sesion.token}`);
          }
          init = { ...init, headers };
        }
      } catch {
        // Ignorar error de lectura
      }
    }
  }
  return win.__fetchOriginalParaiso(input, init);
};

const MODULOS: Modulo[] = [
  {
    id: 'hoteles',
    titulo: 'Hoteles',
    descripcion: 'Sedes y sucursales',
    icono: 'bi-buildings-fill',
    rolesPermitidos: ['ADMIN'],
  },
  {
    id: 'tipos',
    titulo: 'Tipos de Habitación',
    descripcion: 'Precios y capacidades',
    icono: 'bi-tags-fill',
    rolesPermitidos: ['ADMIN'],
  },
  {
    id: 'habitaciones',
    titulo: 'Habitaciones',
    descripcion: 'Pisos y numeración',
    icono: 'bi-door-open-fill',
    rolesPermitidos: ['ADMIN'],
  },
  {
    id: 'catalogo',
    titulo: 'Explorar Estancias',
    descripcion: 'Fotos, tarifas y reservas directas',
    icono: 'bi-compass-fill',
    rolesPermitidos: ['HUESPED'],
  },
  {
    id: 'reservaciones',
    titulo: 'Mis Reservaciones',
    descripcion: 'Control de estancias y pagos',
    icono: 'bi-calendar2-check-fill',
    rolesPermitidos: ['ADMIN', 'HUESPED'],
  },
  {
    id: 'consultas',
    titulo: 'Consultas y Reportes',
    descripcion: 'Disponibilidad y filtros',
    icono: 'bi-search-heart',
    rolesPermitidos: ['ADMIN'],
  },
  {
    id: 'usuarios',
    titulo: 'Usuarios',
    descripcion: 'Cuentas y roles de acceso',
    icono: 'bi-people-fill',
    rolesPermitidos: ['ADMIN'],
  },
  {
    id: 'ia',
    titulo: 'Asistente IA',
    descripcion: 'Consultas en lenguaje natural',
    icono: 'bi-robot',
    rolesPermitidos: ['ADMIN', 'HUESPED'],
  },
];

function App() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESION_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed && parsed.token && parsed.rol ? parsed : null;
    } catch {
      return null;
    }
  });

  const [vista, setVista] = useState<ModuloActivo>('catalogo');

  useEffect(() => {
    if (sesion) {
      setVista(sesion.rol === 'ADMIN' ? 'hoteles' : 'catalogo');
    }
  }, [sesion]);

  const manejarLoginExitoso = (nuevaSesion: SesionUsuario) => {
    localStorage.setItem(STORAGE_SESION_KEY, JSON.stringify(nuevaSesion));
    setSesion(nuevaSesion);
  };

  const manejarCerrarSesion = () => {
    localStorage.removeItem(STORAGE_SESION_KEY);
    setSesion(null);
  };

  if (!sesion) {
    return <LoginView onLoginSuccess={manejarLoginExitoso} />;
  }

  const modulosVisibles = MODULOS.filter((m) =>
    m.rolesPermitidos.includes(sesion.rol)
  );

  return (
    <div>
      {/* CABECERA FLOTANTE CON EFECTO CRISTAL */}
      <div className="exec-header-sticky">
        <header className="exec-topbar">
          <div className="exec-container d-flex flex-nowrap justify-content-between align-items-center mobile-header-row py-0 py-md-2 px-2 px-md-3">
            {/* Logo y Nombre del Hotel */}
            <div className="d-flex align-items-center gap-2">
              <div
                className="exec-logo d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: "32px", height: "32px", minWidth: "32px", fontSize: "0.95rem" }}
              >
                <i className="bi bi-buildings-fill" aria-hidden="true"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="exec-brand-name" style={{ fontSize: "0.9rem", lineHeight: "1.2" }}>
                    Grupo Hotelero Paraíso
                  </span>
                  <span className="exec-tag d-none d-md-inline-flex">{sesion.rol}</span>
                </div>
                {/* Oculto en móvil (< 768px) para no ensanchar la barra verticalmente */}
                <div className="exec-brand-sub d-none d-md-block">
                  Sistema de Gestión de Hoteles y Habitaciones
                </div>
              </div>
            </div>

            {/* Usuario Activo y Botón de Cerrar Sesión en la misma fila */}
            <div className="d-flex align-items-center gap-2 ms-auto flex-shrink-0">
              <span
                className="exec-tag d-inline-flex d-md-none py-0 px-2"
                style={{ fontSize: "0.68rem" }}
              >
                {sesion.rol}
              </span>
              <div className="exec-user-chip d-none d-md-flex">
                <i className="bi bi-person-badge" aria-hidden="true"></i>
                <span>{sesion.nombre}</span>
              </div>
              <button
                type="button"
                onClick={manejarCerrarSesion}
                className="exec-logout d-inline-flex align-items-center gap-1 py-1 px-2"
                style={{ fontSize: "0.78rem" }}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                <span className="d-none d-sm-inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        {/* NAVEGACIÓN POR MÓDULOS SEGÚN EL ROL */}
        <nav className="exec-nav" aria-label="Módulos del sistema">
          <div className="exec-container d-none d-md-flex align-items-center justify-content-between">
            <div className="nav-pills-luxury">
              {modulosVisibles.map((item) => {
                const activo = vista === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.descripcion}
                    aria-current={activo ? 'page' : undefined}
                    className={`nav-pill-btn ${activo ? 'active' : ''}`}
                    onClick={() => setVista(item.id)}
                  >
                    <i className={`bi ${item.icono}`} aria-hidden="true"></i>
                    <span>{item.titulo}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className="exec-container d-flex d-md-none p-0 sticky-top bg-white border-bottom shadow-sm"
            style={{ top: 0, zIndex: 1020 }}
          >
            <div className="d-flex w-100 gap-1 p-1 mobile-nav-pills" style={{ minHeight: "34px" }}>
              {modulosVisibles.map((item) => {
                const activo = vista === item.id;
                const tituloCorto =
                  item.id === 'catalogo'
                    ? 'Estancias'
                    : item.id === 'reservaciones'
                      ? 'Reservas'
                      : item.id === 'ia'
                        ? 'Asistente IA'
                        : item.id === 'habitaciones'
                          ? 'Habitaciones'
                          : item.id === 'consultas'
                            ? 'Consultas'
                            : item.titulo;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.descripcion}
                    aria-current={activo ? 'page' : undefined}
                    className={`nav-pill-btn flex-fill d-flex align-items-center justify-content-center gap-1 py-1 px-1 text-nowrap ${activo ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem', minHeight: '30px', lineHeight: 1 }}
                    onClick={() => setVista(item.id)}
                  >
                    <i className={`bi ${item.icono}`} style={{ fontSize: '0.76rem' }} aria-hidden="true"></i>
                    <span>{tituloCorto}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="page-container">
        {sesion.rol === 'ADMIN' && vista === 'hoteles' && <HotelesCrud />}
        {sesion.rol === 'ADMIN' && vista === 'tipos' && <TiposCrud />}
        {sesion.rol === 'ADMIN' && vista === 'habitaciones' && <HabitacionesCrud />}

        {/* Catálogo de habitaciones disponible para huéspedes */}
        {vista === 'catalogo' && (
          <CatalogoHabitacionesView
            sesion={sesion}
            onReservacionExitosa={() => setVista('reservaciones')}
          />
        )}

        {vista === 'reservaciones' && <ReservacionesCrud sesion={sesion} />}
        {sesion.rol === 'ADMIN' && vista === 'consultas' && <ConsultasView />}
        {sesion.rol === 'ADMIN' && vista === 'usuarios' && <UsuariosCrud />}
        <div className={vista === 'ia' ? 'd-block' : 'd-none'}>
          <AsistenteIaView sesion={sesion} />
        </div>
      </main>
    </div>
  );
}

export default App;