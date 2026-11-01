import React, { useState, useEffect } from "react";
import { type SesionUsuario } from "./LoginView";

interface Hotel {
  id_hotel: number;
  nombre: string;
  ciudad: string;
  activo: boolean;
}

interface TipoHabitacion {
  id_tipo: number;
  nombre: string;
  capacidad: number;
  precio_base: number;
}

interface Habitacion {
  id_habitacion: number;
  numero: string;
  piso: number;
  estado: string;
  hotel: Hotel;
  tipoHabitacion: TipoHabitacion;
}

type EstadoReservacion = "Pendiente" | "Confirmada" | "En Curso" | "Cancelada" | "Finalizada";

interface Reservacion {
  id_reservacion?: number;
  folio?: string;
  habitacion: Habitacion;
  nombre_cliente: string;
  telefono: string;
  email?: string;
  fecha_registro?: string;
  fecha_entrada: string;
  fecha_salida: string;
  num_huespedes: number;
  total: number;
  estado: EstadoReservacion;
}

interface OcupacionFecha {
  id_reservacion: number;
  id_habitacion: number;
  fecha_entrada: string;
  fecha_salida: string;
  estado: string;
}

interface ReservacionesCrudProps {
  sesion?: SesionUsuario | null;
}

const API_RESERVACIONES = "http://localhost:8082/api/reservaciones";
const API_HABITACIONES = "http://localhost:8082/api/habitaciones";
const API_TIPOS = "http://localhost:8082/api/tipos-habitacion";

