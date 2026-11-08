import React, { useState, useEffect, useRef } from "react";
import { type SesionUsuario } from "./LoginView";

type TipoGraficaGerente = "temporadas" | "anios" | "meses" | "hoteles" | "categorias";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  model?: string;
  tiempoMs?: number;
  error?: boolean;
  originalQuestion?: string;
  chartType?: TipoGraficaGerente;
}

interface ConversationSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface AsistenteIaViewProps {
  sesion?: SesionUsuario | null;
}

interface DatoGrafica {
  etiqueta: string;
  reservas: number;
  ingresos: number;
  color: string;
}

const STORAGE_MODEL_KEY = "paraiso_ai_selected_model_v4";
const hostActual = typeof window !== "undefined" ? window.location.hostname : "localhost";
const API_ROOT = (import.meta as any).env?.VITE_API_URL || `http://${hostActual}:8082/api`;
const API_BASE_URL = `${API_ROOT}/hotel-ai`;
const API_RESERVACIONES_URL = `${API_ROOT}/reservaciones`;

const CONSULTAS_RAPIDAS_GERENTE: {
  id: TipoGraficaGerente;
  titulo: string;
  icono: string;
  pregunta: string;
}[] = [
  {
    id: "temporadas",
    titulo: "Ocupación e Ingresos por Temporada",
    icono: "bi-sun-fill",
    pregunta:
      "Genera la gráfica y análisis estadístico de reservaciones e ingresos por Temporada Turística (Alta, Media y Baja).",
  },
  {
    id: "anios",
    titulo: "Crecimiento Anual (2020 - 2026)",
    icono: "bi-graph-up-arrow",
    pregunta:
      "Muéstrame la gráfica de evolución anual de reservaciones e ingresos desde 2020 hasta 2026.",
  },
  {
    id: "meses",
    titulo: "Comportamiento Mensual",
    icono: "bi-calendar3-range",
    pregunta:
      "Genera la gráfica comparativa de reservaciones e ingresos acumulados por cada mes del año.",
  },
  {
    id: "hoteles",
    titulo: "Comparativa por Sede (CDMX vs Cancún)",
    icono: "bi-buildings",
    pregunta:
      "Compara en gráfica el rendimiento de reservaciones e ingresos entre Hotel Paraíso CDMX y Hotel Paraíso Ejecutivo Cancún.",
  },
  {
    id: "categorias",
    titulo: "Rentabilidad por Tipo de Habitación",
    icono: "bi-pie-chart-fill",
    pregunta:
      "Muéstrame la gráfica de rentabilidad y demanda por categoría de habitación (Sencilla, Doble y Suite Presidencial).",
  },
];

const detectarTipoGrafica = (pregunta: string): TipoGraficaGerente | undefined => {
  const q = pregunta.toLowerCase();
  if (q.includes("temporada")) return "temporadas";
  if (q.includes("anual") || q.includes("año") || q.includes("2020")) return "anios";
  if (q.includes("mensual") || q.includes("mes")) return "meses";
  if (q.includes("sede") || q.includes("cdmx") || q.includes("cancún") || q.includes("cancun"))
    return "hoteles";
  if (q.includes("categoría") || q.includes("categoria") || q.includes("suite") || q.includes("tipo"))
    return "categorias";
  if (q.includes("gráfica") || q.includes("grafica") || q.includes("estadística")) return "temporadas";
  return undefined;
};

