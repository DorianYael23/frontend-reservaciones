import { useState } from 'react';
import HotelesCrud from './components/HotelesCrud';
import TiposCrud from './components/TiposCrud';
import HabitacionesCrud from './components/HabitacionesCrud';
import ConsultasView from './components/ConsultasView';
import AsistenteIaView from './components/AsistenteIaView';

type ModuloActivo = 'hoteles' | 'tipos' | 'habitaciones' | 'consultas' | 'ia';

type Modulo = {
  id: ModuloActivo;
  titulo: string;
  descripcion: string;
  icono: string;
};

const MODULOS: Modulo[] = [
  {
    id: 'hoteles',
    titulo: 'Hoteles',
    descripcion: 'Sedes y sucursales',
    icono: 'bi-buildings-fill',
  },
  {
    id: 'tipos',
    titulo: 'Tipos de Habitación',
    descripcion: 'Precios y capacidades',
    icono: 'bi-tags-fill',
  },
  {
    id: 'habitaciones',
    titulo: 'Habitaciones',
    descripcion: 'Pisos y numeración',
    icono: 'bi-door-open-fill',
  },
  {
    id: 'consultas',
    titulo: 'Consultas y Reportes',
    descripcion: 'Disponibilidad y filtros',
    icono: 'bi-search-heart',
  },
  {
    id: 'ia',
    titulo: 'Asistente IA',
    descripcion: 'Consultas en lenguaje natural',
    icono: 'bi-robot',
  },
];

function App() {
  const [vista, setVista] = useState<ModuloActivo>('hoteles');

  return (
    <div>
      {/* CABECERA FLOTANTE CON EFECTO CRISTAL */}
      <div className="exec-header-sticky">
        <header className="exec-topbar">
          <div className="exec-container d-flex flex-wrap justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="exec-logo">
                <i className="bi bi-buildings-fill" aria-hidden="true"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="exec-brand-name">Grupo Hotelero Paraíso</span>
                  <span className="exec-tag">ADMIN</span>
                </div>
                <div className="exec-brand-sub">
                  Sistema de Gestión de Hoteles y Habitaciones
                </div>
              </div>
            </div>

            {/* Indicadores Derecha */}
            <div className="d-flex align-items-center gap-3 mt-2 mt-sm-0">
              <div className="exec-user-chip d-none d-md-flex">
                <i className="bi bi-person-badge" aria-hidden="true"></i>
                <span>Recepción General</span>
              </div>
            </div>
          </div>
        </header>

        {/* NAVEGACIÓN POR MÓDULOS */}
        <nav className="exec-nav" aria-label="Módulos del sistema">
          <div className="exec-container d-flex align-items-center justify-content-between">
            <div className="nav-pills-luxury">
              {MODULOS.map((item) => {
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
        </nav>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="page-container pt-4">
        {vista === 'hoteles' && <HotelesCrud />}
        {vista === 'tipos' && <TiposCrud />}
        {vista === 'habitaciones' && <HabitacionesCrud />}
        {vista === 'consultas' && <ConsultasView />}
        {vista === 'ia' && <AsistenteIaView />}
      </main>
    </div>
  );
}

export default App;