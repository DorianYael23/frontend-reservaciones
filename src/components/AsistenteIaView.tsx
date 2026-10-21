import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preguntarAsistenteIA } from '../services/api';

/* ------------------------------------------------------------------ */
/*  Datos de apoyo                                                     */
/* ------------------------------------------------------------------ */
const PREGUNTAS_SUGERIDAS = [
    { icono: 'bi-building', texto: '¿Qué hoteles tiene registrada la cadena y en qué ciudad están?' },
    { icono: 'bi-tags', texto: '¿Qué tipos de habitación ofrecen y cuál es su precio base y capacidad?' },
    { icono: 'bi-door-open', texto: '¿Cuáles son las habitaciones que están disponibles actualmente?' },
    { icono: 'bi-123', texto: '¿Cuántas habitaciones disponibles en total tiene cada hotel?' },
    { icono: 'bi-table', texto: 'Muéstrame todas las habitaciones de cada hotel con su estado actual y tipo.' },
];

const MOTORES = [
    { valor: 'gemini', nombre: 'Google Gemini', corto: 'Gemini', etiqueta: 'Nube', detalle: 'Rápido y preciso. Requiere internet.', icono: 'bi-cloud-check' },
    { valor: 'llama3.2:3b', nombre: 'Ollama Llama 3.2:3b', corto: 'Llama 3.2', etiqueta: 'Local', detalle: 'Modelo ligero local, ideal para pruebas.', icono: 'bi-pc-display' },
];

type Mensaje = {
    id: number;
    pregunta: string;
    modelo: string;
    estado: 'cargando' | 'ok' | 'error';
    respuesta?: string;
    modeloUsado?: string;
    tiempoMs?: number;
};

