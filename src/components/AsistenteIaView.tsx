import React, { useState, useEffect, useRef } from "react";
import { type SesionUsuario } from "./LoginView";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  model?: string;
  tiempoMs?: number;
  error?: boolean;
  originalQuestion?: string;
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

const STORAGE_MODEL_KEY = "paraiso_ai_selected_model_v4";
const hostActual = typeof window !== "undefined" ? window.location.hostname : "localhost";
const API_ROOT = (import.meta as any).env?.VITE_API_URL || `http://${hostActual}:8082/api`;
const API_BASE_URL = `${API_ROOT}/hotel-ai`;

const obtenerFechaLocalIso = (diasSumar = 0, fechaBase?: string): string => {
  const base = fechaBase ? new Date(fechaBase + "T00:00:00") : new Date();
  base.setDate(base.getDate() + diasSumar);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatearNegritasEnLinea = (linea: string): React.ReactNode[] => {
  const partes = linea.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
      return (
        <strong key={i} className="fw-bold text-dark">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    if (parte.startsWith("*") && parte.endsWith("*") && parte.length > 2) {
      return (
        <strong key={i} className="fw-semibold text-dark">
          {parte.slice(1, -1)}
        </strong>
      );
    }
    return <span key={i}>{parte.replace(/\*/g, "")}</span>;
  });
};

