import React, { useState } from 'react';
import {
  BellRing,
  Calendar,
  CheckCircle2,
  CloudRain,
  Flame,
  Loader2,
  Megaphone,
  Package,
  PauseCircle,
  Play,
  Plus,
  RefreshCw,
  Snowflake,
  Sparkles,
  Sun,
  Video,
} from 'lucide-react';
import type {
  CatalogItem,
  MediaCampaign,
  ProactiveAlert,
  ProjectWorkspace,
} from '../types';

interface Props {
  project: ProjectWorkspace;
  onEvaluateProactive: (scenario?: 'real' | 'rain' | 'heat' | 'cold') => Promise<void>;
  onUpdateStock: (itemId: string, stockUnits: number) => Promise<void>;
  onAddCatalogItem: (payload: {
    name: string;
    category: string;
    priceEur: number;
    stockUnits: number;
    seasonality: CatalogItem['seasonality'];
  }) => Promise<void>;
  onAlertStatus: (alertId: string, status: ProactiveAlert['status']) => Promise<void>;
  onGenerateCampaign: (payload: {
    channel: MediaCampaign['channel'];
    topic: string;
    budgetEurMonth: number;
    objective: MediaCampaign['objective'];
    alertId?: string;
  }) => Promise<void>;
  onCampaignStatus: (campaignId: string, status: MediaCampaign['status']) => Promise<void>;
}