/* ------------------------------------------------------------------ */
/*  Cronómetro en vivo mientras la IA responde                         */
/* ------------------------------------------------------------------ */
function Cronometro() {
    const [seg, setSeg] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setSeg((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, []);
    return <span className="ia-timer">{seg}s</span>;
}

/* ------------------------------------------------------------------ */
/*  Botón copiar                                                       */
/* ------------------------------------------------------------------ */
function BotonCopiar({ texto }: { texto: string }) {
    const [ok, setOk] = useState(false);
    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(texto);
            setOk(true);
            setTimeout(() => setOk(false), 1600);
        } catch {
            /* sin permisos de portapapeles */
        }
    };
    return (
        <button type="button" className="action-icon-btn" onClick={copiar} title="Copiar respuesta">
            <i className={`bi ${ok ? 'bi-check2 text-success' : 'bi-clipboard'}`}></i>
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Vista principal                                                    */
/* ------------------------------------------------------------------ */
export default function AsistenteIaView() {
    const [pregunta, setPregunta] = useState('');
    const [modelo, setModelo] = useState('gemini');
    const [mensajes, setMensajes] = useState<Mensaje[]>([]);
    const hiloRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(0);

    const cargando = mensajes.some((m) => m.estado === 'cargando');
    const motorActual = MOTORES.find((m) => m.valor === modelo) ?? MOTORES[0];

    // Desplaza el hilo al último mensaje
    useEffect(() => {
        const el = hiloRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [mensajes]);

    const enviarPregunta = async (texto: string) => {
        const limpio = texto.trim();
        if (!limpio || cargando) return;

        const id = ++idRef.current;
        setMensajes((prev) => [...prev, { id, pregunta: limpio, modelo, estado: 'cargando' }]);
        setPregunta('');

        try {
            const data = await preguntarAsistenteIA(limpio, modelo);
            setMensajes((prev) =>
                prev.map((m) =>
                    m.id === id
                        ? { ...m, estado: 'ok', respuesta: data.respuesta, modeloUsado: data.modeloUsado, tiempoMs: data.tiempoMs }
                        : m
                )
            );
        } catch {
            setMensajes((prev) => prev.map((m) => (m.id === id ? { ...m, estado: 'error' } : m)));
        }
    };

    const manejarSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        enviarPregunta(pregunta);
    };

    // Enter envía, Shift+Enter hace salto de línea
    const manejarTecla = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarPregunta(pregunta);
        }
    };

    return (
        <div className="row g-4 ia-layout">
            {/* ======================= Columna izquierda ======================= */}
            <div className="col-lg-4">
                <div className="ia-sidebar">
                    {/* Selector de motor */}
                    <div className="luxury-card ia-engine-card">
                        <div className="ia-engine-top">
                            <span className="ia-engine-label">
                                <i className="bi bi-cpu"></i> Motor de IA
                            </span>
                        </div>
                        <div className="ia-segment" role="tablist">
                            {MOTORES.map((m) => (
                                <button
                                    key={m.valor}
                                    type="button"
                                    role="tab"
                                    aria-selected={modelo === m.valor}
                                    className={`ia-segment-btn ${modelo === m.valor ? 'active' : ''}`}
                                    onClick={() => setModelo(m.valor)}
                                    disabled={cargando}
                                    title={m.nombre}
                                >
                                    <i className={`bi ${m.icono}`}></i>
                                    {m.corto}
                                </button>
                            ))}
                        </div>
                        <p className="ia-engine-note">
                            <span className={`badge-soft ${motorActual.etiqueta === 'Nube' ? 'badge-emerald' : 'badge-amber'}`}>
                                {motorActual.etiqueta}
                            </span>
                            {motorActual.detalle}
                        </p>
                    </div>

                    {/* Preguntas sugeridas */}
                    <div className="luxury-card">
                        <div className="luxury-card-header bg-white">
                            <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-lightbulb text-warning fs-5"></i>
                                <h5 className="mb-0 fw-bold fs-6">Consultas de la Práctica</h5>
                            </div>
                        </div>
                        <div className="p-3 d-grid gap-2">
                            {PREGUNTAS_SUGERIDAS.map((q, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className="ia-suggestion"
                                    onClick={() => enviarPregunta(q.texto)}
                                    disabled={cargando}
                                >
                                    <i className={`bi ${q.icono}`}></i>
                                    <span>{q.texto}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================= Columna derecha ======================= */}
            <div className="col-lg-8">
                <div className="luxury-card ia-console">
                    <div className="luxury-card-header bg-white">
                        <div className="d-flex align-items-center gap-3">
                            <div className="ia-avatar">
                                <i className="bi bi-stars"></i>
                            </div>
                            <div>
                                <h5 className="mb-0 fw-bold fs-6">Asistente Inteligente Ejecutivo</h5>
                                <span className="small text-muted">
                                    <span className="exec-dot d-inline-block me-1 align-middle" style={{ width: 6, height: 6 }}></span>
                                    En linea · {motorActual.nombre}
                                </span>
                            </div>
                        </div>
                        {mensajes.length > 0 && (
                            <button
                                type="button"
                                className="btn-luxury-outline"
                                onClick={() => setMensajes([])}
                                disabled={cargando}
                            >
                                <i className="bi bi-trash3 me-1"></i> Limpiar
                            </button>
                        )}
                    </div>

                    {/* Hilo de conversación */}
                    <div className="ia-thread" ref={hiloRef}>
                        {mensajes.length === 0 && (
                            <div className="ia-empty">
                                <div className="ia-empty-icon">
                                    <i className="bi bi-chat-square-text"></i>
                                </div>
                                <h6 className="fw-bold mb-1">¿En qué puedo ayudarle hoy?</h6>
                                <p className="text-muted small mb-0">
                                    Pregunte en lenguaje natural sobre hoteles, tipos de habitación y disponibilidad.
                                    <br />
                                    También puede elegir una consulta del panel izquierdo.
                                </p>
                            </div>
                        )}

                        {mensajes.map((m) => (
                            <div key={m.id} className="ia-turn">
                                {/* Pregunta del usuario */}
                                <div className="ia-bubble-user">{m.pregunta}</div>

                                {/* Respuesta */}
                                <div className="ia-bubble-ai">
                                    {m.estado === 'cargando' && (
                                        <div className="ia-loading">
                                            <div className="ia-dots">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                            <span className="small text-muted">
                                                Consultando los datos  <em>{m.modelo}</em>… <Cronometro />
                                            </span>
                                        </div>
                                    )}

                                    {m.estado === 'error' && (
                                        <div className="ia-error">
                                            <i className="bi bi-exclamation-triangle-fill"></i>
                                            <div>
                                                <strong>No se pudo obtener la respuesta.</strong>
                                                <div className="small">
                                                    Error al conectar al servidor.
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-luxury-outline ms-auto"
                                                onClick={() => enviarPregunta(m.pregunta)}
                                                disabled={cargando}
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    )}

                                    {m.estado === 'ok' && m.respuesta && (
                                        <>
                                            <div className="ia-markdown">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.respuesta}</ReactMarkdown>
                                            </div>
                                            <div className="ia-meta">
                                                <span className="badge-soft badge-emerald">
                                                    <span className="dot"></span> {m.modeloUsado}
                                                </span>
                                                <span className="text-muted small">
                                                    <i className="bi bi-stopwatch me-1"></i>
                                                    {((m.tiempoMs ?? 0) / 1000).toFixed(2)}s
                                                </span>
                                                <span className="ms-auto">
                                                    <BotonCopiar texto={m.respuesta} />
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Compositor */}
                    <form onSubmit={manejarSubmit} className="ia-composer">
                        <textarea
                            className="input-luxury"
                            rows={1}
                            placeholder="Ej. ¿Qué habitaciones están disponibles en el Hotel Paraíso?"
                            value={pregunta}
                            onChange={(e) => setPregunta(e.target.value)}
                            onKeyDown={manejarTecla}
                            disabled={cargando}
                        />
                        <button className="btn-luxury-primary" type="submit" disabled={cargando || !pregunta.trim()}>
                            {cargando ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                                <i className="bi bi-send-fill"></i>
                            )}
                            <span className="d-none d-sm-inline">{cargando ? 'Consultando…' : 'Preguntar'}</span>
                        </button>
                    </form>
                    <div className="ia-hint">Enter para enviar · Shift + Enter para salto de línea</div>
                </div>
            </div>
        </div>
    );
}