import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudRain,
  FileEdit,
  Loader2,
  Megaphone,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CalendarEvent,
  EditorialArticle,
  MediaCampaign,
  NavSection,
  ProjectWorkspace,
  SeasonalAction,
} from '../types';

interface Props {
  project: ProjectWorkspace;
  onAddEvent: (payload: {
    date: string;
    title: string;
    scope: CalendarEvent['scope'];
    commercialPriority: CalendarEvent['commercialPriority'];
    linkedCatalogIds?: string[];
    recommendedAction?: string;
  }) => Promise<void>;
  onCreateAction: (payload: {
    title: string;
    scheduledDate: string;
    seasonalityTag: SeasonalAction['seasonalityTag'];
    actionType: SeasonalAction['actionType'];
    channel: SeasonalAction['channel'];
    linkedEventId?: string;
    linkedAlertId?: string;
    linkedCatalogId?: string;
    notes?: string;
    owner?: string;
  }) => Promise<void>;
  onUpdateAction: (
    actionId: string,
    updates: { status?: SeasonalAction['status']; scheduledDate?: string }
  ) => Promise<void>;
  onDeleteAction: (actionId: string) => Promise<void>;
  onGenerateArticle: (payload: {
    topic: string;
    intentType: EditorialArticle['intentType'];
  }) => Promise<void>;
  onGenerateCampaign: (payload: {
    channel: MediaCampaign['channel'];
    topic: string;
    budgetEurMonth: number;
    objective: MediaCampaign['objective'];
    alertId?: string;
  }) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

type LayerKind = 'commercial' | 'content' | 'paid' | 'alert' | 'action';

interface UnifiedCalendarItem {
  id: string;
  sourceId: string;
  date: string; // YYYY-MM-DD
  kind: LayerKind;
  kindLabel: string;
  title: string;
  subtitle: string;
  detail: string;
  statusLabel: string;
  seasonalityTag: SeasonalAction['seasonalityTag'];
  channelLabel: string;
  linkedCatalogName?: string;
  rawEvent?: CalendarEvent;
  rawAction?: SeasonalAction;
  rawAlertId?: string;
  recommendedTopic?: string;
  recommendedPaidChannel?: MediaCampaign['channel'];
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const TODAY_ISO = '2026-11-21';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(year: number, monthIndex0: number, day: number): string {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`;
}

function normalizeDatePrefix(raw?: string): string {
  if (!raw) return TODAY_ISO;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : TODAY_ISO;
}

export const StrategicCalendarView: React.FC<Props> = ({
  project,
  onAddEvent,
  onCreateAction,
  onUpdateAction,
  onDeleteAction,
  onGenerateArticle,
  onGenerateCampaign,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'timeline'>('month');
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 0-indexed: 10 = Noviembre
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-27');
  const [layerFilter, setLayerFilter] = useState<'all' | LayerKind>('all');
  const [seasonalityFilter, setSeasonalityFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'action' | 'event'>('action');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario Nueva Acción Estacional
  const [actTitle, setActTitle] = useState('');
  const [actDate, setActDate] = useState('2026-11-27');
  const [actSeasonality, setActSeasonality] = useState<SeasonalAction['seasonalityTag']>(
    'Campaña Comercial / Festivo'
  );
  const [actType, setActType] = useState<SeasonalAction['actionType']>('Artículo SEO/GEO');
  const [actChannel, setActChannel] = useState<SeasonalAction['channel']>('Blog / Web');
  const [actLinkedEventId, setActLinkedEventId] = useState<string>('');
  const [actLinkedAlertId, setActLinkedAlertId] = useState<string>('');
  const [actLinkedCatalogId, setActLinkedCatalogId] = useState<string>(
    project.catalog[0]?.id || ''
  );
  const [actOwner, setActOwner] = useState('Lucía Serrano');
  const [actNotes, setActNotes] = useState('');

  // Formulario Nuevo Festivo / Evento Comercial
  const [evDate, setEvDate] = useState('2026-12-15');
  const [evTitle, setEvTitle] = useState('');
  const [evScope, setEvScope] = useState<CalendarEvent['scope']>('Sectorial');
  const [evPriority, setEvPriority] = useState<CalendarEvent['commercialPriority']>('Alta');
  const [evCatalogId, setEvCatalogId] = useState<string>(project.catalog[0]?.id || '');
  const [evAction, setEvAction] = useState('');

  const catalogById = useMemo(() => {
    const map = new Map(project.catalog.map((c) => [c.id, c]));
    return map;
  }, [project.catalog]);

  // Unificar fechas comerciales, contenidos, campañas paid, alertas y acciones estacionales
  const unifiedItems = useMemo<UnifiedCalendarItem[]>(() => {
    const list: UnifiedCalendarItem[] = [];

    // 1. Fechas clave comerciales (festivos, eventos locales y sectoriales)
    for (const ev of project.calendarEvents || []) {
      const catNames = ev.linkedCatalogIds
        .map((id) => catalogById.get(id)?.name)
        .filter(Boolean)
        .join(' · ');
      const firstCat = ev.linkedCatalogIds[0]
        ? catalogById.get(ev.linkedCatalogIds[0])
        : undefined;
      const inferredSeasonality: SeasonalAction['seasonalityTag'] =
        firstCat?.seasonality === 'Lluvia / Frío' || firstCat?.seasonality === 'Calor / Verano'
          ? firstCat.seasonality
          : ev.scope === 'Sectorial'
            ? 'Sectorial'
            : 'Campaña Comercial / Festivo';

      list.push({
        id: `ev-${ev.id}`,
        sourceId: ev.id,
        date: normalizeDatePrefix(ev.date),
        kind: 'commercial',
        kindLabel: `Fecha clave · ${ev.scope}`,
        title: ev.title,
        subtitle: `Prioridad ${ev.commercialPriority} · ${ev.scope}`,
        detail: ev.recommendedAction,
        statusLabel: ev.commercialPriority === 'Alta' ? 'Prioridad Alta' : 'Prioridad Media',
        seasonalityTag: inferredSeasonality,
        channelLabel: 'Omnicanal',
        linkedCatalogName: catNames || undefined,
        rawEvent: ev,
        recommendedTopic: `${ev.title} · ${project.profile.companyName} (${project.profile.primaryCity})`,
        recommendedPaidChannel: 'Meta Ads',
      });
    }

    // 2a. Clústeres editoriales (fechas límite)
    for (const cl of project.clusters || []) {
      list.push({
        id: `cl-${cl.id}`,
        sourceId: cl.id,
        date: normalizeDatePrefix(cl.dueDate),
        kind: 'content',
        kindLabel: 'Clúster Editorial',
        title: cl.pillarTitle,
        subtitle: `${cl.intentScope} · ${cl.owner}`,
        detail: `Objetivo comercial: ${cl.commercialGoal} (Potencial ${cl.leadPotential}) · Volumen est. ${cl.estimatedVolume.toLocaleString('es-ES')}`,
        statusLabel: cl.status,
        seasonalityTag: 'Todo el año',
        channelLabel: cl.intentScope,
        recommendedTopic: cl.pillarTitle,
      });
    }

    // 2b. Artículos programados / pendientes
    for (const art of project.articles || []) {
      const date = normalizeDatePrefix(art.scheduledFor || '2026-11-24');
      list.push({
        id: `art-${art.id}`,
        sourceId: art.id,
        date,
        kind: 'content',
        kindLabel: 'Artículo SEO/GEO',
        title: art.title,
        subtitle: `${art.intentType} · ${art.authorHuman}`,
        detail: art.metaDescription,
        statusLabel: art.status,
        seasonalityTag: 'Todo el año',
        channelLabel: 'Blog / Web',
      });
    }

    // 2c. Adaptaciones sociales programadas
    for (const post of project.socialPosts || []) {
      list.push({
        id: `soc-${post.id}`,
        sourceId: post.id,
        date: normalizeDatePrefix(post.scheduledDate),
        kind: 'content',
        kindLabel: `Red Social · ${post.channel}`,
        title: `${post.channel}: ${post.format}`,
        subtitle: `Programado ${post.scheduledDate}`,
        detail: post.copy,
        statusLabel: post.status,
        seasonalityTag: 'Todo el año',
        channelLabel: post.channel,
      });
    }

    // 3. Campañas Paid Media (Meta Ads, TikTok, YouTube)
    for (const camp of project.campaigns || []) {
      list.push({
        id: `camp-${camp.id}`,
        sourceId: camp.id,
        date: normalizeDatePrefix(camp.createdAt),
        kind: 'paid',
        kindLabel: `Campaña ${camp.channel}`,
        title: camp.title,
        subtitle: `${camp.objective} · ${camp.budgetEurMonth} €/mes`,
        detail: `CPs Geo-Grid: ${camp.targetPostalCodes.join(', ')} · Hook: “${camp.hook3s}”`,
        statusLabel: camp.status,
        seasonalityTag: 'Campaña Comercial / Festivo',
        channelLabel: camp.channel,
      });
    }

    // 4. Alertas proactivas del sistema (clima, stock, calendario)
    for (const alt of project.proactiveAlerts || []) {
      if (alt.status === 'Descartada') continue;
      const cat = alt.relatedCatalogId ? catalogById.get(alt.relatedCatalogId) : undefined;
      const inferredSeasonality: SeasonalAction['seasonalityTag'] =
        alt.triggerType === 'Clima'
          ? project.weather.temperatureC >= 28 || project.weather.scenarioMode === 'heat'
            ? 'Calor / Verano'
            : 'Lluvia / Frío'
          : alt.triggerType === 'Calendario'
            ? 'Campaña Comercial / Festivo'
            : cat?.seasonality === 'Lluvia / Frío' || cat?.seasonality === 'Calor / Verano'
              ? cat.seasonality
              : 'Sectorial';

      list.push({
        id: `alt-${alt.id}`,
        sourceId: alt.id,
        date: normalizeDatePrefix(alt.createdAt),
        kind: 'alert',
        kindLabel: `Alerta ${alt.triggerType}`,
        title: alt.title,
        subtitle: `Severidad ${alt.severity} · Canal sugerido ${alt.recommendedChannel}`,
        detail: alt.detail,
        statusLabel: alt.status,
        seasonalityTag: inferredSeasonality,
        channelLabel: alt.recommendedChannel,
        linkedCatalogName: cat?.name,
        rawAlertId: alt.id,
        recommendedTopic: alt.suggestedTopic,
        recommendedPaidChannel:
          alt.recommendedChannel === 'TikTok' || alt.recommendedChannel === 'YouTube'
            ? alt.recommendedChannel
            : 'Meta Ads',
      });
    }

    // 5. Acciones estacionales programadas por el usuario
    for (const act of project.seasonalActions || []) {
      const cat = act.linkedCatalogId ? catalogById.get(act.linkedCatalogId) : undefined;
      list.push({
        id: `act-${act.id}`,
        sourceId: act.id,
        date: normalizeDatePrefix(act.scheduledDate),
        kind: 'action',
        kindLabel: `Acción · ${act.actionType}`,
        title: act.title,
        subtitle: `${act.seasonalityTag} · ${act.owner}`,
        detail: act.notes || `Canal: ${act.channel}`,
        statusLabel: act.status,
        seasonalityTag: act.seasonalityTag,
        channelLabel: act.channel,
        linkedCatalogName: cat?.name,
        rawAction: act,
        recommendedTopic: act.title,
      });
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [project, catalogById]);

  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (layerFilter !== 'all' && item.kind !== layerFilter) return false;
      if (seasonalityFilter !== 'all' && item.seasonalityTag !== seasonalityFilter) return false;
      return true;
    });
  }, [unifiedItems, layerFilter, seasonalityFilter]);

  const currentMonthPrefix = `${currentYear}-${pad2(currentMonth + 1)}`;

  const monthItems = useMemo(
    () => filteredItems.filter((i) => i.date.startsWith(currentMonthPrefix)),
    [filteredItems, currentMonthPrefix]
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, UnifiedCalendarItem[]>();
    for (const item of filteredItems) {
      const arr = map.get(item.date) || [];
      arr.push(item);
      map.set(item.date, arr);
    }
    return map;
  }, [filteredItems]);

  const selectedDayItems = itemsByDate.get(selectedDate) || [];

  // Calcular matriz mensual (Lunes a Domingo)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const jsWeekday = firstDay.getDay(); // 0=Dom..6=Sáb
    const offsetMonday = jsWeekday === 0 ? 6 : jsWeekday - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells: Array<{ iso: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < offsetMonday; i++) {
      cells.push({ iso: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: toIsoDate(currentYear, currentMonth, d), dayNum: d });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, dayNum: null });
    }
    return cells;
  }, [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const openActionModal = (opts?: {
    date?: string;
    title?: string;
    seasonality?: SeasonalAction['seasonalityTag'];
    actionType?: SeasonalAction['actionType'];
    channel?: SeasonalAction['channel'];
    linkedEventId?: string;
    linkedAlertId?: string;
    linkedCatalogId?: string;
    notes?: string;
  }) => {
    setModalTab('action');
    setActDate(opts?.date || selectedDate || TODAY_ISO);
    setActTitle(opts?.title || '');
    setActSeasonality(opts?.seasonality || 'Campaña Comercial / Festivo');
    setActType(opts?.actionType || 'Artículo SEO/GEO');
    setActChannel(opts?.channel || 'Blog / Web');
    setActLinkedEventId(opts?.linkedEventId || '');
    setActLinkedAlertId(opts?.linkedAlertId || '');
    setActLinkedCatalogId(opts?.linkedCatalogId || project.catalog[0]?.id || '');
    setActNotes(opts?.notes || '');
    setModalOpen(true);
  };

  const openEventModal = (date?: string) => {
    setModalTab('event');
    setEvDate(date || selectedDate || TODAY_ISO);
    setEvTitle('');
    setEvAction('');
    setModalOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;
    setError(null);
    setFeedback(null);
    setBusyKey('save-action');
    try {
      await onCreateAction({
        title: actTitle.trim(),
        scheduledDate: actDate,
        seasonalityTag: actSeasonality,
        actionType: actType,
        channel: actChannel,
        linkedEventId: actLinkedEventId || undefined,
        linkedAlertId: actLinkedAlertId || undefined,
        linkedCatalogId: actLinkedCatalogId || undefined,
        notes: actNotes.trim(),
        owner: actOwner.trim() || 'Equipo Editorial',
      });
      setSelectedDate(actDate);
      const [yStr, mStr] = actDate.split('-');
      if (yStr && mStr) {
        setCurrentYear(Number(yStr));
        setCurrentMonth(Number(mStr) - 1);
      }
      setModalOpen(false);
      setFeedback(`Acción estacional programada para el ${actDate}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error programando la acción.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    setError(null);
    setFeedback(null);
    setBusyKey('save-event');
    try {
      await onAddEvent({
        date: evDate,
        title: evTitle.trim(),
        scope: evScope,
        commercialPriority: evPriority,
        linkedCatalogIds: evCatalogId ? [evCatalogId] : [],
        recommendedAction: evAction.trim() || undefined,
      });
      setSelectedDate(evDate);
      const [yStr, mStr] = evDate.split('-');
      if (yStr && mStr) {
        setCurrentYear(Number(yStr));
        setCurrentMonth(Number(mStr) - 1);
      }
      setModalOpen(false);
      setFeedback(`Fecha clave añadida al calendario comercial (${evDate}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando la fecha comercial.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleQuickArticle = async (itemId: string, topic: string) => {
    setError(null);
    setFeedback(null);
    setBusyKey(`art-${itemId}`);
    try {
      await onGenerateArticle({ topic, intentType: 'GEO Conversacional' });
      setFeedback(
        'Borrador SEO/GEO generado para revisión humana en Estrategia y Contenido.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el borrador.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleQuickCampaign = async (
    itemId: string,
    topic: string,
    channel: MediaCampaign['channel'],
    alertId?: string
  ) => {
    setError(null);
    setFeedback(null);
    setBusyKey(`camp-${itemId}`);
    try {
      await onGenerateCampaign({
        channel,
        topic,
        budgetEurMonth: 450,
        objective: 'Leads locales',
        alertId,
      });
      setFeedback(`Borrador de campaña ${channel} creado en Campañas y Avisos.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la campaña.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleActionStatusChange = async (
    actionId: string,
    status: SeasonalAction['status']
  ) => {
    setError(null);
    setBusyKey(`act-st-${actionId}`);
    try {
      await onUpdateAction(actionId, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando estado.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleActionDateChange = async (actionId: string, scheduledDate: string) => {
    if (!scheduledDate) return;
    setError(null);
    setBusyKey(`act-dt-${actionId}`);
    try {
      await onUpdateAction(actionId, { scheduledDate });
      setSelectedDate(scheduledDate);
      setFeedback(`Acción reprogramada al ${scheduledDate}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reprogramando fecha.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleActionRemove = async (actionId: string) => {
    setError(null);
    setBusyKey(`act-del-${actionId}`);
    try {
      await onDeleteAction(actionId);
      setFeedback('Acción estacional eliminada del calendario.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando acción.');
    } finally {
      setBusyKey(null);
    }
  };

  const kindColorText = (kind: LayerKind): string => {
    switch (kind) {
      case 'commercial':
        return 'text-blue-700';
      case 'content':
        return 'text-emerald-700';
      case 'paid':
        return 'text-slate-800';
      case 'alert':
        return 'text-rose-700';
      case 'action':
        return 'text-amber-700';
    }
  };

  const kindCellTone = (kind: LayerKind): string => {
    switch (kind) {
      case 'commercial':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'content':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'paid':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'alert':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'action':
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  const commercialMonthCount = unifiedItems.filter(
    (i) => i.kind === 'commercial' && i.date.startsWith(currentMonthPrefix)
  ).length;
  const contentMonthCount = unifiedItems.filter(
    (i) => i.kind === 'content' && i.date.startsWith(currentMonthPrefix)
  ).length;
  const activeAlertsCount = (project.proactiveAlerts || []).filter(
    (a) => a.status === 'Activa'
  ).length;
  const scheduledActionsCount = (project.seasonalActions || []).filter(
    (a) => a.status === 'Programada' || a.status === 'En curso'
  ).length;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Festivos y eventos sectoriales · Campañas de contenido · Alertas del sistema · Estacionalidad
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Calendario Estratégico
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vista mensual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cronología ({monthItems.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => openActionModal({ date: selectedDate })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Programar acción</span>
          </button>
        </div>
      </div>

      {/* Tira KPI de 4 columnas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Fechas comerciales ({MONTH_NAMES_ES[currentMonth]})</span>
            <CalendarDays className="h-4 w-4 text-blue-700" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {commercialMonthCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Festivos nacionales, locales y sectoriales
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Contenidos y redes ({MONTH_NAMES_ES[currentMonth]})</span>
            <FileEdit className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {contentMonthCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Clústeres SEO/GEO, artículos y cola social
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Alertas activas conectadas</span>
            <BellRing className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {activeAlertsCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Clima ({project.weather.temperatureC.toFixed(1)} °C) · Stock · Calendario
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Acciones estacionales activas</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {scheduledActionsCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Programadas o en curso por estacionalidad
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {feedback && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Cerrar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Navegación de Mes y Filtros por Capa / Estacionalidad */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Mes anterior"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-slate-900">
            {MONTH_NAMES_ES[currentMonth]} {currentYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Mes siguiente"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(10);
              setSelectedDate(TODAY_ISO);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            Hoy
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'Todo' },
              { id: 'commercial', label: 'Festivos y Eventos' },
              { id: 'content', label: 'Contenidos' },
              { id: 'paid', label: 'Campañas Paid' },
              { id: 'alert', label: 'Alertas' },
              { id: 'action', label: 'Programadas' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setLayerFilter(f.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                layerFilter === f.id
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={seasonalityFilter}
            onChange={(e) => setSeasonalityFilter(e.target.value)}
            aria-label="Filtrar por estacionalidad"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
          >
            <option value="all">Todas las estacionalidades</option>
            <option value="Campaña Comercial / Festivo">Campaña Comercial / Festivo</option>
            <option value="Lluvia / Frío">Lluvia / Frío</option>
            <option value="Calor / Verano">Calor / Verano</option>
            <option value="Sectorial">Sectorial</option>
            <option value="Todo el año">Todo el año</option>
          </select>

          <button
            type="button"
            onClick={() => openEventModal(selectedDate)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="h-3.5 w-3.5 text-blue-700" />
            <span>Añadir fecha clave</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal: Rejilla Mensual / Cronología + Inspector del Día */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Columna Izquierda: Calendario o Cronología */}
        <div className="lg:col-span-8">
          {viewMode === 'month' ? (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {WEEKDAYS_ES.map((day) => (
                  <div
                    key={day}
                    className="px-2 py-2.5 text-center text-[11px] font-semibold text-slate-600"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {calendarCells.map((cell, idx) => {
                  if (!cell.iso || cell.dayNum === null) {
                    return <div key={`empty-${idx}`} className="min-h-28 bg-slate-50/50" />;
                  }
                  const dayItems = itemsByDate.get(cell.iso) || [];
                  const isSelected = cell.iso === selectedDate;
                  const isToday = cell.iso === TODAY_ISO;

                  return (
                    <div
                      key={cell.iso}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDate(cell.iso!)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDate(cell.iso!);
                        }
                      }}
                      className={`min-h-28 p-2 text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        isSelected ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            isSelected
                              ? 'font-bold text-blue-700'
                              : isToday
                                ? 'font-semibold text-slate-900 underline decoration-blue-700 decoration-2 underline-offset-4'
                                : 'font-medium text-slate-700'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-semibold text-blue-700">Hoy</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            title={`${item.kindLabel}: ${item.title}`}
                            className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-medium ${kindCellTone(
                              item.kind
                            )}`}
                          >
                            {item.title}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <span className="block font-mono text-[10px] font-medium text-slate-500 tabular-nums">
                            +{dayItems.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Cronología Integrada · {MONTH_NAMES_ES[currentMonth]} {currentYear}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Eventos comerciales, contenidos, alertas y acciones estacionales ordenados por
                    fecha
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {monthItems.length} registros
                </span>
              </div>

              {monthItems.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    No hay eventos, alertas ni acciones programadas en{' '}
                    {MONTH_NAMES_ES[currentMonth]} con los filtros actuales.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      openActionModal({
                        date: toIsoDate(currentYear, currentMonth, 10),
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Programar acción en {MONTH_NAMES_ES[currentMonth]}</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {monthItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedDate(item.date)}
                      className={`px-6 py-4 transition-colors cursor-pointer ${
                        selectedDate === item.date ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900 tabular-nums">
                            {item.date}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className={`font-semibold ${kindColorText(item.kind)}`}>
                            {item.kindLabel}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500">{item.seasonalityTag}</span>
                        </div>
                        <span className="font-medium text-slate-700">{item.statusLabel}</span>
                      </div>

                      <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                      {item.linkedCatalogName && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Catálogo vinculado: {item.linkedCatalogName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna Derecha: Inspector del Día Seleccionado + Alertas de Estacionalidad */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Agenda del día seleccionado</p>
                <h2 className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {selectedDate}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => openActionModal({ date: selectedDate })}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Programar aquí</span>
              </button>
            </div>

            {/* Contexto meteorológico de sede */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <CloudRain className="h-4 w-4 text-blue-700 shrink-0" />
                <span>
                  {project.weather.city}: {project.weather.conditionLabel}
                </span>
              </div>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {project.weather.temperatureC.toFixed(1)} °C
              </span>
            </div>

            {selectedDayItems.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-slate-500">
                  No hay hitos ni campañas programadas para el {selectedDate}.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openActionModal({ date: selectedDate })}
                    className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                  >
                    Programar acción estacional
                  </button>
                  <button
                    type="button"
                    onClick={() => openEventModal(selectedDate)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Añadir festivo / evento
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {selectedDayItems.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className={`font-semibold ${kindColorText(item.kind)}`}>
                        {item.kindLabel}
                      </span>
                      <span className="text-slate-500">{item.statusLabel}</span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.subtitle} · {item.seasonalityTag}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {item.detail}
                      </p>
                      {item.linkedCatalogName && (
                        <p className="mt-1 text-[11px] font-medium text-slate-700">
                          Catálogo: {item.linkedCatalogName}
                        </p>
                      )}
                    </div>

                    {/* Acciones directas según tipo de elemento */}
                    {item.kind === 'action' && item.rawAction && (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.rawAction.status === 'Programada' && (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() =>
                                handleActionStatusChange(item.sourceId, 'En curso')
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Play className="h-3 w-3 text-blue-700" />
                              <span>Iniciar</span>
                            </button>
                          )}
                          {item.rawAction.status !== 'Completada' && (
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() =>
                                handleActionStatusChange(item.sourceId, 'Completada')
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Completar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => handleActionRemove(item.sourceId)}
                            aria-label="Eliminar acción"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Eliminar</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <label
                            htmlFor={`resched-${item.sourceId}`}
                            className="text-slate-500 whitespace-nowrap"
                          >
                            Reprogramar:
                          </label>
                          <input
                            id={`resched-${item.sourceId}`}
                            type="date"
                            value={item.rawAction.scheduledDate}
                            onChange={(e) =>
                              handleActionDateChange(item.sourceId, e.target.value)
                            }
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-800 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {(item.kind === 'commercial' || item.kind === 'alert') && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            openActionModal({
                              date: item.date,
                              title: `Acción: ${item.title}`,
                              seasonality: item.seasonalityTag,
                              linkedEventId: item.rawEvent?.id,
                              linkedAlertId: item.rawAlertId,
                              linkedCatalogId: item.rawEvent?.linkedCatalogIds[0],
                              notes: item.detail,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <CalendarPlus className="h-3 w-3 text-blue-700" />
                          <span>Programar acción</span>
                        </button>

                        {item.recommendedTopic && (
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() =>
                              handleQuickArticle(item.id, item.recommendedTopic!)
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
                          >
                            {busyKey === `art-${item.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            <span>Borrador SEO/GEO</span>
                          </button>
                        )}

                        {item.recommendedTopic && item.recommendedPaidChannel && (
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() =>
                              handleQuickCampaign(
                                item.id,
                                item.recommendedTopic!,
                                item.recommendedPaidChannel!,
                                item.rawAlertId
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                          >
                            {busyKey === `camp-${item.id}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Megaphone className="h-3 w-3" />
                            )}
                            <span>Campaña {item.recommendedPaidChannel}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {item.kind === 'content' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => onNavigate('content')}
                          className="text-[11px] font-medium text-blue-700 hover:text-blue-800"
                        >
                          Abrir en Estudio Editorial →
                        </button>
                      </div>
                    )}

                    {item.kind === 'paid' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => onNavigate('campaigns')}
                          className="text-[11px] font-medium text-blue-700 hover:text-blue-800"
                        >
                          Revisar guion en Campañas →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radar de Alertas del Sistema y Fechas Próximas sin Acción Asignada */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>Oportunidades Estacionales y Alertas</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('campaigns')}
                className="text-[11px] font-medium text-blue-700 hover:text-blue-800"
              >
                Motor clima/stock →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {(project.proactiveAlerts || [])
                .filter((a) => a.status === 'Activa')
                .slice(0, 3)
                .map((alt) => (
                  <div key={alt.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-500">
                        {alt.triggerType} · {alt.recommendedChannel}
                      </span>
                      <span
                        className={
                          alt.severity === 'Crítica'
                            ? 'font-semibold text-rose-700'
                            : 'font-semibold text-emerald-700'
                        }
                      >
                        {alt.severity}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-900">{alt.title}</p>
                    <button
                      type="button"
                      onClick={() =>
                        openActionModal({
                          date: selectedDate,
                          title: alt.suggestedTopic,
                          seasonality:
                            alt.triggerType === 'Clima'
                              ? 'Lluvia / Frío'
                              : 'Campaña Comercial / Festivo',
                          actionType:
                            alt.recommendedChannel === 'Google Business Profile'
                              ? 'Ajuste Stock / Oferta'
                              : 'Campaña Meta/TikTok/YT',
                          channel:
                            alt.recommendedChannel === 'TikTok' ||
                            alt.recommendedChannel === 'YouTube' ||
                            alt.recommendedChannel === 'Meta Ads' ||
                            alt.recommendedChannel === 'Google Business Profile'
                              ? alt.recommendedChannel
                              : 'Meta Ads',
                          linkedAlertId: alt.id,
                          linkedCatalogId: alt.relatedCatalogId,
                          notes: alt.detail,
                        })
                      }
                      className="text-[11px] font-medium text-blue-700 hover:text-blue-800"
                    >
                      Convertir en acción programada →
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Programar Acción Estacional o Añadir Festivo/Hito Comercial */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Programar en Calendario Estratégico"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setModalTab('action')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    modalTab === 'action'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Programar acción estacional
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('event')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    modalTab === 'event'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Añadir festivo / evento sectorial
                </button>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar modal"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalTab === 'action' ? (
              <form onSubmit={handleSaveAction} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Título de la acción programada
                  </label>
                  <input
                    type="text"
                    required
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder="Ej: Publicar guía Black Friday + oferta en distritos clave"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Fecha programada
                    </label>
                    <input
                      type="date"
                      required
                      value={actDate}
                      onChange={(e) => setActDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Estacionalidad
                    </label>
                    <select
                      value={actSeasonality}
                      onChange={(e) =>
                        setActSeasonality(
                          e.target.value as SeasonalAction['seasonalityTag']
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="Campaña Comercial / Festivo">
                        Campaña Comercial / Festivo
                      </option>
                      <option value="Lluvia / Frío">Lluvia / Frío</option>
                      <option value="Calor / Verano">Calor / Verano</option>
                      <option value="Sectorial">Sectorial</option>
                      <option value="Todo el año">Todo el año</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tipo de acción
                    </label>
                    <select
                      value={actType}
                      onChange={(e) =>
                        setActType(e.target.value as SeasonalAction['actionType'])
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="Artículo SEO/GEO">Artículo SEO/GEO</option>
                      <option value="Campaña Meta/TikTok/YT">Campaña Meta/TikTok/YT</option>
                      <option value="Publicación GBP / Redes">Publicación GBP / Redes</option>
                      <option value="Ajuste Stock / Oferta">Ajuste Stock / Oferta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Canal principal
                    </label>
                    <select
                      value={actChannel}
                      onChange={(e) =>
                        setActChannel(e.target.value as SeasonalAction['channel'])
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="Blog / Web">Blog / Web</option>
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="TikTok">TikTok</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Google Business Profile">Google Business Profile</option>
                      <option value="LinkedIn / Instagram">LinkedIn / Instagram</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vincular a fecha clave (opcional)
                    </label>
                    <select
                      value={actLinkedEventId}
                      onChange={(e) => setActLinkedEventId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="">Sin evento vinculado</option>
                      {project.calendarEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.date} · {ev.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vincular a referencia catálogo
                    </label>
                    <select
                      value={actLinkedCatalogId}
                      onChange={(e) => setActLinkedCatalogId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="">Sin producto vinculado</option>
                      {project.catalog.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.stockUnits} uds)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vincular alerta del sistema (opcional)
                    </label>
                    <select
                      value={actLinkedAlertId}
                      onChange={(e) => setActLinkedAlertId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="">Ninguna alerta</option>
                      {project.proactiveAlerts
                        .filter((a) => a.status === 'Activa')
                        .map((alt) => (
                          <option key={alt.id} value={alt.id}>
                            [{alt.triggerType}] {alt.title}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Responsable
                    </label>
                    <input
                      type="text"
                      value={actOwner}
                      onChange={(e) => setActOwner(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notas de ejecución y estacionalidad
                  </label>
                  <textarea
                    rows={2}
                    value={actNotes}
                    onChange={(e) => setActNotes(e.target.value)}
                    placeholder="Indicaciones editoriales, códigos postales objetivo o umbral meteorológico..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busyKey === 'save-action'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {busyKey === 'save-action' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span>Guardar programación</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre del festivo o evento sectorial
                  </label>
                  <input
                    type="text"
                    required
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="Ej: Feria Pyme Digitalización · Jornada Local"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={evDate}
                      onChange={(e) => setEvDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ámbito</label>
                    <select
                      value={evScope}
                      onChange={(e) => setEvScope(e.target.value as CalendarEvent['scope'])}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="Nacional">Nacional</option>
                      <option value="Local Sede">Local Sede</option>
                      <option value="Sectorial">Sectorial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={evPriority}
                      onChange={(e) =>
                        setEvPriority(e.target.value as CalendarEvent['commercialPriority'])
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Producto / Servicio principal asociado
                  </label>
                  <select
                    value={evCatalogId}
                    onChange={(e) => setEvCatalogId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  >
                    <option value="">General del negocio</option>
                    {project.catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Acción comercial recomendada
                  </label>
                  <textarea
                    rows={2}
                    value={evAction}
                    onChange={(e) => setEvAction(e.target.value)}
                    placeholder="Ej: Lanzar vídeo corto en TikTok y publicar guía comparativa con esquema FAQPage."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busyKey === 'save-event'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {busyKey === 'save-event' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CalendarPlus className="h-3.5 w-3.5" />
                    )}
                    <span>Guardar fecha clave</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
