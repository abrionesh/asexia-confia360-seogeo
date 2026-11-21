import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  FileEdit,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import type {
  EditorialArticle,
  GeoAIQuery,
  NavSection,
  ProactiveSeoSuggestion,
  ProjectWorkspace,
} from '../types';

interface Props {
  project: ProjectWorkspace;
  onLiveCheck: (payload: { queryId?: string; customQuery?: string }) => Promise<void>;
  onAnalyzeTrends: () => Promise<void>;
  onUpdateOptimizationStatus: (
    suggestionId: string,
    status: ProactiveSeoSuggestion['status']
  ) => Promise<void>;
  onGenerateArticle: (payload: {
    topic: string;
    intentType: EditorialArticle['intentType'];
  }) => Promise<void>;
  onScheduleOptimization: (suggestion: ProactiveSeoSuggestion) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

export const GeoAIMonitorView: React.FC<Props> = ({
  project,
  onLiveCheck,
  onAnalyzeTrends,
  onUpdateOptimizationStatus,
  onGenerateArticle,
  onScheduleOptimization,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'trends'>('monitor');
  const [trendFilter, setTrendFilter] = useState<'all' | 'risk'>('all');
  const [customQuery, setCustomQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [trendBusy, setTrendBusy] = useState(false);
  const [optBusyKey, setOptBusyKey] = useState<string | null>(null);
  const [selectedQueryId, setSelectedQueryId] = useState<string>(project.aiQueries[0]?.id || '');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeQuery: GeoAIQuery | undefined =
    project.aiQueries.find((q) => q.id === selectedQueryId) || project.aiQueries[0];

  const suggestions = project.proactiveSeoSuggestions || [];
  const activeSuggestions = suggestions.filter((s) => s.status !== 'Descartada');
  const pendingSuggestions = suggestions.filter(
    (s) => s.status === 'Pendiente' || s.status === 'En curso'
  );
  const appliedCount = suggestions.filter((s) => s.status === 'Aplicada').length;

  const atRiskQueries = project.aiQueries.filter((q) => (q.forecastedDropPct ?? 0) < 0);
  const avgForecastDrop =
    atRiskQueries.length > 0
      ? (
          atRiskQueries.reduce((acc, q) => acc + (q.forecastedDropPct ?? 0), 0) /
          atRiskQueries.length
        ).toFixed(1)
      : '0.0';

  const displayedTrendQueries =
    trendFilter === 'risk' ? atRiskQueries : project.aiQueries;

  const handleRunCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    setError(null);
    setFeedback(null);
    setLoadingId('custom');
    try {
      await onLiveCheck({ customQuery: customQuery.trim() });
      setCustomQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la consulta en vivo.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleVerifyRow = async (queryId: string) => {
    setError(null);
    setFeedback(null);
    setLoadingId(queryId);
    try {
      await onLiveCheck({ queryId });
      setSelectedQueryId(queryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error verificando la consulta.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRunTrendAnalysis = async () => {
    setError(null);
    setFeedback(null);
    setTrendBusy(true);
    try {
      await onAnalyzeTrends();
      setFeedback(
        'Análisis predictivo completado: previsiones de demanda y optimizaciones de landing actualizadas.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar el análisis predictivo con Gemini.'
      );
    } finally {
      setTrendBusy(false);
    }
  };

  const handleSuggestionStatus = async (
    suggestionId: string,
    status: ProactiveSeoSuggestion['status']
  ) => {
    setError(null);
    setFeedback(null);
    setOptBusyKey(`st-${suggestionId}`);
    try {
      await onUpdateOptimizationStatus(suggestionId, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando estado.');
    } finally {
      setOptBusyKey(null);
    }
  };

  const handleGenerateFromSuggestion = async (s: ProactiveSeoSuggestion) => {
    setError(null);
    setFeedback(null);
    setOptBusyKey(`gen-${s.id}`);
    try {
      await onGenerateArticle({
        topic: `Actualización de ${s.targetPageUrl}: ${s.title}`,
        intentType:
          s.optimizationType === 'Comparativa y Precios'
            ? 'Comparativa'
            : 'GEO Conversacional',
      });
      await onUpdateOptimizationStatus(s.id, 'En curso');
      setFeedback(
        `Borrador generado para actualizar ${s.targetPageUrl} y marcado "En curso". Revísalo en Estrategia y Contenido.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el borrador.');
    } finally {
      setOptBusyKey(null);
    }
  };

  const handleScheduleFromSuggestion = async (s: ProactiveSeoSuggestion) => {
    setError(null);
    setFeedback(null);
    setOptBusyKey(`cal-${s.id}`);
    try {
      await onScheduleOptimization(s);
      await onUpdateOptimizationStatus(s.id, 'En curso');
      setFeedback(
        `Actualización de ${s.targetPageUrl} programada en el Calendario Estratégico.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo programar en el calendario.');
    } finally {
      setOptBusyKey(null);
    }
  };

  const totalQueries = project.aiQueries.length;
  const appearingCount = project.aiQueries.filter((q) => q.brandAppears).length;
  const avgSov =
    totalQueries > 0
      ? Math.round(
          project.aiQueries.reduce((acc, q) => acc + q.shareOfVoicePct, 0) / totalQueries
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Visibilidad en respuestas generativas · ChatGPT · Perplexity · Gemini · Claude
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Monitorización GEO y Previsión de Tendencias
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-5 text-xs">
            <div>
              <span className="text-slate-500">Menciones: </span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {appearingCount}/{totalQueries}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Cuota media: </span>
              <span className="font-mono font-semibold text-blue-700 tabular-nums">{avgSov}%</span>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'monitor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monitor en vivo ({totalQueries})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'trends'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tendencias y Optimización ({pendingSuggestions.length})
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {feedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          {feedback}
        </div>
      )}

      {activeTab === 'monitor' ? (
        <>
          {/* Barra de verificación en vivo con Gemini + Google Search Grounding */}
          <form
            onSubmit={handleRunCustom}
            className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder={`Prueba una consulta conversacional real, ej. "¿qué empresa recomiendas para ${project.profile.sector.toLowerCase()} en ${project.profile.primaryCity}?"`}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loadingId !== null || !customQuery.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {loadingId === 'custom' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Consultando fuentes reales...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Auditar consulta en vivo</span>
                </>
              )}
            </button>
          </form>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Lista de consultas monitorizadas */}
            <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-slate-900">
                  Consultas Conversacionales Monitorizadas
                </h2>
                {atRiskQueries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('trends')}
                    className="text-xs font-medium text-rose-700 hover:text-rose-800 whitespace-nowrap"
                  >
                    {atRiskQueries.length} con caída prevista →
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {project.aiQueries.map((q) => {
                  const selected = activeQuery?.id === q.id;
                  const forecast = q.forecastedDropPct;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQueryId(q.id)}
                      className={`cursor-pointer px-5 py-4 transition-colors ${
                        selected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{q.query}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {q.category} · Cuota de voz{' '}
                            <span className="font-mono font-semibold text-slate-700 tabular-nums">
                              {q.shareOfVoicePct}%
                            </span>
                            {forecast !== undefined && (
                              <>
                                {' '}
                                · Previsión 30d{' '}
                                <span
                                  className={`font-mono font-semibold tabular-nums ${
                                    forecast < 0 ? 'text-rose-700' : 'text-emerald-700'
                                  }`}
                                >
                                  {forecast > 0 ? `+${forecast}%` : `${forecast}%`}
                                </span>
                              </>
                            )}{' '}
                            · Revisado {q.lastCheckedAt}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerifyRow(q.id);
                          }}
                          disabled={loadingId !== null}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          {loadingId === q.id ? 'Comprobando...' : 'Verificar en vivo'}
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {q.engines.map((eng) => (
                          <div
                            key={eng.engine}
                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          >
                            <span className="font-medium text-slate-700">{eng.engine}</span>
                            {eng.mentioned ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700 tabular-nums">
                                <CheckCircle2 className="h-3 w-3" />#{eng.position ?? 1}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <XCircle className="h-3 w-3" /> No
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel de detalle de fuentes y brecha de oportunidad */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
              {activeQuery ? (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-xs font-medium text-slate-500">
                      Diagnóstico de citación y brechas
                    </span>
                    <h2 className="mt-1 text-base font-semibold text-slate-900">
                      {activeQuery.query}
                    </h2>
                  </div>

                  {(activeQuery.forecastedDropPct ?? 0) < 0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-800">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span>Alerta de tendencia (30 días)</span>
                        </span>
                        <span className="font-mono font-semibold text-rose-800 tabular-nums">
                          {activeQuery.forecastedDropPct}%
                        </span>
                      </div>
                      {activeQuery.forecastReason && (
                        <p className="text-xs leading-relaxed text-rose-900">
                          {activeQuery.forecastReason}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('trends')}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                      >
                        Ver optimización de landing sugerida →
                      </button>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-slate-700">
                      Oportunidad de contenido detectada
                    </h3>
                    <p className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-950">
                      {activeQuery.missingContentOpportunity}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-700">
                      Competidores mencionados en las IAs
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {activeQuery.competitorsMentioned.length > 0
                        ? activeQuery.competitorsMentioned.join(' · ')
                        : 'Ningún competidor dominante detectado aún en esta consulta.'}
                    </p>
                  </div>

                  {activeQuery.liveSummary && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700">
                        Respuesta verificada en vivo (Gemini + Google Search)
                      </h3>
                      <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {activeQuery.liveSummary}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-slate-700">
                      Fuentes y URLs citadas
                    </h3>
                    <div className="mt-2 space-y-2">
                      {(activeQuery.liveSources && activeQuery.liveSources.length > 0
                        ? activeQuery.liveSources
                        : activeQuery.engines.flatMap((e) =>
                            e.citedUrls.map((uri) => ({ title: `${e.engine} · Fuente`, uri }))
                          )
                      ).map((src, idx) => (
                        <a
                          key={`${src.uri}-${idx}`}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <span className="truncate pr-2">{src.title || src.uri}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </a>
                      ))}
                      {!activeQuery.liveSources?.length &&
                        activeQuery.engines.every((e) => e.citedUrls.length === 0) && (
                          <p className="text-xs text-slate-500">
                            Pulsa "Verificar en vivo" para extraer citas web reales actuales.
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Selecciona una consulta para ver el detalle.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: ANÁLISIS DE TENDENCIAS Y OPTIMIZACIONES SEO PROACTIVAS */
        <div className="space-y-6">
          {/* Barra superior de ejecución del motor predictivo */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Análisis Predictivo de Caídas de Búsqueda y Actualización de Landings
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Detecta consultas con pérdida prevista de demanda o citabilidad en los próximos 30
                días y genera acciones concretas sobre páginas existentes antes de perder tráfico.
              </p>
            </div>
            <button
              type="button"
              disabled={trendBusy}
              onClick={handleRunTrendAnalysis}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {trendBusy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Analizando tendencias...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Analizar tendencias y prever caídas (IA)</span>
                </>
              )}
            </button>
          </div>

          {/* Tira de métricas predictivas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500">Consultas con caída prevista (30d)</span>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-rose-700 tabular-nums">
                {atRiskQueries.length} / {totalQueries}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Basado en histórico de 4 meses y estacionalidad
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500">Variación media en riesgo</span>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {avgForecastDrop}%
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Demanda conversacional y menciones IA
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500">Landings pendientes de mejora</span>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
                {pendingSuggestions.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Con hoja de ruta de actualización y esquema
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-xs text-slate-500">Optimizaciones aplicadas</span>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                {appliedCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Auditadas en el historial de cumplimiento
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Columna Izquierda: Radar de Tendencias por Consulta */}
            <div className="rounded-xl border border-slate-200 bg-white lg:col-span-5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Evolución Histórica y Previsión 30d
                </h3>
                <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setTrendFilter('all')}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                      trendFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendFilter('risk')}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                      trendFilter === 'risk'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    En riesgo ({atRiskQueries.length})
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {displayedTrendQueries.map((q) => {
                  const forecast = q.forecastedDropPct ?? 0;
                  const isDrop = forecast < 0;
                  const history = q.trendHistory || [];

                  return (
                    <div key={q.id} className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-slate-500">
                            {q.category} · Cuota actual {q.shareOfVoicePct}%
                          </span>
                          <p className="mt-0.5 text-xs font-semibold text-slate-900">{q.query}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums shrink-0 ${
                            isDrop ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {isDrop ? (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          {forecast > 0 ? `+${forecast}%` : `${forecast}%`}
                        </span>
                      </div>

                      {history.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {history.map((pt) => {
                            const barH = Math.max(10, Math.round((pt.queryVolumeIndex / 100) * 34));
                            return (
                              <div key={pt.period} className="text-center">
                                <div className="flex h-10 items-end justify-center rounded bg-slate-50 border border-slate-100 px-2 pb-1">
                                  <div
                                    className={`w-3 rounded-t ${
                                      isDrop ? 'bg-amber-500' : 'bg-blue-700'
                                    }`}
                                    style={{ height: `${barH}px` }}
                                    title={`Índice demanda ${pt.queryVolumeIndex} · Cuota ${pt.shareOfVoicePct}%`}
                                  />
                                </div>
                                <span className="mt-1 block font-mono text-[10px] text-slate-500 tabular-nums">
                                  {pt.period} · {pt.shareOfVoicePct}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.forecastReason && (
                        <p className="text-xs leading-relaxed text-slate-600">{q.forecastReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha: Optimizaciones SEO Proactivas */}
            <div className="space-y-4 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Optimizaciones SEO Proactivas Sugeridas
                </h3>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {activeSuggestions.length} recomendaciones activas
                </span>
              </div>

              {activeSuggestions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    No hay optimizaciones pendientes. Ejecuta el análisis predictivo para detectar
                    nuevas oportunidades de actualización en tus landing pages.
                  </p>
                  <button
                    type="button"
                    disabled={trendBusy}
                    onClick={handleRunTrendAnalysis}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Ejecutar análisis IA</span>
                  </button>
                </div>
              ) : (
                activeSuggestions.map((s) => {
                  const statusTone =
                    s.status === 'Aplicada'
                      ? 'text-emerald-700'
                      : s.status === 'En curso'
                        ? 'text-blue-700'
                        : 'text-amber-700';

                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-blue-700">
                              {s.optimizationType}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-slate-600">{s.targetPageUrl}</span>
                            <span className="text-slate-300">·</span>
                            <span
                              className={
                                s.urgency === 'Alta'
                                  ? 'font-semibold text-rose-700'
                                  : 'font-medium text-amber-700'
                              }
                            >
                              Urgencia {s.urgency}
                            </span>
                          </div>
                          <h4 className="text-base font-semibold text-slate-900">{s.title}</h4>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${statusTone}`}>
                          {s.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="block text-[11px] text-slate-500">
                            Caída prevista
                          </span>
                          <span className="font-mono text-sm font-semibold text-rose-700 tabular-nums">
                            {s.forecastedDropPct}%
                          </span>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="block text-[11px] text-slate-500">
                            Recuperación est.
                          </span>
                          <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                            +{s.estimatedRecoveryPct}%
                          </span>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 col-span-2 sm:col-span-1">
                          <span className="block text-[11px] text-slate-500">
                            Landing objetivo
                          </span>
                          <span className="block truncate text-xs font-medium text-slate-900">
                            {s.targetPageTitle}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600">{s.rationale}</p>

                      {s.actionSteps.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="block text-xs font-semibold text-slate-800">
                            Plan de actualización recomendado
                          </span>
                          <ul className="space-y-1 text-xs text-slate-700">
                            {s.actionSteps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="font-mono text-[11px] font-semibold text-blue-700 tabular-nums">
                                  0{idx + 1}.
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={optBusyKey !== null}
                            onClick={() => handleGenerateFromSuggestion(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                          >
                            {optBusyKey === `gen-${s.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileEdit className="h-3.5 w-3.5" />
                            )}
                            <span>Generar actualización IA</span>
                          </button>
                          <button
                            type="button"
                            disabled={optBusyKey !== null}
                            onClick={() => handleScheduleFromSuggestion(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                          >
                            {optBusyKey === `cal-${s.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CalendarPlus className="h-3.5 w-3.5 text-blue-700" />
                            )}
                            <span>Programar en Calendario</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('content')}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap px-1"
                          >
                            Ir a Contenido →
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {s.status !== 'Aplicada' && (
                            <button
                              type="button"
                              disabled={optBusyKey !== null}
                              onClick={() => handleSuggestionStatus(s.id, 'Aplicada')}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Marcar aplicada</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={optBusyKey !== null}
                            onClick={() => handleSuggestionStatus(s.id, 'Descartada')}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
