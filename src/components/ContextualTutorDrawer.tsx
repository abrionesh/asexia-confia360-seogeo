import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import type { NavSection, ProjectWorkspace } from '../types';

interface ScreenGuide {
  title: string;
  purpose: string;
  steps: string[];
  quickQuestions: string[];
}

const SCREEN_GUIDES: Record<NavSection, ScreenGuide> = {
  dashboard: {
    title: 'Resumen Ejecutivo y ROI',
    purpose:
      'Muestra el retorno real de tu presencia local en llamadas, WhatsApp, leads por código postal, malla Geo-Grid y salud de ReputaciónLocal.',
    steps: [
      'Revisa los 4 KPIs superiores (Leads, Coste/Lead, Posición Geo-Grid y Cuota en IAs).',
      'Comprueba el bloque de ReputaciónLocal para ver tu completitud GBP e incidencias abiertas.',
      'Filtra la tabla inferior por código postal o exporta el informe CSV para dirección.',
    ],
    quickQuestions: [
      '¿Cómo interpretar mis leads y CPL este mes?',
      '¿Tengo pagos pendientes o incidencias abiertas?',
      '¿Qué módulos Confia360 tengo activos?',
    ],
  },
  client: {
    title: 'Ficha Única de Cliente Confia360',
    purpose:
      'Centraliza con prioridad máxima todos los datos fiscales, sedes, estado de cuenta, suscripciones en curso, fechas de pagos pendientes y configuración global.',
    steps: [
      'Consulta el Cuadro de Control Visual superior para ver de un vistazo estado contractual, MRR y pagos pendientes.',
      'Edita identificación, contactos o sedes y pulsa "Guardar y propagar ficha" para actualizar todo Confia360.',
      'En "Suscripciones y Pagos" controla fechas de vencimiento y marca facturas como pagadas en un clic.',
    ],
    quickQuestions: [
      '¿Cuál es mi próximo pago pendiente y su fecha?',
      '¿Qué pasa cuando actualizo la Ficha Única?',
      '¿Cómo sincronizo estos datos con Confia360?',
    ],
  },
  reputation: {
    title: 'ReputaciónLocal, KPIs D3 y Buzón Omnicanal',
    purpose:
      'Unifica reseñas de Google Maps, Trustpilot y portales sectoriales (TripAdvisor, Doctoralia, Habitissimo), además de críticas negativas sociales si activas el Add-on.',
    steps: [
      'Explora "KPIs de Reputación" para comparar con D3 tu nota media, respuesta y cuota Maps frente a competidores.',
      'En "Reseñas e Incidencias" filtra por plataforma o sentimiento y aprueba respuestas o resuelve incidencias SLA.',
      'En "Configuración y Fuentes" desbloquea con tu PIN de Asexia para activar fuentes o el Add-on de Escucha Social.',
    ],
    quickQuestions: [
      '¿Cómo activo TikTok, Meta o YouTube en el buzón?',
      '¿Cómo funciona el panel D3 frente a competidores?',
      '¿Qué ocurre cuando llega una reseña crítica ≤3 estrellas?',
    ],
  },
  geogrid: {
    title: 'Mapa Geo-Grid Local',
    purpose:
      'Mide en qué posición apareces en Google Maps calle a calle alrededor de tus sedes para detectar barrios fuertes y zonas a reforzar.',
    steps: [
      'Selecciona la palabra clave local que deseas auditar.',
      'Pulsa sobre cualquier nodo numérico de la cuadrícula para ver los 3 competidores que lideran ese punto exacto.',
    ],
    quickQuestions: [
      '¿Por qué cambia mi posición según el código postal?',
      '¿Cómo mejoro los nodos en rojo (>10)?',
      '¿Conecta esto con campañas locales?',
    ],
  },
  'geo-ai': {
    title: 'Monitor GEO en Buscadores IA',
    purpose:
      'Comprueba si ChatGPT, Perplexity, Gemini y Claude recomiendan tu marca y detecta caídas previstas con optimizaciones proactivas.',
    steps: [
      'Pulsa "Verificar en vivo" para consultar en tiempo real fuentes citadas con Google Search Grounding.',
      'Ejecuta "Analizar tendencias" para detectar riesgo de descenso y generar mejoras en tus páginas reales.',
    ],
    quickQuestions: [
      '¿Cómo consigo aparecer más en ChatGPT y Gemini?',
      '¿Para qué sirve la previsión de caída SEO/GEO?',
      '¿Cómo paso una mejora al calendario estratégico?',
    ],
  },
  content: {
    title: 'Estrategia y Contenido con Aprobación Humana',
    purpose:
      'Planifica clústeres SEO/GEO y genera borradores verificados con Gemini que respetan tus precios, garantías y afirmaciones prohibidas.',
    steps: [
      'Elige un tema e intención y genera el borrador asistido.',
      'Revisa las fuentes, preguntas FAQ y esquema JSON-LD antes de aprobar y programar la publicación.',
    ],
    quickQuestions: [
      '¿Cómo evita la IA inventar precios o certificados?',
      '¿Quién puede aprobar y publicar artículos?',
      '¿Qué es el bloque JSON-LD generado?',
    ],
  },
  technical: {
    title: 'Auditoría SEO Técnico',
    purpose:
      'Prioriza errores de indexación, velocidad Core Web Vitals, metadatos y Schema Markup ordenados por impacto y esfuerzo.',
    steps: [
      'Filtra incidencias de alto impacto y cambia su estado a "En curso" o "Resuelto" conforme se implementen.',
    ],
    quickQuestions: [
      '¿Por qué incidencia técnica debería empezar hoy?',
      '¿Qué impacto tiene el marcado Schema LocalBusiness?',
    ],
  },
  backlinks: {
    title: 'Backlinks Éticos y Prensa Local',
    purpose:
      'Gestiona oportunidades de autoridad local en prensa, asociaciones y cámaras de comercio sin enlaces spam.',
    steps: [
      'Genera un borrador de propuesta editorial con Gemini y actualiza el estado del contacto hasta conseguir la mención.',
    ],
    quickQuestions: [
      '¿Cómo redacto la propuesta para un medio local?',
      '¿Por qué evitamos enlaces automatizados?',
    ],
  },
  calendar: {
    title: 'Calendario Estratégico y Estacionalidad',
    purpose:
      'Coordina fechas clave comerciales, festivos locales y acciones programadas entre SEO, GBP y Campañas.',
    steps: [
      'Añade fechas comerciales propias de tu negocio o programa acciones vinculadas a eventos de España y tu ciudad.',
    ],
    quickQuestions: [
      '¿Cómo programo una acción para el próximo festivo?',
      '¿Se coordina con publicaciones en Google Business Profile?',
    ],
  },
  campaigns: {
    title: 'Campañas Multiformato y Avisos Proactivos',
    purpose:
      'Conecta clima en tiempo real, stock/capacidad y calendario para generar guiones de Meta Ads, TikTok y YouTube Shorts sin mezclar aquí la escucha de críticas.',
    steps: [
      'Pulsa "Evaluar ahora" para leer el clima actual de tu sede y detectar oportunidades o alertas de stock bajo.',
      'Convierte cualquier aviso en campaña con presupuesto y códigos postales débiles del Geo-Grid.',
    ],
    quickQuestions: [
      '¿Cómo afectan la lluvia o el stock a las campañas?',
      '¿Cuál es la diferencia entre este módulo y la Escucha Social?',
    ],
  },
  onboarding: {
    title: 'Onboarding Inteligente, Administración y Escucha Social',
    purpose:
      'Permite dar de alta nuevos clientes con su Ficha Única, gestionar módulos contratables y activar fuentes/Add-on de Escucha Social y notas de novedades con PIN de Asexia.',
    steps: [
      'En "Módulos y Escucha Social" introduce el PIN de Asexia para habilitar módulos, fuentes o el Add-on Social (Meta, TikTok, YouTube).',
      'En "Publicar novedad" actualiza las notas informativas que verán los usuarios en cada módulo.',
      'En "Nuevo proyecto (IA)" da de alta un cliente capturando web, datos antialucinación y su Ficha Única.',
    ],
    quickQuestions: [
      '¿Cómo doy de alta un nuevo cliente completo?',
      '¿Cómo publico una nota de novedad para otro módulo?',
      '¿Qué protege el PIN de Asexia en esta pantalla?',
    ],
  },
};

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  section: NavSection;
  subTab?: string;
  project: ProjectWorkspace;
}