const obtenerFechaLocalIso = (diasSumar = 0, fechaBase?: string): string => {
  const base = fechaBase ? new Date(fechaBase + "T00:00:00") : new Date();
  base.setDate(base.getDate() + diasSumar);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatearMoneda = (valor: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(valor || 0);

const formatearNegritasEnLinea = (linea: string): React.ReactNode[] => {
  const partes = linea.split(/(\*\*.*?\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length >= 4) {
      const limpio = parte.slice(2, -2).replace(/\*/g, "").trim();
      return (
        <strong key={i} className="fw-bold text-dark">
          {limpio}
        </strong>
      );
    }
    return <span key={i}>{parte.replace(/\*/g, "")}</span>;
  });
};

const esSeparadorTablaMarkdown = (linea: string): boolean => {
  const sinBarras = linea.replace(/\|/g, "").trim();
  return sinBarras.length > 0 && /^[:\-\s]+$/.test(sinBarras);
};

const extraerCeldasTabla = (linea: string): string[] => {
  let limpia = linea.trim();
  if (limpia.startsWith("|")) limpia = limpia.slice(1);
  if (limpia.endsWith("|")) limpia = limpia.slice(0, -1);
  return limpia.split("|").map((celda) => celda.replace(/\*/g, "").trim());
};

const renderizarTextoFormateado = (texto: string): React.ReactNode => {
  if (!texto) return null;
  const lineas = texto.split(/\r?\n/);
  const elementos: React.ReactNode[] = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i].trim();

    if (!linea) {
      elementos.push(<div key={`sp-${i}`} style={{ height: "6px" }} />);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(linea)) {
      elementos.push(<hr key={`hr-${i}`} className="my-2 opacity-25" />);
      i++;
      continue;
    }

    const matchHeader = linea.match(/^#{1,6}\s+(.*)$/);
    if (matchHeader) {
      const textoHeader = matchHeader[1].replace(/\*/g, "").trim();
      elementos.push(
        <div key={`hd-${i}`} className="fw-bold text-dark mt-2 mb-1" style={{ fontSize: "0.98rem" }}>
          {textoHeader}
        </div>
      );
      i++;
      continue;
    }

    if (linea.startsWith("|") && linea.includes("|")) {
      const filasTabla: string[] = [];
      while (i < lineas.length && lineas[i].trim().startsWith("|")) {
        filasTabla.push(lineas[i].trim());
        i++;
      }

      const filasDatos = filasTabla.filter((f) => !esSeparadorTablaMarkdown(f));
      if (filasDatos.length > 0) {
        const encabezados = extraerCeldasTabla(filasDatos[0]);
        const cuerpo = filasDatos.slice(1).map(extraerCeldasTabla);

        elementos.push(
          <div key={`tbl-${i}`} className="table-responsive my-2 rounded-3 border overflow-hidden">
            <table className="table table-sm table-bordered mb-0 align-middle small">
              <thead className="table-dark">
                <tr>
                  {encabezados.map((enc, idxCol) => (
                    <th key={idxCol} className="px-2 py-2 fw-semibold">
                      {enc}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuerpo.map((fila, idxFila) => {
                  const esFilaTotal = fila.some((c) => c.toUpperCase().includes("TOTAL"));
                  return (
                    <tr
                      key={idxFila}
                      className={esFilaTotal ? "table-warning fw-bold" : "bg-white"}
                    >
                      {encabezados.map((_, idxCol) => (
                        <td
                          key={idxCol}
                          className={`px-2 py-1 ${idxCol === 0 || esFilaTotal ? "fw-semibold text-dark" : "text-secondary"}`}
                        >
                          {fila[idxCol] || ""}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    const matchImagenMd = linea.match(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/);
    if (matchImagenMd) {
      const tituloImg = matchImagenMd[1] || "Vista previa de la habitación";
      const urlImg = matchImagenMd[2];
      elementos.push(
        <div key={`img-${i}`} className="my-2">
          <div className="ia2-img card border rounded-4 overflow-hidden shadow-sm">
            <img
              src={urlImg}
              alt={tituloImg}
              style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }}
            />
            <div className="p-2 bg-dark text-white small d-flex align-items-center justify-content-between px-3">
              <span className="text-truncate me-2">
                <i className="bi bi-camera-fill text-warning me-2"></i>
                {tituloImg}
              </span>
              <a
                href={urlImg}
                target="_blank"
                rel="noreferrer"
                className="text-warning text-decoration-none small flex-shrink-0"
              >
                Ver grande
              </a>
            </div>
          </div>
        </div>
      );
      i++;
      continue;
    }

    const matchBullet = linea.match(/^([*\-•])\s+(.*)$/);
    if (matchBullet) {
      elementos.push(
        <div key={`bl-${i}`} className="d-flex align-items-start gap-2 ps-1 py-1">
          <span
            className="rounded-circle bg-warning mt-2 flex-shrink-0"
            style={{ width: "6px", height: "6px" }}
          />
          <div style={{ lineHeight: "1.5" }}>{formatearNegritasEnLinea(matchBullet[2])}</div>
        </div>
      );
      i++;
      continue;
    }

    const matchNumero = linea.match(/^(\d+\.)\s+(.*)$/);
    if (matchNumero) {
      elementos.push(
        <div key={`nm-${i}`} className="d-flex align-items-start gap-2 ps-1 py-1">
          <strong className="text-dark flex-shrink-0">{matchNumero[1]}</strong>
          <div style={{ lineHeight: "1.5" }}>{formatearNegritasEnLinea(matchNumero[2])}</div>
        </div>
      );
      i++;
      continue;
    }

    elementos.push(
      <div key={`ln-${i}`} style={{ lineHeight: "1.55" }}>
        {formatearNegritasEnLinea(linea)}
      </div>
    );
    i++;
  }

  return <div className="d-flex flex-column gap-1">{elementos}</div>;
};

const generarNuevoIdSesion = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const crearSesionInicial = (
  nombreUsuario?: string,
  idSesion?: string,
  rolUsuario?: string
): ConversationSession => {
  let saludoPersonalizado = "";
  if (rolUsuario === "GERENTE") {
    saludoPersonalizado = `¡Hola, **${nombreUsuario || "Gerente"}**! Soy tu **Asistente Analítico Gerencial**. Tienes a tu izquierda accesos directos para generar **gráficas en tiempo real** sobre las reservaciones históricas (2020–2026). ¿Qué indicador deseas analizar hoy?`;
  } else if (rolUsuario === "RECEPCIONISTA") {
    saludoPersonalizado = `¡Hola, **${nombreUsuario || "Recepcionista"}**! Soy tu **Asistente Operativo de Recepción**. Puedes consultarme disponibilidad, registrar estancias o indicar *"Realizar check-in del folio R..."*. ¿En qué te apoyo?`;
  } else {
    saludoPersonalizado = nombreUsuario
      ? `¡Hola, **${nombreUsuario}**! Consulta disponibilidad, reserva habitaciones o gestiona tu estancia con tu código de folio. ¿En qué te ayudo?`
      : "¡Hola! Consulta disponibilidad, reserva o gestiona tu estancia con tu folio. ¿En qué te ayudo?";
  }

  return {
    id: idSesion || generarNuevoIdSesion(),
    title: "Nueva consulta",
    updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    messages: [
      {
        id: "msg-welcome",
        role: "assistant",
        text: saludoPersonalizado,
        model: "gemini",
      },
    ],
  };
};

export const AsistenteIaView: React.FC<AsistenteIaViewProps> = ({ sesion }) => {
  const rolActual = (sesion?.rol as string) || "HUESPED";
  const esGerente = rolActual === "GERENTE";
  const esRecepcionista = rolActual === "RECEPCIONISTA";

  const [conversations, setConversations] = useState<ConversationSession[]>(() => {
    const inicial = crearSesionInicial(sesion?.nombre, undefined, rolActual);
    return [inicial];
  });
  const [activeConvId, setActiveConvId] = useState<string>(() => conversations[0]?.id || "");

  const [modelo, setModelo] = useState<"gemini" | "llama3.2:3b">(() => {
    const savedModel = localStorage.getItem(STORAGE_MODEL_KEY);
    return savedModel === "llama3.2:3b" ? "llama3.2:3b" : "gemini";
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reservacionesBD, setReservacionesBD] = useState<any[]>([]);

  // UI estados (Desktop/Tablet + Móvil)
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [fechasAbiertas, setFechasAbiertas] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth >= 992
  );
  const [fechasMovilAbiertas, setFechasMovilAbiertas] = useState(false);
  const [historialMovilAbierto, setHistorialMovilAbierto] = useState(false);

  const [chatAEliminar, setChatAEliminar] = useState<ConversationSession | null>(null);

  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const recognitionRef = useRef<any>(null);

  const hoyIso = obtenerFechaLocalIso(0);
  const [fechaEntrada, setFechaEntrada] = useState<string>(hoyIso);
  const [fechaSalida, setFechaSalida] = useState<string>(obtenerFechaLocalIso(1, hoyIso));

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationsRef = useRef<ConversationSession[]>(conversations);
  conversationsRef.current = conversations;

  const cargarReservacionesParaRol = async () => {
    if (!esGerente && !esRecepcionista) return;
    try {
      const res = await fetch(API_RESERVACIONES_URL);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setReservacionesBD(data);
      }
    } catch {
      // Ignorar error de red
    }
  };

  useEffect(() => {
    cargarReservacionesParaRol();
  }, [esGerente, esRecepcionista, sesion?.token]);

  const calcularDatosGrafica = (tipo: TipoGraficaGerente): DatoGrafica[] => {
    const efectivas = reservacionesBD.filter((r) => r.estado !== "Cancelada");

    if (tipo === "temporadas") {
      const grupos: Record<string, { reservas: number; ingresos: number; color: string }> = {
        "Alta Verano (Jul-Ago)": { reservas: 0, ingresos: 0, color: "#f59e0b" },
        "Alta Invierno (Dic-Ene)": { reservas: 0, ingresos: 0, color: "#0284c7" },
        "Semana Santa (Mar-Abr)": { reservas: 0, ingresos: 0, color: "#8b5cf6" },
        "Media (May/Oct/Nov)": { reservas: 0, ingresos: 0, color: "#10b981" },
        "Baja (Feb/Jun/Sep)": { reservas: 0, ingresos: 0, color: "#64748b" },
      };

      efectivas.forEach((r) => {
        const mes = Number((r.fecha_entrada || "").split("-")[1] || 1);
        const monto = Number(r.total || 0);
        if (mes === 7 || mes === 8) {
          grupos["Alta Verano (Jul-Ago)"].reservas++;
          grupos["Alta Verano (Jul-Ago)"].ingresos += monto;
        } else if (mes === 12 || mes === 1) {
          grupos["Alta Invierno (Dic-Ene)"].reservas++;
          grupos["Alta Invierno (Dic-Ene)"].ingresos += monto;
        } else if (mes === 3 || mes === 4) {
          grupos["Semana Santa (Mar-Abr)"].reservas++;
          grupos["Semana Santa (Mar-Abr)"].ingresos += monto;
        } else if (mes === 5 || mes === 10 || mes === 11) {
          grupos["Media (May/Oct/Nov)"].reservas++;
          grupos["Media (May/Oct/Nov)"].ingresos += monto;
        } else {
          grupos["Baja (Feb/Jun/Sep)"].reservas++;
          grupos["Baja (Feb/Jun/Sep)"].ingresos += monto;
        }
      });

      return Object.entries(grupos).map(([etiqueta, v]) => ({ etiqueta, ...v }));
    }

    if (tipo === "anios") {
      const anios = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];
      const colores = ["#94a3b8", "#64748b", "#0284c7", "#0d9488", "#10b981", "#f59e0b", "#d97706"];
      return anios.map((anio, idx) => {
        const delAnio = efectivas.filter((r) => String(r.fecha_entrada || "").startsWith(anio));
        const ingresos = delAnio.reduce((acc, r) => acc + Number(r.total || 0), 0);
        return {
          etiqueta: anio,
          reservas: delAnio.length,
          ingresos,
          color: colores[idx % colores.length],
        };
      });
    }

    if (tipo === "meses") {
      const nombresMes = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
      ];
      return nombresMes.map((nombre, idx) => {
        const numMes = idx + 1;
        const delMes = efectivas.filter(
          (r) => Number((r.fecha_entrada || "").split("-")[1]) === numMes
        );
        const ingresos = delMes.reduce((acc, r) => acc + Number(r.total || 0), 0);
        const esAlta = [1, 3, 4, 7, 8, 12].includes(numMes);
        return {
          etiqueta: nombre,
          reservas: delMes.length,
          ingresos,
          color: esAlta ? "#f59e0b" : "#3b82f6",
        };
      });
    }

    if (tipo === "hoteles") {
      const mapa: Record<string, { reservas: number; ingresos: number }> = {};
      efectivas.forEach((r) => {
        const sede = r.habitacion?.hotel?.nombre || "Hotel Paraíso";
        if (!mapa[sede]) mapa[sede] = { reservas: 0, ingresos: 0 };
        mapa[sede].reservas++;
        mapa[sede].ingresos += Number(r.total || 0);
      });
      const colores = ["#18181b", "#d97706", "#0284c7"];
      return Object.entries(mapa).map(([etiqueta, v], i) => ({
        etiqueta,
        reservas: v.reservas,
        ingresos: v.ingresos,
        color: colores[i % colores.length],
      }));
    }

    const mapaCat: Record<string, { reservas: number; ingresos: number }> = {};
    efectivas.forEach((r) => {
      const cat = r.habitacion?.tipoHabitacion?.nombre || "Estándar";
      if (!mapaCat[cat]) mapaCat[cat] = { reservas: 0, ingresos: 0 };
      mapaCat[cat].reservas++;
      mapaCat[cat].ingresos += Number(r.total || 0);
    });
    const coloresCat = ["#10b981", "#3b82f6", "#f59e0b"];
    return Object.entries(mapaCat).map(([etiqueta, v], i) => ({
      etiqueta,
      reservas: v.reservas,
      ingresos: v.ingresos,
      color: coloresCat[i % coloresCat.length],
    }));
  };

  const renderizarGraficaGerente = (tipo: TipoGraficaGerente) => {
    const datos = calcularDatosGrafica(tipo);
    const maxReservas = Math.max(1, ...datos.map((d) => d.reservas));
    const totalReservas = datos.reduce((acc, d) => acc + d.reservas, 0);
    const totalIngresos = datos.reduce((acc, d) => acc + d.ingresos, 0);

    const titulos: Record<TipoGraficaGerente, string> = {
      temporadas: "Distribución por Temporada Turística (2020–2026)",
      anios: "Evolución Anual de Reservaciones e Ingresos (2020–2026)",
      meses: "Comportamiento Mensual Acumulado",
      hoteles: "Comparativa de Rendimiento por Sede",
      categorias: "Demanda e Ingresos por Categoría de Habitación",
    };

    return (
      <div className="mt-3 p-3 rounded-4 border bg-light">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom">
          <div>
            <span className="badge bg-warning text-dark mb-1">
              <i className="bi bi-bar-chart-fill me-1"></i>Gráfica Gerencial en Tiempo Real
            </span>
            <h6 className="fw-bold text-dark mb-0">{titulos[tipo]}</h6>
          </div>
          <div className="text-end">
            <div className="small text-muted">
              Total Efectivas: <strong>{totalReservas}</strong>
            </div>
            <div className="small fw-bold" style={{ color: "#065f46" }}>
              Ingresos: {formatearMoneda(totalIngresos)}
            </div>
          </div>
        </div>

        <div className="d-flex flex-column gap-2">
          {datos.map((item, idx) => {
            const porcentajeAncho = Math.max(6, Math.round((item.reservas / maxReservas) * 100));
            const porcentajeDelTotal =
              totalReservas > 0 ? ((item.reservas / totalReservas) * 100).toFixed(1) : "0.0";

            return (
              <div key={idx} className="bg-white p-2 rounded-3 border">
                <div className="d-flex justify-content-between align-items-center small mb-1">
                  <span className="fw-semibold text-dark">{item.etiqueta}</span>
                  <span className="text-muted">
                    <strong>{item.reservas}</strong> res. ({porcentajeDelTotal}%) ·{" "}
                    <strong style={{ color: "#065f46" }}>{formatearMoneda(item.ingresos)}</strong>
                  </span>
                </div>
                <div className="w-100 bg-light rounded-pill overflow-hidden" style={{ height: "10px" }}>
                  <div
                    className="h-100 rounded-pill"
                    style={{
                      width: `${porcentajeAncho}%`,
                      backgroundColor: item.color,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const guardarSesionEnServidor = async (conv: ConversationSession) => {
    if (!sesion?.token) return;
    try {
      await fetch(`${API_BASE_URL}/sesiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: conv.id,
          title: conv.title,
          updatedAt: conv.updatedAt,
          messagesJson: JSON.stringify(conv.messages),
        }),
      });
    } catch {
      // Ignorar error de red
    }
  };

  useEffect(() => {
    const cargarSesionesDelServidor = async () => {
      if (!sesion?.token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/sesiones`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const vistos = new Set<string>();
            const reconstruidas: ConversationSession[] = [];

            data.forEach((row: any, idx: number) => {
              let idLimpio = String(row.id_sesion || "").replace(/^u\d+_/, "").trim();
              if (!idLimpio || vistos.has(idLimpio)) {
                idLimpio = `${generarNuevoIdSesion()}_${idx}`;
              }
              vistos.add(idLimpio);

              let msgs: ChatMessage[] = [];
              try {
                msgs = JSON.parse(row.mensajes_json || "[]");
              } catch {
                msgs = [];
              }
              reconstruidas.push({
                id: idLimpio,
                title: row.titulo || "Consulta",
                updatedAt: row.updated_at || "",
                messages:
                  msgs.length > 0
                    ? msgs
                    : crearSesionInicial(sesion?.nombre, idLimpio, rolActual).messages,
              });
            });

            setConversations(reconstruidas);
            setActiveConvId(reconstruidas[0].id);
            return;
          }
        }
      } catch {
        // Ignorar
      }
      const inicial = crearSesionInicial(sesion?.nombre, generarNuevoIdSesion(), rolActual);
      setConversations([inicial]);
      setActiveConvId(inicial.id);
      guardarSesionEnServidor(inicial);
    };

    cargarSesionesDelServidor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.id_usuario, sesion?.token]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MODEL_KEY, modelo);
  }, [modelo]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    if (mobileChatContainerRef.current) {
      mobileChatContainerRef.current.scrollTop = mobileChatContainerRef.current.scrollHeight;
    }
  }, [conversations, activeConvId, loading]);

  useEffect(() => {
    [textareaRef.current, mobileTextareaRef.current].forEach((el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 110) + "px";
    });
  }, [input]);

  useEffect(() => {
    if (!panelAbierto && !historialMovilAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanelAbierto(false);
        setHistorialMovilAbierto(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelAbierto, historialMovilAbierto]);

  const manejarCambioEntrada = (nuevaEntrada: string) => {
    if (nuevaEntrada < hoyIso) {
      setFechaEntrada(hoyIso);
      return;
    }
    setFechaEntrada(nuevaEntrada);
    if (fechaSalida <= nuevaEntrada) {
      setFechaSalida(obtenerFechaLocalIso(1, nuevaEntrada));
    }
  };

  const manejarCambioSalida = (nuevaSalida: string) => {
    const minSalida = obtenerFechaLocalIso(1, fechaEntrada);
    if (nuevaSalida < minSalida) {
      setFechaSalida(minSalida);
      return;
    }
    setFechaSalida(nuevaSalida);
  };

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0];

  const handleNuevaConversacion = () => {
    const nueva = crearSesionInicial(sesion?.nombre, generarNuevoIdSesion(), rolActual);
    setConversations((prev) => [nueva, ...prev]);
    setActiveConvId(nueva.id);
    setInput("");
    setPanelAbierto(false);
    setHistorialMovilAbierto(false);
    guardarSesionEnServidor(nueva);
  };

  const solicitarEliminarConversacion = (conv: ConversationSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setChatAEliminar(conv);
  };

  const confirmarEliminarConversacion = async () => {
    if (!chatAEliminar) return;
    const idEliminar = chatAEliminar.id;
    setChatAEliminar(null);

    try {
      const idLimpio = idEliminar.replace(/^u\d+_/, "");
      await fetch(`${API_BASE_URL}/history/${encodeURIComponent(idLimpio)}`, {
        method: "DELETE",
      });
    } catch {
      // Ignorar
    }

    setConversations((prev) => {
      const restantes = prev.filter((c) => c.id !== idEliminar);
      if (restantes.length === 0) {
        const inicial = crearSesionInicial(sesion?.nombre, generarNuevoIdSesion(), rolActual);
        setActiveConvId(inicial.id);
        guardarSesionEnServidor(inicial);
        return [inicial];
      }
      if (idEliminar === activeConversation?.id) {
        setActiveConvId(restantes[0].id);
      }
      return restantes;
    });
  };

  const intentarCheckInOutPorChat = async (texto: string): Promise<string | null> => {
    if (!esRecepcionista) return null;
    const lower = texto.toLowerCase();
    const pideCheckIn =
      lower.includes("check-in") || lower.includes("checkin") || lower.includes("check in");
    const pideCheckOut =
      lower.includes("check-out") || lower.includes("checkout") || lower.includes("check out");

    if (!pideCheckIn && !pideCheckOut) return null;

    const matchFolio = texto.match(/\b(R\d+)\b/i);
    if (!matchFolio) {
      return 'Para ejecutar el **Check-in** o **Check-out** desde el chat, por favor indícame el código de **Folio** (por ejemplo: *"Realizar check-in del folio R20010"*).';
    }

    const folioBuscado = matchFolio[1].toUpperCase();
    const resLista = await fetch(API_RESERVACIONES_URL);
    if (!resLista.ok) return "No fue posible consultar las reservaciones en el servidor.";
    const lista: any[] = await resLista.json();

    const encontrada = lista.find(
      (r) =>
        String(r.folio || `R${10000 + (r.id_reservacion || 0)}`).toUpperCase() === folioBuscado
    );

    if (!encontrada) {
      return `No se encontró ninguna reservación registrada con el folio **${folioBuscado}**.`;
    }

    const endpoint = pideCheckIn ? "check-in" : "check-out";
    const respAccion = await fetch(
      `${API_RESERVACIONES_URL}/${encontrada.id_reservacion}/${endpoint}`,
      { method: "POST" }
    );
    const dataAccion = await respAccion.json().catch(() => ({}));

    if (!respAccion.ok) {
      return `⚠️ **No se pudo completar el ${pideCheckIn ? "Check-in" : "Check-out"} del folio ${folioBuscado}:** ${
        dataAccion.mensaje || "Verifica que la reservación esté Confirmada y en fecha válida."
      }`;
    }

    cargarReservacionesParaRol();
    return (
      `✅ **${pideCheckIn ? "Check-in" : "Check-out"} ejecutado con éxito en el sistema**\n` +
      `- **Folio:** ${folioBuscado}\n` +
      `- **Huésped:** ${encontrada.nombre_cliente}\n` +
      `- **Habitación:** #${encontrada.habitacion?.numero} (${encontrada.habitacion?.tipoHabitacion?.nombre}) — ${encontrada.habitacion?.hotel?.nombre}\n` +
      `- **Nuevo Estado:** **${pideCheckIn ? "En Curso" : "Finalizada"}**`
    );
  };

  const enviarPregunta = async (
    textoPregunta: string,
    forzarGrafica?: TipoGraficaGerente
  ) => {
    const preguntaLimpia = textoPregunta.trim();
    if (!preguntaLimpia || loading) return;

    const convId = activeConversation.id;
    const horaActual = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const graficaDetectada = esGerente
      ? forzarGrafica || detectarTipoGrafica(preguntaLimpia)
      : undefined;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      text: preguntaLimpia,
    };

    const base =
      conversationsRef.current.find((c) => c.id === convId) || activeConversation;
    const tieneMensajesUsuario = base.messages.some((m) => m.role === "user");

    const conversacionConPregunta: ConversationSession = {
      ...base,
      title: !tieneMensajesUsuario
        ? preguntaLimpia.slice(0, 34) + (preguntaLimpia.length > 34 ? "..." : "")
        : base.title,
      updatedAt: horaActual,
      messages: [...base.messages, userMsg],
    };

    setConversations((prev) => prev.map((c) => (c.id === convId ? conversacionConPregunta : c)));
    guardarSesionEnServidor(conversacionConPregunta);

    setInput("");
    setLoading(true);

    try {
      const inicioMs = performance.now();
      const respuestaRecepcion = await intentarCheckInOutPorChat(preguntaLimpia);
      if (respuestaRecepcion) {
        const assistantMsg: ChatMessage = {
          id: "ai-" + Date.now(),
          role: "assistant",
          text: respuestaRecepcion,
          model: modelo,
          tiempoMs: Math.round(performance.now() - inicioMs),
        };
        const conversacionFinal: ConversationSession = {
          ...conversacionConPregunta,
          updatedAt: horaActual,
          messages: [...conversacionConPregunta.messages, assistantMsg],
        };
        setConversations((prev) => prev.map((c) => (c.id === convId ? conversacionFinal : c)));
        guardarSesionEnServidor(conversacionFinal);
        setLoading(false);
        return;
      }

      let preguntaParaBackend = preguntaLimpia;
      if (esGerente && graficaDetectada && reservacionesBD.length > 0) {
        const resumen = calcularDatosGrafica(graficaDetectada)
          .map((d) => `${d.etiqueta}: ${d.reservas} reservas (${formatearMoneda(d.ingresos)})`)
          .join("; ");
        preguntaParaBackend = `${preguntaLimpia}\n[Contexto estadístico real del sistema: ${resumen}. Redacta un resumen ejecutivo breve de estos indicadores sin usar asteriscos dobles dentro de tablas.]`;
      }

      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: preguntaParaBackend,
          question: preguntaParaBackend,
          modelo: modelo,
          model: modelo,
          conversationId: convId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const textoRespuesta =
        data.respuesta || data.answer || "No se recibió respuesta del asistente.";

      const assistantMsg: ChatMessage = {
        id: "ai-" + Date.now(),
        role: "assistant",
        text: textoRespuesta,
        model: data.modeloUsado || modelo,
        tiempoMs: data.tiempoMs,
        chartType: graficaDetectada,
      };

      const conversacionFinal: ConversationSession = {
        ...conversacionConPregunta,
        updatedAt: horaActual,
        messages: [...conversacionConPregunta.messages, assistantMsg],
      };

      setConversations((prev) => prev.map((c) => (c.id === convId ? conversacionFinal : c)));
      guardarSesionEnServidor(conversacionFinal);
    } catch {
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        text: "Error al conectar al servidor.",
        error: true,
        originalQuestion: preguntaLimpia,
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, errorMsg] } : c))
      );
    } finally {
      setLoading(false);
    }
  };

  const alternarDictadoPorVoz = () => {
    if (escuchandoVoz && recognitionRef.current) {
      recognitionRef.current.stop();
      setEscuchandoVoz(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta dictado por voz. Usa Google Chrome o Microsoft Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let textoFinalCapturado = "";

    recognition.onstart = () => setEscuchandoVoz(true);

    recognition.onresult = (event: any) => {
      let transcripcionInterina = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const texto = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          textoFinalCapturado += texto;
        } else {
          transcripcionInterina += texto;
        }
      }
      setInput(textoFinalCapturado || transcripcionInterina);
    };

    recognition.onerror = () => setEscuchandoVoz(false);

    recognition.onend = () => {
      setEscuchandoVoz(false);
      if (textoFinalCapturado.trim()) {
        enviarPregunta(textoFinalCapturado.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarPregunta(input);
    }
  };

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto.replace(/\*\*/g, ""));
  };

  const insertarFechasEnInput = () => {
    const rango = `del ${fechaEntrada} al ${fechaSalida}`;
    setInput((prev) =>
      prev.trim()
        ? `${prev.trim()} (${rango})`
        : `Quiero consultar disponibilidad para reservar ${rango}`
    );
    setFechasMovilAbiertas(false);
    textareaRef.current?.focus();
    mobileTextareaRef.current?.focus();
  };

  const soloBienvenida = activeConversation.messages.every((m) => m.role !== "user");

  const sugerencias = [
    "¿Qué hoteles tienen?",
    `Disponibilidad del ${fechaEntrada} al ${fechaSalida}`,
    "Quiero cancelar o modificar mi reserva",
  ];

  return (
    <div className="container-fluid px-0 py-0">
      {/* =========================================================================
          1. VISTA EXCLUSIVA PARA CELULARES (< 768px) — DISEÑO TIPO WHATSAPP/APP
         ========================================================================= */}
      <div className="d-md-none">
        <div
          className="rounded-4 shadow-sm d-flex flex-column overflow-hidden"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            height: "calc(100dvh - 165px)",
            minHeight: "480px",
          }}
        >
          {/* CABECERA MÓVIL ULTRA COMPACTA */}
          <div
            className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
            style={{ backgroundColor: "#18181b", color: "#ffffff", flexShrink: 0 }}
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  color: "#fbbf24",
                }}
              >
                <i className="bi bi-stars"></i>
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: "0.88rem", lineHeight: 1.1 }}>
                  Asistente IA
                </div>
                <small style={{ fontSize: "0.68rem", color: "#a1a1aa" }}>
                  ● {modelo === "gemini" ? "Gemini" : "Llama 3.2"}
                </small>
              </div>
            </div>

            {/* Acciones Rápidas Móvil */}
            <div className="d-flex align-items-center gap-1">
              <select
                value={modelo}
                onChange={(e) => setModelo(e.target.value as "gemini" | "llama3.2:3b")}
                className="form-select form-select-sm border-0 fw-semibold"
                style={{
                  width: "auto",
                  fontSize: "0.74rem",
                  backgroundColor: "#27272a",
                  color: "#fbbf24",
                  paddingRight: "1.6rem",
                }}
                aria-label="Seleccionar modelo"
              >
                <option value="gemini">☁️ Gemini</option>
                <option value="llama3.2:3b">💻 Llama 3.2</option>
              </select>

              <button
                type="button"
                onClick={() => setFechasMovilAbiertas((v) => !v)}
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: fechasMovilAbiertas ? "#f59e0b" : "#27272a",
                  color: fechasMovilAbiertas ? "#18181b" : "#ffffff",
                  borderRadius: "8px",
                }}
                title="Fechas"
              >
                <i className="bi bi-calendar-event"></i>
              </button>

              <button
                type="button"
                onClick={() => setHistorialMovilAbierto(true)}
                className="btn btn-sm d-flex align-items-center justify-content-center position-relative"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "#27272a",
                  color: "#ffffff",
                  borderRadius: "8px",
                }}
                title="Mis consultas"
              >
                <i className="bi bi-clock-history"></i>
              </button>

              <button
                type="button"
                onClick={handleNuevaConversacion}
                className="btn btn-sm d-flex align-items-center justify-content-center"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "#f59e0b",
                  color: "#18181b",
                  borderRadius: "8px",
                }}
                title="Nueva consulta"
              >
                <i className="bi bi-plus-lg fw-bold"></i>
              </button>
            </div>
          </div>

          {/* PANEL COLAPSABLE DE FECHAS EN MÓVIL */}
          {fechasMovilAbiertas && (
            <div
              className="p-2 border-bottom"
              style={{ backgroundColor: "#fffbeb", flexShrink: 0 }}
            >
              <div className="row g-2 align-items-end">
                <div className="col-6">
                  <label className="small fw-semibold text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Entrada
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    min={hoyIso}
                    value={fechaEntrada}
                    onChange={(e) => manejarCambioEntrada(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="small fw-semibold text-muted d-block" style={{ fontSize: "0.7rem" }}>
                    Salida
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    min={obtenerFechaLocalIso(1, fechaEntrada)}
                    value={fechaSalida}
                    onChange={(e) => manejarCambioSalida(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <button
                    type="button"
                    onClick={insertarFechasEnInput}
                    className="btn btn-sm w-100 fw-semibold"
                    style={{ backgroundColor: "#f59e0b", color: "#18181b", fontSize: "0.78rem" }}
                  >
                    <i className="bi bi-check2-circle me-1"></i>
                    Insertar fechas en mi pregunta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LISTA DE MENSAJES MÓVIL */}
          <div
            ref={mobileChatContainerRef}
            className="flex-grow-1 overflow-y-auto p-2 d-flex flex-column gap-2"
            style={{ backgroundColor: "#f8fafc" }}
          >
            {activeConversation.messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="d-flex justify-content-end">
                    <div
                      className="rounded-4 px-3 py-2 text-white shadow-sm"
                      style={{
                        maxWidth: "85%",
                        backgroundColor: "#18181b",
                        fontSize: "0.9rem",
                        lineHeight: "1.45",
                        borderBottomRightRadius: "4px",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              }

              if (msg.error) {
                return (
                  <div key={msg.id} className="d-flex justify-content-start">
                    <div
                      className="rounded-4 p-3 border shadow-sm w-100"
                      style={{
                        backgroundColor: "#fef2f2",
                        borderColor: "#fecaca",
                        fontSize: "0.86rem",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2 text-danger fw-bold mb-1">
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <span>No se pudo conectar al servidor</span>
                      </div>
                      {msg.originalQuestion && (
                        <button
                          type="button"
                          onClick={() => enviarPregunta(msg.originalQuestion!)}
                          className="btn btn-sm btn-outline-danger rounded-pill px-3 mt-1"
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Reintentar
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="d-flex justify-content-start">
                  <div
                    className="rounded-4 p-3 shadow-sm"
                    style={{
                      width: "94%",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e4e4e7",
                      fontSize: "0.9rem",
                      borderTopLeftRadius: "4px",
                    }}
                  >
                    <div className="text-dark">{renderizarTextoFormateado(msg.text)}</div>
                    {esGerente && msg.chartType && renderizarGraficaGerente(msg.chartType)}
                    <div className="d-flex align-items-center justify-content-between pt-2 mt-2 border-top">
                      <span className="d-flex align-items-center gap-2">
                        <span
                          className="badge bg-success-subtle text-success rounded-pill"
                          style={{ fontSize: "0.68rem" }}
                        >
                          ● {msg.model || modelo}
                        </span>
                        {msg.tiempoMs !== undefined && (
                          <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                            {(msg.tiempoMs / 1000).toFixed(1)}s
                          </small>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => copiarTexto(msg.text)}
                        className="btn btn-sm p-0 text-muted border-0"
                        title="Copiar respuesta"
                      >
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="d-flex justify-content-start">
                <div
                  className="rounded-4 px-3 py-2 shadow-sm d-inline-flex align-items-center gap-2"
                  style={{ backgroundColor: "#ffffff", border: "1px solid #e4e4e7", fontSize: "0.85rem" }}
                >
                  <div className="spinner-border spinner-border-sm text-warning" role="status" />
                  <span className="text-muted">Escribiendo respuesta...</span>
                </div>
              </div>
            )}
          </div>

          {/* SUGERENCIAS MÓVIL */}
          {soloBienvenida && !loading && (
            <div
              className="d-flex gap-2 px-2 py-2 overflow-x-auto border-top"
              style={{ backgroundColor: "#ffffff", flexShrink: 0, whiteSpace: "nowrap" }}
            >
              {sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviarPregunta(s)}
                  className="btn btn-sm rounded-pill px-3 py-1 flex-shrink-0"
                  style={{
                    backgroundColor: "#f4f4f5",
                    border: "1px solid #e4e4e7",
                    fontSize: "0.76rem",
                    color: "#27272a",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* AVISO MICRÓFONO MÓVIL */}
          {escuchandoVoz && (
            <div
              className="px-3 py-1 d-flex align-items-center justify-content-between"
              style={{ backgroundColor: "#fef3c7", color: "#92400e", fontSize: "0.78rem", flexShrink: 0 }}
            >
              <span>
                <i className="bi bi-mic-fill me-1 text-danger"></i>
                <strong>Escuchando...</strong>
              </span>
              <button
                type="button"
                onClick={alternarDictadoPorVoz}
                className="btn btn-sm btn-danger py-0 px-2 rounded-pill"
                style={{ fontSize: "0.72rem" }}
              >
                Detener
              </button>
            </div>
          )}

          {/* CAJA DE TEXTO MÓVIL */}
          <div
            className="p-2 border-top d-flex align-items-end gap-2"
            style={{ backgroundColor: "#ffffff", flexShrink: 0 }}
          >
            <button
              type="button"
              disabled={loading}
              onClick={alternarDictadoPorVoz}
              className="btn d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: escuchandoVoz ? "#fee2e2" : "#f4f4f5",
                color: escuchandoVoz ? "#dc2626" : "#3f3f46",
              }}
              aria-label="Dictar por voz"
            >
              <i className={`bi ${escuchandoVoz ? "bi-mic-mute-fill" : "bi-mic-fill"}`}></i>
            </button>

            <textarea
              ref={mobileTextareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                esRecepcionista
                  ? "Ej: Realizar check-in del folio R20010..."
                  : "Escribe tu mensaje o folio..."
              }
              className="form-control border-0 shadow-none"
              style={{
                backgroundColor: "#f4f4f5",
                borderRadius: "18px",
                fontSize: "0.9rem",
                padding: "8px 14px",
                resize: "none",
                maxHeight: "100px",
              }}
            />

            <button
              type="button"
              disabled={loading || !input.trim()}
              onClick={() => enviarPregunta(input)}
              className="btn d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: !input.trim() || loading ? "#e4e4e7" : "#f59e0b",
                color: "#18181b",
              }}
              aria-label="Enviar"
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </div>
        </div>

        {/* DRAWER HISTORIAL MÓVIL */}
        {historialMovilAbierto && (
          <div
            className="modal-backdrop-custom d-flex align-items-end justify-content-center"
            onClick={() => setHistorialMovilAbierto(false)}
          >
            <div
              className="w-100 rounded-top-4 p-3 shadow-lg"
              style={{
                backgroundColor: "#ffffff",
                maxHeight: "75dvh",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
                <div className="fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-warning"></i>
                  <span>Mis Consultas ({conversations.length})</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNuevaConversacion}
                    className="btn btn-sm fw-semibold rounded-pill px-3"
                    style={{ backgroundColor: "#f59e0b", color: "#18181b", fontSize: "0.78rem" }}
                  >
                    + Nueva
                  </button>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setHistorialMovilAbierto(false)}
                  ></button>
                </div>
              </div>

              <div className="overflow-y-auto d-flex flex-column gap-2 py-1">
                {conversations.map((conv, index) => {
                  const esActiva = conv.id === activeConversation.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setHistorialMovilAbierto(false);
                      }}
                      className="p-2 rounded-3 d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: esActiva ? "#fffbeb" : "#f8fafc",
                        border: esActiva ? "1px solid #f59e0b" : "1px solid #e4e4e7",
                        cursor: "pointer",
                      }}
                    >
                      <div className="text-truncate me-2">
                        <div className="fw-semibold small text-dark text-truncate">
                          {conv.title}
                        </div>
                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                          Consulta #{conversations.length - index} · {conv.updatedAt}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => solicitarEliminarConversacion(conv, e)}
                        className="btn btn-sm text-danger border-0"
                      >
                        <i className="bi bi-trash3"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. VISTA DE TABLET Y ESCRITORIO (>= 768px) — DISEÑO ORIGINAL INTACTO
         ========================================================================= */}
      <div className="d-none d-md-block">
        <div className="row g-4">
          {/* PANEL LATERAL (.ia-sidebar) */}
          <div className="col-lg-4 col-xl-3">
            <aside className="ia-sidebar">
              {/* Selector de Motor */}
              <div className="luxury-card ia-engine-card">
                <div className="ia-engine-top">
                  <span className="ia-engine-label">
                    <i className="bi bi-cpu"></i>
                    Motor de IA
                  </span>
                  <span className="badge-soft badge-emerald">
                    <span className="dot"></span> Activo
                  </span>
                </div>
                <div className="ia-segment">
                  <button
                    type="button"
                    className={`ia-segment-btn ${modelo === "gemini" ? "active" : ""}`}
                    onClick={() => setModelo("gemini")}
                  >
                    <i className="bi bi-cloud"></i> Gemini
                  </button>
                  <button
                    type="button"
                    className={`ia-segment-btn ${modelo === "llama3.2:3b" ? "active" : ""}`}
                    onClick={() => setModelo("llama3.2:3b")}
                  >
                    <i className="bi bi-pc-display"></i> Llama 3.2
                  </button>
                </div>
              </div>

              {/* PANEL DE CONSULTAS RÁPIDAS EXCLUSIVO PARA EL GERENTE */}
              {esGerente && (
                <div className="luxury-card p-3 mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                    <div className="fw-semibold small text-dark d-flex align-items-center gap-2">
                      <i className="bi bi-bar-chart-line-fill text-warning"></i>
                      <span>Consultas Rápidas (Gráficas)</span>
                    </div>
                    <span className="badge-soft badge-amber" style={{ fontSize: "0.68rem" }}>
                      Gerencia
                    </span>
                  </div>
                  <div className="d-flex flex-column gap-1">
                    {CONSULTAS_RAPIDAS_GERENTE.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={loading}
                        onClick={() => enviarPregunta(item.pregunta, item.id)}
                        className="btn btn-sm btn-light text-start border rounded-3 py-2 px-2 d-flex align-items-center gap-2"
                      >
                        <i className={`bi ${item.icono} text-warning`}></i>
                        <span className="small fw-medium text-dark text-truncate">{item.titulo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de Consultas */}
              <div className="luxury-card p-3 d-flex flex-column gap-2" style={{ maxHeight: "calc(100dvh - 360px)" }}>
                <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
                  <div style={{ minWidth: 0 }}>
                    <div className="ia-engine-label">
                      <i className="bi bi-clock-history"></i>
                      <span>Mis Consultas</span>
                    </div>
                    <small className="text-muted d-block text-truncate" style={{ fontSize: "0.72rem" }}>
                      {sesion?.nombre || "Tu sesión"}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-luxury-primary py-1 px-2"
                    style={{ fontSize: "0.78rem" }}
                    onClick={handleNuevaConversacion}
                  >
                    <i className="bi bi-plus-lg"></i> Nueva
                  </button>
                </div>

                <div className="overflow-y-auto d-flex flex-column gap-2 pe-1">
                  {conversations.map((conv, index) => {
                    const esActiva = conv.id === activeConversation.id;
                    return (
                      <div
                        key={`${conv.id}-${index}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveConvId(conv.id)}
                        className="p-2 rounded-3 d-flex align-items-center justify-content-between"
                        style={{
                          backgroundColor: esActiva ? "#fffbeb" : "#fafaf9",
                          border: esActiva ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                          cursor: "pointer",
                        }}
                      >
                        <div className="text-truncate me-2">
                          <div className="fw-semibold small text-dark text-truncate">{conv.title}</div>
                          <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                            Consulta #{conversations.length - index} · {conv.updatedAt}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="action-icon-btn delete"
                          onClick={(e) => solicitarEliminarConversacion(conv, e)}
                          title="Eliminar conversación"
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>

          {/* CONSOLA DE CHAT (.ia-console) */}
          <div className="col-lg-8 col-xl-9">
            <section className="luxury-card ia-console">
              <div className="luxury-card-header py-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="ia-avatar">
                    <i className="bi bi-stars"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0">Asistente de IA</h6>
                    <small className="text-muted">
                      {modelo === "gemini" ? "Google Gemini" : "Ollama Llama 3.2:3b"}
                    </small>
                  </div>
                </div>

                {!esGerente && (
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className={`btn-luxury-outline py-1 px-3 ${fechasAbiertas ? "bg-warning-subtle border-warning" : ""}`}
                      onClick={() => setFechasAbiertas((v) => !v)}
                    >
                      <i className="bi bi-calendar-check me-2 text-warning"></i>
                      Fechas de estancia
                    </button>
                  </div>
                )}
              </div>

              {!esGerente && fechasAbiertas && (
                <div className="px-4 py-2 bg-warning-subtle border-bottom d-flex align-items-end gap-3 flex-wrap">
                  <div>
                    <label htmlFor="ia2-entrada" className="small fw-semibold d-block">Entrada</label>
                    <input
                      id="ia2-entrada"
                      type="date"
                      className="form-control form-control-sm"
                      min={hoyIso}
                      value={fechaEntrada}
                      onChange={(e) => manejarCambioEntrada(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="ia2-salida" className="small fw-semibold d-block">Salida</label>
                    <input
                      id="ia2-salida"
                      type="date"
                      className="form-control form-control-sm"
                      min={obtenerFechaLocalIso(1, fechaEntrada)}
                      value={fechaSalida}
                      onChange={(e) => manejarCambioSalida(e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn-luxury-primary py-1 px-3" onClick={insertarFechasEnInput}>
                    Usar fechas en consulta
                  </button>
                </div>
              )}

              {/* Hilo de mensajes (.ia-thread) */}
              <div ref={chatContainerRef} className="ia-thread">
                {activeConversation.messages.map((msg) => {
                  if (msg.role === "user") {
                    return (
                      <div key={msg.id} className="ia-turn">
                        <div className="ia-bubble-user">{msg.text}</div>
                      </div>
                    );
                  }

                  if (msg.error) {
                    return (
                      <div key={msg.id} className="ia-turn">
                        <div className="ia-error justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <div>
                              <div className="fw-bold">No se pudo obtener la respuesta.</div>
                              <div className="small">Error al conectar al servidor.</div>
                            </div>
                          </div>
                          {msg.originalQuestion && (
                            <button
                              type="button"
                              className="btn-luxury-outline py-1 px-3"
                              onClick={() => enviarPregunta(msg.originalQuestion!)}
                            >
                              Reintentar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="ia-turn">
                      <div className="ia-bubble-ai" style={{ width: msg.chartType ? "100%" : "auto" }}>
                        <div className="ia-markdown">{renderizarTextoFormateado(msg.text)}</div>
                        {esGerente && msg.chartType && renderizarGraficaGerente(msg.chartType)}
                        <div className="ia-meta justify-content-between">
                          <span className="d-flex align-items-center gap-2">
                            <span className="badge-soft badge-emerald">
                              <span className="dot"></span>
                              {msg.model || modelo}
                            </span>
                            {msg.tiempoMs !== undefined && (
                              <span className="ia-timer">
                                <i className="bi bi-stopwatch me-1"></i>
                                {(msg.tiempoMs / 1000).toFixed(2)}s
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className="action-icon-btn"
                            onClick={() => copiarTexto(msg.text)}
                            title="Copiar"
                          >
                            <i className="bi bi-clipboard"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="ia-loading">
                    <div className="ia-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="small text-muted">Procesando respuesta...</span>
                  </div>
                )}
              </div>

              {/* Sugerencias rápidas */}
              {soloBienvenida && !loading && (
                <div className="px-4 py-2 bg-white border-top d-flex gap-2 flex-wrap">
                  {sugerencias.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn-luxury-outline py-1 px-3 rounded-pill"
                      style={{ fontSize: "0.8rem" }}
                      onClick={() => enviarPregunta(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Compositor (.ia-composer) */}
              <div className="ia-composer">
                <button
                  type="button"
                  disabled={loading}
                  onClick={alternarDictadoPorVoz}
                  className="btn-luxury-outline px-3"
                  style={{ height: "44px" }}
                  title="Dictar por voz"
                >
                  <i className={`bi ${escuchandoVoz ? "bi-mic-mute-fill text-danger" : "bi-mic-fill"}`}></i>
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="input-luxury"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    esRecepcionista
                      ? "Ej: Realizar check-in del folio R20010..."
                      : "Escribe tu pregunta..."
                  }
                />

                <button
                  type="button"
                  disabled={loading || !input.trim()}
                  onClick={() => enviarPregunta(input)}
                  className="btn-luxury-primary"
                >
                  <i className="bi bi-send-fill"></i>
                  <span>Preguntar</span>
                </button>
              </div>
              <div className="ia-hint">
                Enter para enviar · Shift+Enter para salto de línea · <i className="bi bi-mic-fill"></i> para dictar
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* MODAL COMPARTIDO: ELIMINAR CHAT */}
      {chatAEliminar && (
        <div className="modal-backdrop-custom" onClick={() => setChatAEliminar(null)}>
          <div
            className="modal-window"
            style={{ maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-window-body text-center p-4">
              <div className="mb-3 text-danger fs-1">
                <i className="bi bi-exclamation-circle"></i>
              </div>
              <h5 className="fw-bold mb-2">¿Eliminar conversación?</h5>
              <p className="text-muted small mb-0">
                Se dará de baja del historial la consulta{" "}
                <strong className="text-dark">"{chatAEliminar.title}"</strong>.
              </p>
            </div>
            <div className="modal-window-footer justify-content-center">
              <button
                type="button"
                onClick={() => setChatAEliminar(null)}
                className="btn-luxury-outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarConversacion}
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

export default AsistenteIaView;