export const CampaignsProactiveView: React.FC<Props> = ({
  project,
  onEvaluateProactive,
  onUpdateStock,
  onAddCatalogItem,
  onAlertStatus,
  onGenerateCampaign,
  onCampaignStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'calendar' | 'studio'>('alerts');
  const [scenario, setScenario] = useState<'real' | 'rain' | 'heat' | 'cold'>(
    project.weather?.scenarioMode || 'real'
  );
  const [evalBusy, setEvalBusy] = useState(false);
  const [stockBusyId, setStockBusyId] = useState<string | null>(null);
  const [alertBusyId, setAlertBusyId] = useState<string | null>(null);
  const [campaignBusyId, setCampaignBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario nuevo producto/servicio en catálogo
  const [showAddCatalog, setShowAddCatalog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(project.profile.sector);
  const [newItemPrice, setNewItemPrice] = useState(190);
  const [newItemStock, setNewItemStock] = useState(12);
  const [newItemSeasonality, setNewItemSeasonality] =
    useState<CatalogItem['seasonality']>('Todo el año');
  const [catalogAddBusy, setCatalogAddBusy] = useState(false);

  // Formulario Estudio Meta · TikTok · YouTube
  const [channel, setChannel] = useState<MediaCampaign['channel']>('Meta Ads');
  const [topic, setTopic] = useState(
    project.proactiveAlerts[0]?.suggestedTopic ||
      `Campaña local ${project.profile.services[0] || project.profile.sector}`
  );
  const [objective, setObjective] = useState<MediaCampaign['objective']>('Leads locales');
  const [budgetEurMonth, setBudgetEurMonth] = useState(450);
  const [linkedAlertId, setLinkedAlertId] = useState<string | undefined>(undefined);
  const [genBusy, setGenBusy] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    project.campaigns[0]?.id || ''
  );
  const [selectNewestNext, setSelectNewestNext] = useState(false);

  React.useEffect(() => {
    if (selectNewestNext && project.campaigns[0]?.id) {
      setSelectedCampaignId(project.campaigns[0].id);
      setSelectNewestNext(false);
    } else if (
      project.campaigns.length > 0 &&
      !project.campaigns.some((c) => c.id === selectedCampaignId)
    ) {
      setSelectedCampaignId(project.campaigns[0].id);
    }
  }, [project.campaigns, selectNewestNext, selectedCampaignId]);

  const selectedCampaign =
    project.campaigns.find((c) => c.id === selectedCampaignId) || project.campaigns[0];

  const activeAlerts = project.proactiveAlerts.filter((a) => a.status === 'Activa');
  const historyAlerts = project.proactiveAlerts.filter((a) => a.status !== 'Activa');

  const handleEvaluate = async () => {
    setError(null);
    setEvalBusy(true);
    try {
      await onEvaluateProactive(scenario);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error evaluando clima y reglas proactivas.');
    } finally {
      setEvalBusy(false);
    }
  };

  const handleStockChange = async (itemId: string, nextUnits: number) => {
    setError(null);
    setStockBusyId(itemId);
    try {
      await onUpdateStock(itemId, Math.max(0, nextUnits));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando stock.');
    } finally {
      setStockBusyId(null);
    }
  };

  const handleCreateCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setError(null);
    setCatalogAddBusy(true);
    try {
      await onAddCatalogItem({
        name: newItemName.trim(),
        category: newItemCategory.trim() || project.profile.sector,
        priceEur: Number(newItemPrice) || 0,
        stockUnits: Number(newItemStock) || 0,
        seasonality: newItemSeasonality,
      });
      setNewItemName('');
      setShowAddCatalog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error añadiendo referencia al catálogo.');
    } finally {
      setCatalogAddBusy(false);
    }
  };

  const handleOpenCampaignFromAlert = (alert: ProactiveAlert) => {
    const mappedChannel: MediaCampaign['channel'] =
      alert.recommendedChannel === 'TikTok' || alert.recommendedChannel === 'YouTube'
        ? alert.recommendedChannel
        : 'Meta Ads';
    setChannel(mappedChannel);
    setTopic(alert.suggestedTopic);
    setObjective(
      alert.triggerType === 'Stock' && alert.severity === 'Oportunidad'
        ? 'Liquidación stock'
        : 'Leads locales'
    );
    setLinkedAlertId(alert.id);
    setActiveTab('studio');
  };

  const handleOpenCampaignFromEvent = (title: string, actionHint: string) => {
    setChannel('YouTube');
    setTopic(`${title} · ${actionHint}`);
    setObjective('Reconocimiento local');
    setLinkedAlertId(undefined);
    setActiveTab('studio');
  };

  const handleDismissAlert = async (alertId: string) => {
    setError(null);
    setAlertBusyId(alertId);
    try {
      await onAlertStatus(alertId, 'Descartada');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando aviso.');
    } finally {
      setAlertBusyId(null);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setError(null);
    setGenBusy(true);
    try {
      setSelectNewestNext(true);
      await onGenerateCampaign({
        channel,
        topic: topic.trim(),
        budgetEurMonth: Number(budgetEurMonth) || 400,
        objective,
        alertId: linkedAlertId,
      });
      setLinkedAlertId(undefined);
    } catch (err) {
      setSelectNewestNext(false);
      setError(err instanceof Error ? err.message : 'Error generando campaña multicanal.');
    } finally {
      setGenBusy(false);
    }
  };

  const handleCampaignTransition = async (
    campId: string,
    status: MediaCampaign['status']
  ) => {
    setError(null);
    setCampaignBusyId(campId);
    try {
      await onCampaignStatus(campId, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cambiando estado de campaña.');
    } finally {
      setCampaignBusyId(null);
    }
  };

  const WeatherIcon =
    project.weather.scenarioMode === 'rain' || project.weather.precipitationProbPct >= 60
      ? CloudRain
      : project.weather.scenarioMode === 'heat' || project.weather.temperatureC >= 28
        ? Flame
        : project.weather.scenarioMode === 'cold' || project.weather.temperatureC <= 8
          ? Snowflake
          : Sun;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Clima en sede · Catálogo y stock · Fechas comerciales · Meta Ads, TikTok y YouTube
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Campañas Multicanal y Avisos Proactivos
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'alerts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Avisos y Stock ({activeAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Calendario Comercial ({project.calendarEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'studio'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estudio Meta · TikTok · YouTube ({project.campaigns.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Barra de Meteorología en Sede y Disparador de Reglas */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-blue-700">
              <WeatherIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{project.weather.city}</span>
                <span>·</span>
                <span>{project.weather.conditionLabel}</span>
                <span>·</span>
                <span>{project.weather.sourceLabel}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-4">
                <span className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                  {project.weather.temperatureC.toFixed(1)} °C
                </span>
                <span className="font-mono text-xs text-slate-600 tabular-nums">
                  Prob. lluvia: {project.weather.precipitationProbPct}% · Precipitación:{' '}
                  {project.weather.precipitationMm} mm
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  Actualizado: {project.weather.updatedAt}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={scenario}
              onChange={(e) =>
                setScenario(e.target.value as 'real' | 'rain' | 'heat' | 'cold')
              }
              aria-label="Modo meteorológico para reglas proactivas"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
            >
              <option value="real">Clima real en vivo (Open-Meteo)</option>
              <option value="rain">Simular lluvia intensa</option>
              <option value="heat">Simular ola de calor</option>
              <option value="cold">Simular ola de frío</option>
            </select>
            <button
              type="button"
              disabled={evalBusy}
              onClick={handleEvaluate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {evalBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>Evaluar clima y reglas</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: AVISOS PROACTIVOS Y CATÁLOGO / STOCK */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Columna de Avisos Proactivos */}
          <div className="space-y-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BellRing className="h-4 w-4 text-blue-700" />
                <span>Avisos Proactivos Activos</span>
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {activeAlerts.length} activos · {historyAlerts.length} procesados
              </span>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No hay avisos activos. Ajusta el stock o evalúa un escenario meteorológico para
                disparar nuevas recomendaciones.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => {
                  const severityTone =
                    alert.severity === 'Crítica'
                      ? 'text-rose-700'
                      : alert.severity === 'Preventiva'
                        ? 'text-amber-700'
                        : 'text-emerald-700';
                  return (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-500">
                          {alert.triggerType} · Canal sugerido: {alert.recommendedChannel}
                        </span>
                        <span className={`font-semibold ${severityTone}`}>{alert.severity}</span>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{alert.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{alert.detail}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {alert.createdAt}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={alertBusyId === alert.id}
                            onClick={() => handleDismissAlert(alert.id)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0"
                          >
                            Descartar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCampaignFromAlert(alert)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                          >
                            <Megaphone className="h-3.5 w-3.5" />
                            <span>Crear campaña desde alerta</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {historyAlerts.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Historial reciente de avisos</p>
                <div className="divide-y divide-slate-100">
                  {historyAlerts.slice(0, 4).map((h) => (
                    <div key={h.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="truncate pr-3 text-slate-600">{h.title}</span>
                      <span
                        className={`shrink-0 font-medium ${
                          h.status === 'Convertida en campaña'
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna de Catálogo y Control de Stock */}
          <div className="space-y-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Package className="h-4 w-4 text-blue-700" />
                <span>Catálogo y Disponibilidad (Web + API ERP)</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddCatalog((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Añadir referencia</span>
              </button>
            </div>

            {showAddCatalog && (
              <form
                onSubmit={handleCreateCatalogItem}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-slate-900">
                  Nueva referencia de producto o capacidad de servicio
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Nombre del producto o servicio"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none sm:col-span-2"
                  />
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    placeholder="Categoría"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                  <select
                    value={newItemSeasonality}
                    onChange={(e) =>
                      setNewItemSeasonality(e.target.value as CatalogItem['seasonality'])
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Todo el año">Todo el año</option>
                    <option value="Lluvia / Frío">Lluvia / Frío</option>
                    <option value="Calor / Verano">Calor / Verano</option>
                    <option value="Cierre Fiscal / Campaña">Cierre Fiscal / Campaña</option>
                  </select>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Precio (€)</label>
                    <input
                      type="number"
                      min={0}
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Unidades / plazas
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newItemStock}
                      onChange={(e) => setNewItemStock(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCatalog(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={catalogAddBusy}
                    className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {catalogAddBusy ? 'Guardando...' : 'Guardar y evaluar reglas'}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Referencia y URL</th>
                      <th className="px-3 py-3 font-medium text-right">Precio</th>
                      <th className="px-3 py-3 font-medium text-center">Stock / Plazas</th>
                      <th className="px-4 py-3 font-medium text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.catalog.map((item) => {
                      const stateLabel =
                        item.stockUnits <= item.minThreshold
                          ? 'Stock bajo'
                          : item.stockUnits >= item.surplusThreshold
                            ? 'Excedente'
                            : 'Óptimo';
                      const stateClass =
                        item.stockUnits <= item.minThreshold
                          ? 'text-rose-700 font-semibold'
                          : item.stockUnits >= item.surplusThreshold
                            ? 'text-blue-700 font-semibold'
                            : 'text-emerald-700 font-medium';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                              {item.sku} · {item.seasonality} · {item.linkedWebPath}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-800 tabular-nums whitespace-nowrap">
                            {item.priceEur} €
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                disabled={stockBusyId === item.id || item.stockUnits <= 0}
                                onClick={() => handleStockChange(item.id, item.stockUnits - 1)}
                                aria-label={`Reducir stock de ${item.name}`}
                                className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white font-mono text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={item.stockUnits}
                                onChange={(e) =>
                                  handleStockChange(item.id, Number(e.target.value))
                                }
                                aria-label={`Unidades de ${item.name}`}
                                className="w-14 rounded border border-slate-200 bg-slate-50 py-1 text-center font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={stockBusyId === item.id}
                                onClick={() => handleStockChange(item.id, item.stockUnits + 1)}
                                aria-label={`Aumentar stock de ${item.name}`}
                                className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white font-mono text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-right whitespace-nowrap ${stateClass}`}>
                            {stateLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
                Al bajar del umbral mínimo se sugiere pausar inversión; al superar el umbral de
                excedente se activa una alerta de campaña en códigos postales prioritarios.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CALENDARIO COMERCIAL CONECTADO */}
      {activeTab === 'calendar' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Calendar className="h-4 w-4 text-blue-700" />
              <span>Fechas Significativas Conectadas a Catálogo y Web</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Efemérides nacionales, locales de {project.profile.primaryCity} y hitos del sector{' '}
              {project.profile.sector}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {project.calendarEvents.map((ev) => {
              const linkedNames = project.catalog
                .filter((c) => ev.linkedCatalogIds.includes(c.id))
                .map((c) => c.name);
              return (
                <div
                  key={ev.id}
                  className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-blue-700 tabular-nums">
                        {ev.date}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{ev.scope}</span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={
                          ev.commercialPriority === 'Alta'
                            ? 'font-semibold text-amber-700'
                            : 'font-medium text-slate-600'
                        }
                      >
                        Prioridad {ev.commercialPriority}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{ev.title}</h3>
                    <p className="text-xs text-slate-600">{ev.recommendedAction}</p>
                    {linkedNames.length > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Catálogo vinculado: {linkedNames.join(' · ')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCampaignFromEvent(ev.title, ev.recommendedAction)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Megaphone className="h-3.5 w-3.5 text-blue-700" />
                    <span>Planificar campaña</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ESTUDIO DE CAMPAÑAS META ADS · TIKTOK · YOUTUBE */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Generador IA + Lista de Campañas */}
          <div className="space-y-5 lg:col-span-5">
            <form
              onSubmit={handleGenerate}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
            >
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-blue-700" />
                  <span>Generar Campaña Multicanal con IA</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Anclada en tu BrandProfile, clima actual y códigos postales débiles del Geo-Grid
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['Meta Ads', 'TikTok', 'YouTube'] as MediaCampaign['channel'][]).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      channel === ch
                        ? 'border-blue-700 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tema, producto o fecha de campaña
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Campaña cierre fiscal pyme en zonas de oportunidad"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Objetivo comercial
                  </label>
                  <select
                    value={objective}
                    onChange={(e) =>
                      setObjective(e.target.value as MediaCampaign['objective'])
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Leads locales">Leads locales</option>
                    <option value="Tráfico web">Tráfico web</option>
                    <option value="Reconocimiento local">Reconocimiento local</option>
                    <option value="Liquidación stock">Liquidación stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Presupuesto mensual (€)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    value={budgetEurMonth}
                    onChange={(e) => setBudgetEurMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={genBusy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
              >
                {genBusy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generando guion, hook y copys...</span>
                  </>
                ) : (
                  <>
                    <Video className="h-3.5 w-3.5" />
                    <span>Generar borrador para {channel}</span>
                  </>
                )}
              </button>
            </form>

            {/* Lista de Campañas */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3.5">
                <h3 className="text-xs font-semibold text-slate-900">
                  Campañas del Proyecto ({project.campaigns.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {project.campaigns.map((camp) => {
                  const isSelected = selectedCampaign?.id === camp.id;
                  const statusTone =
                    camp.status === 'Activa'
                      ? 'text-emerald-700'
                      : camp.status === 'Aprobada'
                        ? 'text-blue-700'
                        : camp.status === 'Pausada'
                          ? 'text-slate-500'
                          : 'text-amber-700';

                  return (
                    <button
                      key={camp.id}
                      type="button"
                      onClick={() => setSelectedCampaignId(camp.id)}
                      className={`w-full px-5 py-3.5 text-left transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-500">
                          {camp.channel} · {camp.objective}
                        </span>
                        <span className={`font-semibold ${statusTone}`}>{camp.status}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-900">{camp.title}</p>
                      <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px] text-slate-500 tabular-nums">
                        <span>{camp.budgetEurMonth} €/mes</span>
                        <span>·</span>
                        <span>{camp.estimatedLeads} leads est.</span>
                        <span>·</span>
                        <span>CPL {camp.estimatedCplEur} €</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inspector Detallado de Campaña */}
          <div className="lg:col-span-7">
            {!selectedCampaign ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                Selecciona o genera una campaña para revisar el guion de vídeo, copys y segmentación
                postal.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-blue-700">
                        {selectedCampaign.channel}
                      </span>
                      <span>·</span>
                      <span>{selectedCampaign.objective}</span>
                      <span>·</span>
                      <span>Estado: {selectedCampaign.status}</span>
                    </div>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      {selectedCampaign.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Referencia: {selectedCampaign.calendarOrAlertRef} · Creada:{' '}
                      <span className="font-mono tabular-nums">{selectedCampaign.createdAt}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {selectedCampaign.status === 'Borrador' && (
                      <button
                        type="button"
                        disabled={campaignBusyId === selectedCampaign.id}
                        onClick={() => handleCampaignTransition(selectedCampaign.id, 'Aprobada')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Aprobar creatividades</span>
                      </button>
                    )}
                    {(selectedCampaign.status === 'Aprobada' ||
                      selectedCampaign.status === 'Pausada') && (
                      <button
                        type="button"
                        disabled={campaignBusyId === selectedCampaign.id}
                        onClick={() => handleCampaignTransition(selectedCampaign.id, 'Activa')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Activar campaña</span>
                      </button>
                    )}
                    {selectedCampaign.status === 'Activa' && (
                      <button
                        type="button"
                        disabled={campaignBusyId === selectedCampaign.id}
                        onClick={() => handleCampaignTransition(selectedCampaign.id, 'Pausada')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <PauseCircle className="h-3.5 w-3.5" />
                        <span>Pausar campaña</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas y segmentación postal */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Presupuesto</span>
                    <span className="mt-1 block font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {selectedCampaign.budgetEurMonth} €/mes
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">Leads estimados</span>
                    <span className="mt-1 block font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                      {selectedCampaign.estimatedLeads} / mes
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">CPL proyectado</span>
                    <span className="mt-1 block font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {selectedCampaign.estimatedCplEur} €
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="block text-[11px] text-slate-500">CPs Geo-Grid</span>
                    <span className="mt-1 block font-mono text-xs font-semibold text-blue-700 tabular-nums">
                      {selectedCampaign.targetPostalCodes.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Hook 3 segundos y Guion */}
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Hook primeros 3 segundos ({selectedCampaign.channel})
                    </span>
                    <p className="mt-1.5 text-sm font-medium text-slate-900">
                      “{selectedCampaign.hook3s}”
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-800 mb-1.5">
                      Guion de vídeo / Reel / Short
                    </h3>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                      {selectedCampaign.videoScript}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Titular del anuncio
                      </span>
                      <p className="mt-1 text-xs font-semibold text-slate-900">
                        {selectedCampaign.adHeadline}
                      </p>
                      <span className="mt-3 block text-[11px] font-semibold text-slate-500">
                        CTA configurada
                      </span>
                      <p className="mt-1 text-xs font-medium text-blue-700">
                        {selectedCampaign.ctaLabel}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        Copy principal
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        {selectedCampaign.adCopyPrimary}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