export const ContextualTutorDrawer: React.FC<Props> = ({
  open,
  onClose,
  section,
  subTab,
  project,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'tutor'>('guide');
  const [questionInput, setQuestionInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const [asking, setAsking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const guide = SCREEN_GUIDES[section] || SCREEN_GUIDES.dashboard;

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!open) return null;

  const speakWithBrowserFallback = (textToSpeak: string): boolean => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(textToSpeak);
    utter.lang = 'es-ES';
    utter.rate = 1.02;
    const voices = synth.getVoices();
    const esVoice = voices.find((v) => v.lang.toLowerCase().startsWith('es'));
    if (esVoice) utter.voice = esVoice;
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    synth.speak(utter);
    return true;
  };

  const speakText = async (textToSpeak: string, idKey: string) => {
    if (speakingId === idKey) {
      stopAudio();
      return;
    }
    stopAudio();
    setError(null);
    setSpeakingId(idKey);
    try {
      const res = await fetch('/api/assistant/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voiceName: 'Kore' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el audio de voz.');
      const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
      audioPlayerRef.current = audio;
      audio.onended = () => {
        setSpeakingId(null);
        audioPlayerRef.current = null;
      };
      audio.onerror = () => {
        setSpeakingId(null);
        audioPlayerRef.current = null;
        if (!speakWithBrowserFallback(textToSpeak)) {
          setError('Error reproduciendo la respuesta de voz.');
        }
      };
      await audio.play();
    } catch {
      if (!speakWithBrowserFallback(textToSpeak)) {
        setSpeakingId(null);
        setError('No se pudo reproducir la locución de voz en este navegador.');
      }
    }
  };

  const askTutor = async (qText: string) => {
    const cleanQ = qText.trim();
    if (!cleanQ || asking) return;
    setError(null);
    setActiveTab('tutor');
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text: cleanQ };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setQuestionInput('');
    setAsking(true);
    try {
      const res = await fetch('/api/assistant/contextual-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          section,
          subTab,
          question: cleanQ,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'El tutor no pudo responder en este momento.');
      const assistantMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.answer,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (autoSpeak && data.answer) {
        void speakText(data.answer, assistantMsg.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error consultando al tutor Gemini.');
    } finally {
      setAsking(false);
    }
  };

  const toggleMicrophone = async () => {
    setError(null);
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no admite captura de micrófono. Escribe tu pregunta abajo.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: preferredMime });
        if (blob.size === 0) return;

        setTranscribing(true);
        try {
          const reader = new FileReader();
          const base64: string = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const result = String(reader.result || '');
              resolve(result.split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/assistant/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType: preferredMime }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'No se pudo transcribir la voz.');
          if (data.text) {
            await askTutor(data.text);
          } else {
            setError('No se detectó voz clara en la grabación. Inténtalo de nuevo.');
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Error transcribiendo tu pregunta de voz.'
          );
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setActiveTab('tutor');
      setRecording(true);
    } catch {
      setError(
        'Permiso de micrófono denegado o no disponible. Actívalo en tu navegador o escribe tu duda directamente.'
      );
    }
  };

  const guideAudioScript = `${guide.title}. ${guide.purpose} Pasos principales: ${guide.steps.join(' ')}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/35" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white">
        {/* Cabecera del Tutor */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tutor Contextual · Gemini Voz y Micrófono</span>
            </p>
            <h2 className="mt-0.5 truncate text-sm font-bold text-slate-900">{guide.title}</h2>
            <p className="truncate text-[11px] text-slate-500">
              Cliente activo: {project.profile.companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Cerrar tutor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector de pestaña */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2.5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 pb-2 text-xs font-medium whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Guía de esta pantalla</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tutor')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 pb-2 text-xs font-medium whitespace-nowrap ${
              activeTab === 'tutor'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Preguntar por Voz o Texto</span>
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'guide' ? (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">Para qué sirve esta vista</span>
                  <button
                    type="button"
                    onClick={() => speakText(guideAudioScript, 'guide-script')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium whitespace-nowrap ${
                      speakingId === 'guide-script'
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-blue-700 text-white hover:bg-blue-800'
                    }`}
                  >
                    {speakingId === 'guide-script' ? (
                      <>
                        <Square className="h-3 w-3" />
                        <span>Detener voz</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>Escuchar guía</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="leading-relaxed text-slate-700">{guide.purpose}</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-900">Pasos recomendados:</p>
                <ol className="space-y-2">
                  {guide.steps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <span className="font-mono font-bold text-blue-700 tabular-nums">
                        {idx + 1}.
                      </span>
                      <span className="text-slate-700 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="font-semibold text-slate-900">
                  Dudas frecuentes en esta pantalla (pulsa para preguntar):
                </p>
                <div className="space-y-1.5">
                  {guide.quickQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => askTutor(q)}
                      className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-800 hover:border-blue-300 hover:bg-blue-50/40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-slate-700 font-medium">
                  Leer respuestas en voz alta (Gemini TTS)
                </span>
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700"
                />
              </div>

              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center space-y-3">
                  <p className="text-slate-600 leading-relaxed">
                    Pulsa el micrófono para hablar con el tutor o elige una pregunta rápida sobre{' '}
                    <strong className="font-semibold text-slate-900">{guide.title}</strong>.
                  </p>
                  <div className="space-y-1.5 text-left">
                    {guide.quickQuestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => askTutor(q)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-50/40"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        msg.role === 'user'
                          ? 'border-blue-200 bg-blue-50/50 ml-6'
                          : 'border-slate-200 bg-white mr-2'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {msg.role === 'user' ? 'Tu pregunta' : 'Tutor Confia360 (Gemini)'}
                        </span>
                        {msg.role === 'assistant' && (
                          <button
                            type="button"
                            onClick={() => speakText(msg.text, msg.id)}
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                              speakingId === msg.id
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {speakingId === msg.id ? (
                              <>
                                <Square className="h-3 w-3" />
                                <span>Detener</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3 w-3" />
                                <span>Escuchar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-line leading-relaxed text-slate-800">
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {(transcribing || asking) && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-blue-800">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    {transcribing
                      ? 'Transcribiendo tu voz con Gemini...'
                      : 'Consultando contexto de pantalla y Ficha Única...'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra inferior de Micrófono y Texto */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void askTutor(questionInput);
          }}
          className="border-t border-slate-200 bg-slate-50 p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={transcribing || asking}
              onClick={toggleMicrophone}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                recording
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-100'
              } disabled:opacity-50`}
              title={recording ? 'Detener y enviar voz' : 'Preguntar hablando por micrófono'}
            >
              {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-blue-700" />}
              <span>{recording ? 'Detener' : 'Hablar'}</span>
            </button>

            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Escribe o pulsa Hablar..."
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
            />

            <button
              type="submit"
              disabled={!questionInput.trim() || asking || transcribing}
              className="inline-flex items-center justify-center rounded-lg bg-blue-700 p-2 text-white hover:bg-blue-800 disabled:opacity-50 shrink-0"
              aria-label="Enviar pregunta"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {recording && (
            <p className="text-[11px] font-medium text-rose-700">
              Micrófono grabando... Pulsa "Detener" cuando termines tu pregunta.
            </p>
          )}
        </form>
      </aside>
    </div>
  );
};