const obtenerFechaLocalIso = (diasSumar = 0, fechaBase?: string): string => {
  const base = fechaBase ? new Date(fechaBase + "T00:00:00") : new Date();
  base.setDate(base.getDate() + diasSumar);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ReservacionesCrud: React.FC<ReservacionesCrudProps> = ({ sesion }) => {
  const hoyIso = obtenerFechaLocalIso(0);
  const esAdmin = sesion?.rol === "ADMIN";

  const [reservaciones, setReservaciones] = useState<Reservacion[]>([]);
  const [ocupacionGlobal, setOcupacionGlobal] = useState<OcupacionFecha[]>([]);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<TipoHabitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Notificaciones flotantes
  const [exito, setExito] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Modales
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [reservacionAEliminar, setReservacionAEliminar] = useState<Reservacion | null>(null);
  const [reservacionAPagar, setReservacionAPagar] = useState<Reservacion | null>(null);

  // Estados para el formulario (Crear/Editar Admin)
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [fechaEntrada, setFechaEntrada] = useState(hoyIso);
  const [fechaSalida, setFechaSalida] = useState(obtenerFechaLocalIso(1, hoyIso));
  const [idTipoFiltro, setIdTipoFiltro] = useState<number | "">("");
  const [idHabitacion, setIdHabitacion] = useState<number | "">("");
  const [numHuespedes, setNumHuespedes] = useState<number>(1);
  const [estado, setEstado] = useState<EstadoReservacion>("Pendiente");

  // Estados para el modal de pago simulado
  const [numTarjeta, setNumTarjeta] = useState("");
  const [expiracion, setExpiracion] = useState("");
  const [cvv, setCvv] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  const formatoMoneda = (valor: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(valor || 0);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resReservaciones, resOcupacion, resHabitaciones, resTipos] = await Promise.all([
        fetch(API_RESERVACIONES),
        fetch(`${API_RESERVACIONES}/ocupacion-fechas`),
        fetch(API_HABITACIONES),
        fetch(API_TIPOS),
      ]);
      if (resReservaciones.ok) setReservaciones(await resReservaciones.json());
      if (resOcupacion.ok) setOcupacionGlobal(await resOcupacion.json());
      if (resHabitaciones.ok) setHabitaciones(await resHabitaciones.json());
      if (resTipos.ok) setTiposHabitacion(await resTipos.json());
    } catch {
      setErrorBanner("Error al conectar con el servidor para cargar las reservaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [sesion?.id_usuario]);

  useEffect(() => {
    if (exito || errorBanner) {
      const timer = setTimeout(() => {
        setExito(null);
        setErrorBanner(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [exito, errorBanner]);

  const tieneTraslapeEnFechas = (
    idHab: number,
    entrada: string,
    salida: string,
    ignorarIdReservacion?: number | null
  ): boolean => {
    return ocupacionGlobal.some((r) => {
      if (ignorarIdReservacion && r.id_reservacion === ignorarIdReservacion) return false;
      if (r.id_habitacion !== idHab) return false;
      return r.fecha_entrada < salida && r.fecha_salida > entrada;
    });
  };

  const abrirFormularioNuevo = () => {
    setEditandoId(null);
    setNombreCliente(!esAdmin && sesion?.nombre ? sesion.nombre : "");
    setTelefono("");
    setEmail(!esAdmin && sesion?.email ? sesion.email : "");

    const entradaInicial = hoyIso;
    const salidaInicial = obtenerFechaLocalIso(1, hoyIso);
    setFechaEntrada(entradaInicial);
    setFechaSalida(salidaInicial);

    const primerTipo = tiposHabitacion[0]?.id_tipo || "";
    setIdTipoFiltro(primerTipo);

    const disponibles = habitaciones.filter(
      (h) =>
        h.estado !== "Mantenimiento" &&
        (!primerTipo || h.tipoHabitacion?.id_tipo === Number(primerTipo)) &&
        !tieneTraslapeEnFechas(h.id_habitacion, entradaInicial, salidaInicial, null)
    );
    setIdHabitacion(disponibles.length > 0 ? disponibles[0].id_habitacion : "");
    setNumHuespedes(1);
    setEstado("Pendiente");
    setErrorModal(null);
    setModalFormAbierto(true);
  };

  const abrirFormularioEditar = (res: Reservacion) => {
    if (!esAdmin) return;
    setEditandoId(res.id_reservacion || null);
    setNombreCliente(res.nombre_cliente || "");
    setTelefono(res.telefono || "");
    setEmail(res.email || "");
    setFechaEntrada(res.fecha_entrada);
    setFechaSalida(res.fecha_salida);
    setIdTipoFiltro(res.habitacion?.tipoHabitacion?.id_tipo || "");
    setIdHabitacion(res.habitacion?.id_habitacion || "");
    setNumHuespedes(res.num_huespedes || 1);
    setEstado(res.estado || "Pendiente");
    setErrorModal(null);
    setModalFormAbierto(true);
  };

  const manejarCambioEntrada = (nuevaEntrada: string) => {
    setFechaEntrada(nuevaEntrada);
    if (fechaSalida <= nuevaEntrada) {
      setFechaSalida(obtenerFechaLocalIso(1, nuevaEntrada));
    }
  };

  const manejarCambioTipo = (nuevoIdTipo: string) => {
    const idTipoNum = nuevoIdTipo ? Number(nuevoIdTipo) : "";
    setIdTipoFiltro(idTipoNum);

    const habsDelTipo = habitaciones.filter(
      (h) =>
        h.estado !== "Mantenimiento" &&
        (!idTipoNum || h.tipoHabitacion?.id_tipo === idTipoNum) &&
        !tieneTraslapeEnFechas(h.id_habitacion, fechaEntrada, fechaSalida, editandoId)
    );
    const primeraHab = habsDelTipo[0];
    setIdHabitacion(primeraHab ? primeraHab.id_habitacion : "");

    const tipoObj = tiposHabitacion.find((t) => t.id_tipo === idTipoNum);
    if (tipoObj && numHuespedes > tipoObj.capacidad) {
      setNumHuespedes(tipoObj.capacidad);
    }
  };

  const manejarCambioHabitacion = (nuevoIdHab: string) => {
    const idHabNum = nuevoIdHab ? Number(nuevoIdHab) : "";
    setIdHabitacion(idHabNum);
    const hab = habitaciones.find((h) => h.id_habitacion === idHabNum);
    if (hab) {
      setIdTipoFiltro(hab.tipoHabitacion?.id_tipo || "");
      if (numHuespedes > (hab.tipoHabitacion?.capacidad || 1)) {
        setNumHuespedes(hab.tipoHabitacion.capacidad);
      }
    }
  };

  const calcularMontos = () => {
    const habSeleccionada = habitaciones.find((h) => h.id_habitacion === Number(idHabitacion));
    const tipoSeleccionado =
      habSeleccionada?.tipoHabitacion ||
      tiposHabitacion.find((t) => t.id_tipo === Number(idTipoFiltro));

    if (!tipoSeleccionado || !fechaEntrada || !fechaSalida) {
      return { noches: 0, montoTotal: 0, capacidadMax: 10 };
    }

    const d1 = new Date(fechaEntrada + "T00:00:00");
    const d2 = new Date(fechaSalida + "T00:00:00");
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    const noches = diff > 0 ? diff : 0;
    const montoTotal = noches * (tipoSeleccionado.precio_base || 0);

    return {
      noches,
      montoTotal,
      capacidadMax: tipoSeleccionado.capacidad || 1,
    };
  };

  const guardarReservacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);

    if (!idHabitacion) {
      setErrorModal("Selecciona un número de habitación disponible.");
      return;
    }

    const payload = {
      habitacion: { id_habitacion: Number(idHabitacion) },
      nombre_cliente: nombreCliente.trim(),
      telefono: telefono.trim(),
      email: email.trim() ? email.trim() : null,
      fecha_entrada: fechaEntrada,
      fecha_salida: fechaSalida,
      num_huespedes: Number(numHuespedes),
      estado: esAdmin ? estado : "Pendiente",
    };

    setGuardando(true);
    try {
      const url = editandoId ? `${API_RESERVACIONES}/${editandoId}` : API_RESERVACIONES;
      const metodo = editandoId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msgError =
          data.mensaje ||
          (data.errores && Object.values(data.errores).join(", ")) ||
          "No se pudo guardar la reservación.";
        setErrorModal(msgError);
        return;
      }

      setExito(data.mensaje || "Reservación guardada exitosamente.");
      setModalFormAbierto(false);
      cargarDatos();
    } catch {
      setErrorModal("Error de conexión con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarCheckIn = async (res: Reservacion) => {
    if (!esAdmin || !res.id_reservacion) return;

    if (hoyIso < res.fecha_entrada) {
      setErrorBanner(
        `No se puede realizar Check-in: la reservación ${res.folio || "#" + res.id_reservacion} inicia el ${res.fecha_entrada} (hoy es ${hoyIso}).`
      );
      return;
    }

    try {
      const response = await fetch(`${API_RESERVACIONES}/${res.id_reservacion}/check-in`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorBanner(data.mensaje || "No se pudo realizar el Check-in.");
        return;
      }
      setExito(data.mensaje || "Check-in realizado exitosamente.");
      cargarDatos();
    } catch {
      setErrorBanner("Error al conectar con el servidor.");
    }
  };

  const ejecutarCheckOut = async (res: Reservacion) => {
    if (!esAdmin || !res.id_reservacion) return;
    try {
      const response = await fetch(`${API_RESERVACIONES}/${res.id_reservacion}/check-out`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorBanner(data.mensaje || "No se pudo realizar el Check-out.");
        return;
      }
      setExito(data.mensaje || "Check-out realizado exitosamente.");
      cargarDatos();
    } catch {
      setErrorBanner("Error al conectar con el servidor.");
    }
  };

  const confirmarEliminarReservacion = async () => {
    if (!esAdmin || !reservacionAEliminar?.id_reservacion) return;
    const id = reservacionAEliminar.id_reservacion;
    setErrorBanner(null);

    try {
      const response = await fetch(`${API_RESERVACIONES}/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setErrorBanner(data.mensaje || "No se pudo eliminar la reservación.");
        setReservacionAEliminar(null);
        return;
      }
      setExito(data.mensaje || "Reservación eliminada correctamente.");
      setReservacionAEliminar(null);
      cargarDatos();
    } catch {
      setErrorBanner("Error al conectar con el servidor.");
      setReservacionAEliminar(null);
    }
  };

  // Procesar Pago Simulado del Huésped
  const manejarPagoSimulado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservacionAPagar?.id_reservacion) return;
    setProcesandoPago(true);

    const payload = {
      habitacion: { id_habitacion: reservacionAPagar.habitacion.id_habitacion },
      nombre_cliente: reservacionAPagar.nombre_cliente,
      telefono: reservacionAPagar.telefono,
      email: reservacionAPagar.email || null,
      fecha_entrada: reservacionAPagar.fecha_entrada,
      fecha_salida: reservacionAPagar.fecha_salida,
      num_huespedes: reservacionAPagar.num_huespedes,
      estado: "Confirmada",
    };

    try {
      const res = await fetch(`${API_RESERVACIONES}/${reservacionAPagar.id_reservacion}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.mensaje || "No se pudo procesar el pago.");
        return;
      }

      setExito("¡Pago procesado con éxito! Reservación confirmada.");
      setReservacionAPagar(null);
      setNumTarjeta("");
      setExpiracion("");
      setCvv("");
      cargarDatos();
    } catch {
      setErrorBanner("Error de conexión al procesar el pago.");
    } finally {
      setProcesandoPago(false);
    }
  };

  const renderBadgeEstado = (est: EstadoReservacion) => {
    switch (est) {
      case "Confirmada":
        return (
          <span className="badge-soft badge-emerald">
            <span className="dot"></span>
            Confirmada (Pagado)
          </span>
        );
      case "Pendiente":
        return (
          <span className="badge-soft badge-amber">
            <span className="dot"></span>
            Pendiente de Pago
          </span>
        );
      case "En Curso":
        return (
          <span
            className="badge-soft"
            style={{ backgroundColor: "#18181b", color: "#fbbf24", border: "1px solid #3f3f46" }}
          >
            <i className="bi bi-door-open-fill"></i>
            En Curso
          </span>
        );
      case "Finalizada":
        return (
          <span className="badge-soft badge-stone">
            <span className="dot"></span>
            Finalizada
          </span>
        );
      case "Cancelada":
        return (
          <span className="badge-soft badge-rose">
            <span className="dot"></span>
            Cancelada
          </span>
        );
    }
  };

  const { noches, montoTotal, capacidadMax } = calcularMontos();

  const habitacionesFiltradasPorTipo = habitaciones.filter(
    (h) =>
      h.estado !== "Mantenimiento" &&
      (!idTipoFiltro || h.tipoHabitacion?.id_tipo === Number(idTipoFiltro))
  );

  const totalPendientesConfirmadas = reservaciones.filter(
    (r) => r.estado === "Pendiente" || r.estado === "Confirmada"
  ).length;
  const totalEnCurso = reservaciones.filter((r) => r.estado === "En Curso").length;

  return (
    <div>
      {/* NOTIFICACIONES TOAST */}
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

      {/* STRIP DE KPIS */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="stat-box d-flex justify-content-between align-items-center shadow-sm">
            <div>
              <div className="text-muted small fw-medium">
                {esAdmin ? "Reservaciones por Llegar" : "Mis Próximas Estancias"}
              </div>
              <h3 className="fw-bold mb-0 mt-1">{totalPendientesConfirmadas}</h3>
            </div>
            <div className="brand-badge">
              <i className="bi bi-journal-bookmark"></i>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="stat-box d-flex justify-content-between align-items-center shadow-sm">
            <div>
              <div className="text-muted small fw-medium">
                {esAdmin ? "Check-In Activos (Ocupadas)" : "Mis Estancias En Curso"}
              </div>
              <h3 className="fw-bold mb-0 mt-1">{totalEnCurso}</h3>
            </div>
            <div className="brand-badge">
              <i className="bi bi-door-closed"></i>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="stat-box d-flex justify-content-between align-items-center shadow-sm">
            <div>
              <div className="text-muted small fw-medium">
                {esAdmin ? "Total de Reservaciones" : "Total de Mis Reservaciones"}
              </div>
              <h3 className="fw-bold mb-0 mt-1">{reservaciones.length}</h3>
            </div>
            <div className="brand-badge">
              <i className="bi bi-calendar2-week"></i>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="luxury-card">
        <div className="luxury-card-header">
          <div>
            <h5 className="fw-bold mb-1">
              {esAdmin
                ? "Control General de Reservaciones"
                : `Mis Reservaciones (${sesion?.nombre})`}
            </h5>
            <p className="text-muted small mb-0">
              {esAdmin
                ? "Gestiona todas las reservaciones, confirmaciones de pago y Check-in en recepción."
                : "Historial de reservaciones realizadas. Puedes pagar en línea las que estén pendientes."}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={cargarDatos}
              className="btn-luxury-outline"
              title="Actualizar tabla"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            {esAdmin && (
              <button
                type="button"
                onClick={abrirFormularioNuevo}
                className="btn-luxury-primary"
              >
                <i className="bi bi-plus-lg"></i>
                <span>Nueva Reservación</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Datos del Huésped</th>
                <th>Estancia y Habitación</th>
                <th>Entrada / Salida</th>
                <th>Monto Total</th>
                <th>Estatus de Pago</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Cargando reservaciones...
                  </td>
                </tr>
              ) : reservaciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No tienes reservaciones registradas actualmente.
                  </td>
                </tr>
              ) : (
                reservaciones.map((res) => {
                  const puedeHacerCheckInHoy =
                    res.estado === "Confirmada" && hoyIso >= res.fecha_entrada;

                  return (
                    <tr key={res.id_reservacion}>
                      <td>
                        <div className="fw-bold">
                          {res.folio || `R${10000 + (res.id_reservacion || 0)}`}
                        </div>
                        <small className="text-muted">
                          Reg: {res.fecha_registro || hoyIso}
                        </small>
                      </td>
                      <td>
                        <div className="fw-bold">{res.nombre_cliente}</div>
                        <div className="small text-muted">
                          <i className="bi bi-telephone me-1"></i>
                          {res.telefono}
                        </div>
                        {res.email && (
                          <div className="small text-muted">
                            <i className="bi bi-envelope me-1"></i>
                            {res.email}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-bold">
                          Hab. #{res.habitacion?.numero} · {res.habitacion?.tipoHabitacion?.nombre}
                        </div>
                        <div className="small text-muted">
                          <i className="bi bi-building me-1"></i>
                          {res.habitacion?.hotel?.nombre} · {res.num_huespedes || 1}{" "}
                          {res.num_huespedes === 1 ? "huésped" : "huéspedes"}
                        </div>
                      </td>
                      <td>
                        <div className="small">
                          <span className="text-muted">Entrada:</span>{" "}
                          <strong>{res.fecha_entrada}</strong>
                        </div>
                        <div className="small">
                          <span className="text-muted">Salida:</span>{" "}
                          <strong>{res.fecha_salida}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold fs-6" style={{ color: "#065f46" }}>
                          {formatoMoneda(Number(res.total || 0))}
                        </span>
                      </td>
                      <td>{renderBadgeEstado(res.estado)}</td>
                      <td className="text-end">
                        {!esAdmin ? (
                          <div className="d-inline-flex align-items-center gap-1">
                            {res.estado === "Pendiente" ? (
                              <button
                                type="button"
                                onClick={() => setReservacionAPagar(res)}
                                className="btn-luxury-primary py-1 px-3 small"
                                title="Realizar pago de la reservación"
                              >
                                <i className="bi bi-credit-card"></i>
                                <span>Pagar</span>
                              </button>
                            ) : res.estado === "Confirmada" ||
                              res.estado === "En Curso" ||
                              res.estado === "Finalizada" ? (
                              <button
                                type="button"
                                disabled
                                className="btn-luxury-outline py-1 px-3 small opacity-50"
                                style={{ cursor: "not-allowed" }}
                              >
                                <i className="bi bi-lock-fill me-1"></i>
                                Confirmada
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="btn-luxury-outline py-1 px-3 small opacity-50"
                                style={{ cursor: "not-allowed" }}
                              >
                                Cancelada
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="d-inline-flex align-items-center gap-1">
                            {res.estado === "Confirmada" && (
                              <button
                                type="button"
                                onClick={() => ejecutarCheckIn(res)}
                                className={
                                  puedeHacerCheckInHoy
                                    ? "btn-luxury-primary py-1 px-2 small me-1"
                                    : "btn-luxury-outline py-1 px-2 small me-1 opacity-75"
                                }
                                title={
                                  puedeHacerCheckInHoy
                                    ? "Registrar entrada del huésped"
                                    : `Check-in disponible a partir de ${res.fecha_entrada}`
                                }
                              >
                                <i className="bi bi-box-arrow-in-right"></i>
                                <span>Check-in</span>
                              </button>
                            )}

                            {res.estado === "En Curso" && (
                              <button
                                type="button"
                                onClick={() => ejecutarCheckOut(res)}
                                className="btn-luxury-primary py-1 px-2 small me-1"
                                title="Finalizar estancia y liberar habitación"
                              >
                                <i className="bi bi-box-arrow-right"></i>
                                <span>Check-out</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => abrirFormularioEditar(res)}
                              className="action-icon-btn"
                              title="Editar o modificar estancia"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => setReservacionAEliminar(res)}
                              className="action-icon-btn delete"
                              title="Eliminar"
                            >
                              <i className="bi bi-trash3"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: FORMULARIO CREAR / EDITAR RESERVACIÓN (ADMIN)
         ========================================================================= */}
      {modalFormAbierto && (
        <div className="modal-backdrop-custom" onClick={() => setModalFormAbierto(false)}>
          <div
            className="modal-window"
            style={{ maxWidth: "660px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-window-header">
              <h6 className="fw-bold mb-0">
                {editandoId ? `Modificar Reservación #${editandoId}` : "Registrar Nueva Reservación"}
              </h6>
              <button
                type="button"
                className="btn-close"
                onClick={() => setModalFormAbierto(false)}
              ></button>
            </div>

            <form onSubmit={guardarReservacion}>
              <div className="modal-window-body">
                {errorModal && (
                  <div className="login-alert login-alert-danger mb-3">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>{errorModal}</div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="input-label">
                    Nombre Completo <span className="login-req">*</span>
                  </label>
                  <div className="login-input-wrap">
                    <i className="bi bi-person login-input-icon"></i>
                    <input
                      type="text"
                      className="input-luxury"
                      placeholder="Ej. María López García"
                      required
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="input-label">
                      Teléfono <span className="login-req">*</span>
                    </label>
                    <div className="login-input-wrap">
                      <i className="bi bi-telephone login-input-icon"></i>
                      <input
                        type="tel"
                        className="input-luxury"
                        placeholder="Ej. 55 1234 5678"
                        required
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="input-label">Correo Electrónico (Opcional)</label>
                    <div className="login-input-wrap">
                      <i className="bi bi-envelope login-input-icon"></i>
                      <input
                        type="email"
                        className="input-luxury"
                        placeholder="nombre@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="input-label">
                      Fecha Entrada (Check-in) <span className="login-req">*</span>
                    </label>
                    <div className="login-input-wrap">
                      <i className="bi bi-calendar-event login-input-icon"></i>
                      <input
                        type="date"
                        className="input-luxury"
                        required
                        min={editandoId ? undefined : hoyIso}
                        value={fechaEntrada}
                        onChange={(e) => manejarCambioEntrada(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="input-label">
                      Fecha Salida (Check-out) <span className="login-req">*</span>
                    </label>
                    <div className="login-input-wrap">
                      <i className="bi bi-calendar-check login-input-icon"></i>
                      <input
                        type="date"
                        className="input-luxury"
                        required
                        min={obtenerFechaLocalIso(1, fechaEntrada)}
                        value={fechaSalida}
                        onChange={(e) => setFechaSalida(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="input-label">Categoría Tarifaria</label>
                    <div className="login-input-wrap">
                      <i className="bi bi-tags login-input-icon"></i>
                      <select
                        className="input-luxury"
                        value={idTipoFiltro}
                        onChange={(e) => manejarCambioTipo(e.target.value)}
                      >
                        <option value="">Todas las categorías</option>
                        {tiposHabitacion.map((t) => (
                          <option key={t.id_tipo} value={t.id_tipo}>
                            {t.nombre} · {formatoMoneda(t.precio_base)}/noche
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="input-label">
                      Habitación Asignada <span className="login-req">*</span>
                    </label>
                    <div className="login-input-wrap">
                      <i className="bi bi-door-open login-input-icon"></i>
                      <select
                        className="input-luxury"
                        required
                        value={idHabitacion}
                        onChange={(e) => manejarCambioHabitacion(e.target.value)}
                      >
                        <option value="">Seleccione habitación...</option>
                        {habitacionesFiltradasPorTipo.map((h) => {
                          const ocupada = tieneTraslapeEnFechas(
                            h.id_habitacion,
                            fechaEntrada,
                            fechaSalida,
                            editandoId
                          );
                          return (
                            <option
                              key={h.id_habitacion}
                              value={h.id_habitacion}
                              disabled={ocupada}
                            >
                              Hab. #{h.numero} — {h.hotel?.nombre} (Piso {h.piso})
                              {ocupada ? " [Ocupada]" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="input-label">
                      No. Huéspedes (Máx. {capacidadMax})
                    </label>
                    <div className="login-input-wrap">
                      <i className="bi bi-people login-input-icon"></i>
                      <input
                        type="number"
                        className="input-luxury"
                        min={1}
                        max={capacidadMax}
                        required
                        value={numHuespedes}
                        onChange={(e) => setNumHuespedes(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="input-label">Estatus de Pago / Cuenta</label>
                    <div className="login-input-wrap">
                      <i className="bi bi-credit-card-2-front login-input-icon"></i>
                      <select
                        className="input-luxury"
                        value={esAdmin ? estado : "Pendiente"}
                        disabled={!esAdmin}
                        onChange={(e) => setEstado(e.target.value as EstadoReservacion)}
                      >
                        <option value="Pendiente">Pendiente (Por pagar)</option>
                        <option value="Confirmada">Confirmada (Pago acreditado)</option>
                        <option value="En Curso" disabled={hoyIso < fechaEntrada}>
                          En Curso (Huésped en hotel)
                        </option>
                        <option value="Finalizada">Finalizada</option>
                        <option value="Cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Resumen de Tarifa */}
                <div
                  className="rounded-4 p-3 d-flex justify-content-between align-items-center text-white mt-3"
                  style={{
                    background:
                      "radial-gradient(circle at 85% 50%, rgba(251, 191, 36, 0.16), transparent 45%), #18181b",
                    border: "1px solid #27272a",
                  }}
                >
                  <div>
                    <small className="text-white-50 d-block text-uppercase" style={{ fontSize: "0.7rem" }}>
                      Estancia
                    </small>
                    <span className="fw-bold">
                      {noches} {noches === 1 ? "noche" : "noches"}
                    </span>
                  </div>
                  <div className="text-end">
                    <small className="text-white-50 d-block text-uppercase" style={{ fontSize: "0.7rem" }}>
                      Monto Total
                    </small>
                    <span className="fs-5 fw-bold" style={{ color: "#fbbf24" }}>
                      {formatoMoneda(montoTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-window-footer">
                <button
                  type="button"
                  className="btn-luxury-outline"
                  onClick={() => setModalFormAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="btn-luxury-primary">
                  {guardando
                    ? "Guardando..."
                    : editandoId
                      ? "Actualizar Reservación"
                      : "Guardar Reservación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: PASARELA DE PAGO SIMULADO (HUÉSPED)
         ========================================================================= */}
      {reservacionAPagar && (
        <div className="modal-backdrop-custom" onClick={() => setReservacionAPagar(null)}>
          <div
            className="modal-window"
            style={{ maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-window-header">
              <div>
                <h6 className="fw-bold mb-0">Pasarela de Pago Seguro</h6>
                <small className="text-muted">
                  Folio {reservacionAPagar.folio || `#${reservacionAPagar.id_reservacion}`}
                </small>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setReservacionAPagar(null)}
              ></button>
            </div>

            <form onSubmit={manejarPagoSimulado}>
              <div className="modal-window-body">
                {/* Desglose de cobro */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small">Habitación:</span>
                    <strong className="small">
                      #{reservacionAPagar.habitacion?.numero} ({reservacionAPagar.habitacion?.tipoHabitacion?.nombre})
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small">Estancia:</span>
                    <strong className="small">
                      {reservacionAPagar.fecha_entrada} al {reservacionAPagar.fecha_salida}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between pt-2 mt-2 border-top">
                    <span className="fw-semibold">Total a pagar:</span>
                    <span className="fw-bold fs-6" style={{ color: "#065f46" }}>
                      {formatoMoneda(Number(reservacionAPagar.total || 0))}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="input-label">Titular de la Tarjeta</label>
                  <div className="login-input-wrap">
                    <i className="bi bi-person login-input-icon"></i>
                    <input
                      type="text"
                      required
                      className="input-luxury"
                      defaultValue={reservacionAPagar.nombre_cliente}
                      placeholder="Nombre como aparece en la tarjeta"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="input-label">Número de Tarjeta</label>
                  <div className="login-input-wrap">
                    <i className="bi bi-credit-card login-input-icon"></i>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      className="input-luxury"
                      placeholder="4000 1234 5678 9010"
                      value={numTarjeta}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                        const conEspacios = val.match(/.{1,4}/g)?.join(" ") || val;
                        setNumTarjeta(conEspacios);
                      }}
                    />
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <label className="input-label">Vencimiento</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      className="input-luxury text-center"
                      placeholder="MM/AA"
                      value={expiracion}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (val.length >= 3) {
                          val = val.slice(0, 2) + "/" + val.slice(2);
                        }
                        setExpiracion(val);
                      }}
                    />
                  </div>
                  <div className="col-6">
                    <label className="input-label">CVV</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      className="input-luxury text-center"
                      placeholder="•••"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </div>
                </div>

                <small className="text-muted d-block text-center mt-3" style={{ fontSize: "0.75rem" }}>
                  <i className="bi bi-shield-lock-fill text-success me-1"></i>
                  Transacción protegida con cifrado simulado de 256 bits.
                </small>
              </div>

              <div className="modal-window-footer">
                <button
                  type="button"
                  className="btn-luxury-outline"
                  onClick={() => setReservacionAPagar(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoPago}
                  className="btn-luxury-primary"
                >
                  <i className="bi bi-check2-circle"></i>
                  <span>
                    {procesandoPago
                      ? "Procesando pago..."
                      : `Pagar ${formatoMoneda(Number(reservacionAPagar.total || 0))}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CONFIRMACIÓN PARA ELIMINAR (ADMIN)
         ========================================================================= */}
      {reservacionAEliminar && (
        <div className="modal-backdrop-custom" onClick={() => setReservacionAEliminar(null)}>
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
                ¿Eliminar reservación{" "}
                {reservacionAEliminar.folio || `#${reservacionAEliminar.id_reservacion}`}?
              </h5>
              <p className="text-muted small mb-0">
                Se dará de baja la reservación de{" "}
                <strong>{reservacionAEliminar.nombre_cliente}</strong> en{" "}
                <strong>{reservacionAEliminar.habitacion?.hotel?.nombre || "el hotel"}</strong>.
              </p>
            </div>
            <div className="modal-window-footer justify-content-center">
              <button
                type="button"
                onClick={() => setReservacionAEliminar(null)}
                className="btn-luxury-outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarReservacion}
                className="btn btn-danger rounded-3 px-4"
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

export default ReservacionesCrud;