const renderizarTextoFormateado = (texto: string): React.ReactNode => {
  if (!texto) return null;
  const lineas = texto.split(/\r?\n/);

  return (
    <div className="d-flex flex-column gap-1">
      {lineas.map((lineaOriginal, idx) => {
        const linea = lineaOriginal.trim();

        if (!linea) {
          return <div key={idx} style={{ height: "6px" }} />;
        }

        const matchImagenMd = linea.match(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/);
        if (matchImagenMd) {
          const tituloImg = matchImagenMd[1] || "Vista previa de la habitación";
          const urlImg = matchImagenMd[2];
          return (
            <div key={idx} className="my-2">
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
        }

        const matchBullet = linea.match(/^([*\-•])\s+(.*)$/);
        if (matchBullet) {
          return (
            <div key={idx} className="d-flex align-items-start gap-2 ps-1 py-1">
              <span
                className="rounded-circle bg-warning mt-2 flex-shrink-0"
                style={{ width: "6px", height: "6px" }}
              />
              <div style={{ lineHeight: "1.5" }}>{formatearNegritasEnLinea(matchBullet[2])}</div>
            </div>
          );
        }

        const matchNumero = linea.match(/^(\d+\.)\s+(.*)$/);
        if (matchNumero) {
          return (
            <div key={idx} className="d-flex align-items-start gap-2 ps-1 py-1">
              <strong className="text-dark flex-shrink-0">{matchNumero[1]}</strong>
              <div style={{ lineHeight: "1.5" }}>{formatearNegritasEnLinea(matchNumero[2])}</div>
            </div>
          );
        }

        return (
          <div key={idx} style={{ lineHeight: "1.55" }}>
            {formatearNegritasEnLinea(linea)}
          </div>
        );
      })}
    </div>
  );
};

const generarNuevoIdSesion = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const crearSesionInicial = (nombreUsuario?: string, idSesion?: string): ConversationSession => {
  const saludoPersonalizado = nombreUsuario
    ? `¡Hola, **${nombreUsuario}**! Consulta disponibilidad, reserva habitaciones o gestiona tu estancia con tu código de folio. ¿En qué te ayudo?`
    : "¡Hola! Consulta disponibilidad, reserva o gestiona tu estancia con tu folio. ¿En qué te ayudo?";

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
  const [conversations, setConversations] = useState<ConversationSession[]>([
    crearSesionInicial(sesion?.nombre),
  ]);
  const [activeConvId, setActiveConvId] = useState<string>("");

  const [modelo, setModelo] = useState<"gemini" | "llama3.2:3b">(() => {
    const savedModel = localStorage.getItem(STORAGE_MODEL_KEY);
    return savedModel === "llama3.2:3b" ? "llama3.2:3b" : "gemini";
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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
            const reconstruidas: ConversationSession[] = data.map((row: any) => {
              const idLimpio = String(row.id_sesion || "").replace(/^u\d+_/, "");
              let msgs: ChatMessage[] = [];
              try {
                msgs = JSON.parse(row.mensajes_json || "[]");
              } catch {
                msgs = [];
              }
              return {
                id: idLimpio || generarNuevoIdSesion(),
                title: row.titulo || "Consulta",
                updatedAt: row.updated_at || "",
                messages: msgs.length > 0 ? msgs : crearSesionInicial(sesion?.nombre).messages,
              };
            });
            setConversations(reconstruidas);
            setActiveConvId(reconstruidas[0].id);
            return;
          }
        }
      } catch {
        // Ignorar
      }
      const inicial = crearSesionInicial(sesion?.nombre);
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

  // Auto-crecer los textareas
  useEffect(() => {
    [textareaRef.current, mobileTextareaRef.current].forEach((el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 110) + "px";
    });
  }, [input]);

  // Cerrar cajón con Escape
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
    const nueva = crearSesionInicial(sesion?.nombre, generarNuevoIdSesion());
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
      await fetch(`${API_BASE_URL}/history/${idEliminar}`, { method: "DELETE" });
    } catch {
      // Ignorar
    }

    const restantes = conversations.filter((c) => c.id !== idEliminar);
    if (restantes.length === 0) {
      const inicial = crearSesionInicial(sesion?.nombre, generarNuevoIdSesion());
      setConversations([inicial]);
      setActiveConvId(inicial.id);
      guardarSesionEnServidor(inicial);
    } else {
      setConversations(restantes);
      if (idEliminar === activeConversation.id) {
        setActiveConvId(restantes[0].id);
      }
    }
  };

  const enviarPregunta = async (textoPregunta: string) => {
    const preguntaLimpia = textoPregunta.trim();
    if (!preguntaLimpia || loading) return;

    const convId = activeConversation.id;
    const horaActual = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const base =
      conversationsRef.current.find((c) => c.id === convId) || activeConversation;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      text: preguntaLimpia,
    };

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
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pregunta: preguntaLimpia,
          question: preguntaLimpia,
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
      };

      const conversacionFinal: ConversationSession = {
        ...conversacionConPregunta,
        updatedAt: horaActual,
        messages: [...conversacionConPregunta.messages, assistantMsg],
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, updatedAt: horaActual, messages: [...c.messages, assistantMsg] } : c
        )
      );
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
              {/* Selector rápido de modelo */}
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

              {/* Botón Fechas */}
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

              {/* Botón Historial (Bottom Sheet) */}
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

              {/* Botón Nueva Conversación */}
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

          {/* LISTA DE MENSAJES MÓVIL (100% ANCHO ÚTIL) */}
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

          {/* SUGERENCIAS DESLIZABLES EN MÓVIL */}
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

          {/* AVISO DE MICRÓFONO EN MÓVIL */}
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

          {/* CAJA DE TEXTO FIJA ABAJO (COMPOSER MÓVIL) */}
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
              placeholder="Escribe tu mensaje o folio..."
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

        {/* DRAWER / HOJA INFERIOR PARA HISTORIAL EN CELULAR */}
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
          2. VISTA DE TABLET Y ESCRITORIO (>= 768px) — TU DISEÑO ORIGINAL INTACTO
         ========================================================================= */}

      <div className="d-none d-md-block">
        <div className="row g-4">
          {/* ===================== PANEL LATERAL (.ia-sidebar) ===================== */}
          <div className="col-lg-4 col-xl-3">
            <aside className="ia-sidebar">
              {/* Selector de Motor (.ia-engine-card) */}
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
                        key={conv.id}
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

          {/* ========================= CONSOLA DE CHAT (.ia-console) ========================= */}
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
              </div>

              {fechasAbiertas && (
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
                      <div className="ia-bubble-ai">
                        <div className="ia-markdown">{renderizarTextoFormateado(msg.text)}</div>
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
                  placeholder="Escribe tu pregunta..."
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