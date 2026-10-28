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
const API_BASE_URL = "http://localhost:8082/api/hotel-ai";

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
              <div
                className="card border rounded-4 overflow-hidden shadow-sm"
                style={{ maxWidth: "420px" }}
              >
                <img
                  src={urlImg}
                  alt={tituloImg}
                  className="img-fluid w-100"
                  style={{ height: "220px", objectFit: "cover" }}
                />
                <div className="p-2 bg-dark text-white small d-flex align-items-center justify-content-between px-3">
                  <span>
                    <i className="bi bi-camera-fill text-warning me-2"></i>
                    {tituloImg}
                  </span>
                  <a
                    href={urlImg}
                    target="_blank"
                    rel="noreferrer"
                    className="text-warning text-decoration-none small"
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
          const contenido = matchBullet[2];
          return (
            <div key={idx} className="d-flex align-items-start gap-2 ps-2 py-1">
              <span
                className="rounded-circle bg-warning mt-2 flex-shrink-0"
                style={{ width: "6px", height: "6px" }}
              />
              <div style={{ lineHeight: "1.5" }}>{formatearNegritasEnLinea(contenido)}</div>
            </div>
          );
        }

        const matchNumero = linea.match(/^(\d+\.)\s+(.*)$/);
        if (matchNumero) {
          return (
            <div key={idx} className="d-flex align-items-start gap-2 ps-2 py-1">
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
    ? `¡Hola, **${nombreUsuario}**! Soy tu **Asistente Inteligente Ejecutivo** del Grupo Hotelero Paraíso. Puedo ayudarte a consultar nuestros hoteles, ver **vistas previas en imagen** de las habitaciones, realizar tus reservaciones o modificar tu estancia con tu código de folio. ¿En qué te puedo ayudar hoy?`
    : "¡Hola! Soy el **Asistente Inteligente Ejecutivo** del Grupo Hotelero Paraíso. ¿En qué te puedo ayudar hoy?";

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

  // Estado para el modal de confirmación al eliminar un chat
  const [chatAEliminar, setChatAEliminar] = useState<ConversationSession | null>(null);

  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const recognitionRef = useRef<any>(null);

  const hoyIso = obtenerFechaLocalIso(0);
  const [fechaEntrada, setFechaEntrada] = useState<string>(hoyIso);
  const [fechaSalida, setFechaSalida] = useState<string>(obtenerFechaLocalIso(1, hoyIso));

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

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
  }, [sesion?.id_usuario, sesion?.token]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MODEL_KEY, modelo);
  }, [modelo]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversations, activeConvId, loading]);

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

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      text: preguntaLimpia,
    };

    let conversacionConPregunta: ConversationSession | null = null;

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== convId) return conv;
        const tieneMensajesUsuario = conv.messages.some((m) => m.role === "user");
        const nuevoTitulo = !tieneMensajesUsuario
          ? preguntaLimpia.slice(0, 34) + (preguntaLimpia.length > 34 ? "..." : "")
          : conv.title;

        conversacionConPregunta = {
          ...conv,
          title: nuevoTitulo,
          updatedAt: horaActual,
          messages: [...conv.messages, userMsg],
        };
        return conversacionConPregunta;
      })
    );

    if (conversacionConPregunta) {
      guardarSesionEnServidor(conversacionConPregunta);
    }

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

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== convId) return conv;
          const actualizada = {
            ...conv,
            updatedAt: horaActual,
            messages: [...conv.messages, assistantMsg],
          };
          guardarSesionEnServidor(actualizada);
          return actualizada;
        })
      );
    } catch {
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        text: "Error al conectar al servidor.",
        error: true,
        originalQuestion: preguntaLimpia,
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === convId ? { ...conv, messages: [...conv.messages, errorMsg] } : conv
        )
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

    recognition.onstart = () => {
      setEscuchandoVoz(true);
    };

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

    recognition.onerror = () => {
      setEscuchandoVoz(false);
    };

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
  };

  return (
    <div className="container-fluid py-3">
      <div className="row g-4">
        {/* COLUMNA IZQUIERDA */}
        <div
          className="col-12 col-lg-4 d-flex flex-column gap-3"
          style={{ height: "78vh", minHeight: "560px" }}
        >
          <div className="card border-0 shadow-sm rounded-4 p-3">
            <div className="d-flex align-items-center gap-2 mb-2 fw-semibold text-dark">
              <i className="bi bi-cpu text-warning"></i>
              <span>Motor de IA</span>
            </div>

            <div className="btn-group w-100 bg-light p-1 rounded-3 mb-2" role="group">
              <button
                type="button"
                onClick={() => setModelo("gemini")}
                className={`btn btn-sm rounded-2 fw-medium ${
                  modelo === "gemini" ? "bg-white shadow-sm text-dark" : "text-secondary border-0"
                }`}
              >
                <i className="bi bi-cloud me-1"></i> Gemini
              </button>
              <button
                type="button"
                onClick={() => setModelo("llama3.2:3b")}
                className={`btn btn-sm rounded-2 fw-medium ${
                  modelo === "llama3.2:3b"
                    ? "bg-white shadow-sm text-dark"
                    : "text-secondary border-0"
                }`}
              >
                <i className="bi bi-pc-display me-1"></i> Llama 3.2
              </button>
            </div>

            <div className="d-flex align-items-center gap-2 small text-muted">
              {modelo === "gemini" ? (
                <>
                  <span className="badge bg-success-subtle text-success rounded-pill">Nube</span>
                  <span>Rápido y preciso. Requiere internet.</span>
                </>
              ) : (
                <>
                  <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill">
                    Local
                  </span>
                  <span>Modelo ligero local, ideal para pruebas.</span>
                </>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-column flex-grow-1 overflow-hidden">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="d-flex align-items-center gap-2 fw-semibold text-dark">
                  <i className="bi bi-clock-history text-warning"></i>
                  <span>Mis Consultas</span>
                </div>
                <small className="text-muted" style={{ fontSize: "0.73rem" }}>
                  Sincronizado en la cuenta de {sesion?.nombre || "tu sesión"}
                </small>
              </div>
              <button
                type="button"
                onClick={handleNuevaConversacion}
                className="btn btn-sm btn-dark rounded-3 d-flex align-items-center gap-1"
                title="Iniciar nueva conversación"
              >
                <i className="bi bi-plus-lg"></i> Nueva
              </button>
            </div>

            <div className="d-flex flex-column gap-2 overflow-auto pe-1 flex-grow-1 mt-2">
              {conversations.map((conv, index) => {
                const esActiva = conv.id === activeConversation.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    style={{ cursor: "pointer" }}
                    className={`d-flex justify-content-between align-items-center p-2 rounded-3 border ${
                      esActiva
                        ? "bg-dark text-white border-dark"
                        : "bg-light text-dark border-light-subtle"
                    }`}
                  >
                    <div className="text-truncate me-2" style={{ maxWidth: "82%" }}>
                      <div className="small fw-medium text-truncate">
                        <i className="bi bi-chat-left-text me-2"></i>
                        {conv.title}
                      </div>
                      <div
                        style={{ fontSize: "0.72rem" }}
                        className={esActiva ? "text-white-50" : "text-muted"}
                      >
                        Consulta #{conversations.length - index} · {conv.updatedAt}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => solicitarEliminarConversacion(conv, e)}
                      className={`btn btn-sm border-0 p-1 ${
                        esActiva ? "text-white-50" : "text-secondary"
                      }`}
                      title="Eliminar conversación"
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ventana principal del Chat */}
        <div className="col-12 col-lg-8">
          <div
            className="card border-0 shadow-sm rounded-4 d-flex flex-column"
            style={{ height: "78vh", minHeight: "560px" }}
          >
            <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center rounded-top-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: "42px",
                    height: "42px",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  }}
                >
                  <i className="bi bi-stars fs-5"></i>
                </div>
                <div>
                  <h6 className="mb-0 fw-bold text-dark">
                    Asistente Ejecutivo · Hola, {sesion?.nombre || "Huésped"}
                  </h6>
                  <small className="text-success d-flex align-items-center gap-1">
                    <span
                      className="rounded-circle bg-success d-inline-block"
                      style={{ width: "8px", height: "8px" }}
                    ></span>
                    En línea · {modelo === "gemini" ? "Google Gemini" : "Ollama Llama 3.2:3b"}
                  </small>
                </div>
              </div>
            </div>

            <div className="bg-light border-bottom px-3 py-2 d-flex flex-wrap align-items-center justify-content-between gap-2 small">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="fw-medium text-secondary">
                  <i className="bi bi-calendar-check me-1"></i>Fechas de estancia:
                </span>
                <div className="d-flex align-items-center gap-1">
                  <span className="text-muted">Entrada:</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ width: "140px" }}
                    min={hoyIso}
                    value={fechaEntrada}
                    onChange={(e) => manejarCambioEntrada(e.target.value)}
                  />
                </div>
                <div className="d-flex align-items-center gap-1">
                  <span className="text-muted">Salida:</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ width: "140px" }}
                    min={obtenerFechaLocalIso(1, fechaEntrada)}
                    value={fechaSalida}
                    onChange={(e) => manejarCambioSalida(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={insertarFechasEnInput}
                className="btn btn-sm btn-outline-dark rounded-3"
              >
                Usar fechas en consulta
              </button>
            </div>

            <div
              ref={chatContainerRef}
              className="card-body overflow-auto p-4 d-flex flex-column gap-3"
              style={{ flex: 1, backgroundColor: "#fcfcfd" }}
            >
              {activeConversation.messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="d-flex justify-content-end">
                      <div
                        className="bg-dark text-white px-3 py-2 rounded-4 shadow-sm"
                        style={{ maxWidth: "75%", whiteSpace: "pre-wrap" }}
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
                        className="border border-danger-subtle bg-danger-subtle text-danger-emphasis p-3 rounded-4 d-flex align-items-center justify-content-between gap-3 w-100"
                        style={{ maxWidth: "85%" }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                          <div>
                            <div className="fw-bold small">No se pudo obtener la respuesta.</div>
                            <div className="small">Error al conectar al servidor.</div>
                          </div>
                        </div>
                        {msg.originalQuestion && (
                          <button
                            type="button"
                            onClick={() => enviarPregunta(msg.originalQuestion!)}
                            className="btn btn-sm bg-white border rounded-3 fw-medium"
                          >
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
                      className="bg-white border rounded-4 p-3 shadow-sm"
                      style={{ maxWidth: "85%" }}
                    >
                      <div className="text-dark mb-2">{renderizarTextoFormateado(msg.text)}</div>
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-success-subtle text-success rounded-pill">
                            ● {msg.model || modelo}
                          </span>
                          {msg.tiempoMs !== undefined && (
                            <small className="text-muted">
                              <i className="bi bi-stopwatch me-1"></i>
                              {(msg.tiempoMs / 1000).toFixed(2)}s
                            </small>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => copiarTexto(msg.text)}
                          className="btn btn-sm text-muted p-0 border-0"
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
                  <div className="bg-white border rounded-4 px-3 py-2 shadow-sm text-muted small d-flex align-items-center gap-2">
                    <div className="spinner-border spinner-border-sm text-warning" role="status" />
                    <span>Consultando información y procesando respuesta...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="card-footer bg-white border-top p-3 rounded-bottom-4">
              {escuchandoVoz && (
                <div className="mb-2 px-3 py-1 rounded-3 bg-danger-subtle text-danger small d-flex align-items-center justify-content-between">
                  <span>
                    <i className="bi bi-mic-fill me-2"></i>
                    <strong>Escuchando tu voz...</strong> Habla ahora y al terminar se enviará
                    automáticamente.
                  </span>
                  <button
                    type="button"
                    onClick={alternarDictadoPorVoz}
                    className="btn btn-sm btn-danger py-0 px-2 rounded-2"
                  >
                    Detener
                  </button>
                </div>
              )}

              <div className="d-flex gap-2 align-items-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={alternarDictadoPorVoz}
                  className={`btn rounded-3 px-3 py-2 d-flex align-items-center justify-content-center ${
                    escuchandoVoz ? "btn-danger" : "btn-outline-dark"
                  }`}
                  title={
                    escuchandoVoz
                      ? "Detener dictado por voz"
                      : "Presiona para hablar y enviar por voz"
                  }
                >
                  <i className={`bi ${escuchandoVoz ? "bi-mic-mute-fill" : "bi-mic-fill"}`}></i>
                </button>

                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe o presiona el micrófono para hablar con el asistente..."
                  className="form-control rounded-3"
                  style={{ resize: "none" }}
                />

                <button
                  type="button"
                  disabled={loading || !input.trim()}
                  onClick={() => enviarPregunta(input)}
                  className="btn btn-dark px-4 py-2 rounded-3 d-flex align-items-center gap-2 fw-medium"
                >
                  <i className="bi bi-send-fill"></i> Preguntar
                </button>
              </div>
              <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
                Enter para enviar · Presiona <i className="bi bi-mic-fill"></i> para dictar por voz
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR CHAT */}
      {chatAEliminar && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(2px)" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "400px" }}>
            <div className="modal-content border-0 rounded-4 shadow-lg p-4 text-center">
              <div className="mb-3">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "48px",
                    height: "48px",
                    border: "2px solid #dc2626",
                    color: "#dc2626",
                    fontSize: "1.4rem",
                    fontWeight: "bold",
                  }}
                >
                  !
                </span>
              </div>
              <h5 className="fw-bold text-dark mb-2">¿Eliminar conversación?</h5>
              <p className="text-muted small mb-4">
                Se dará de baja del historial la consulta{" "}
                <strong className="text-dark">"{chatAEliminar.title}"</strong>.
              </p>
              <div className="border-top pt-3 d-flex justify-content-center gap-2">
                <button
                  type="button"
                  onClick={() => setChatAEliminar(null)}
                  className="btn btn-light border rounded-3 px-4 py-2 fw-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminarConversacion}
                  className="btn btn-danger rounded-3 px-4 py-2 fw-semibold"
                  style={{ backgroundColor: "#dc2626" }}
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsistenteIaView;