import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  CreditCard,
  Download,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { NavSection, ProjectWorkspace } from '../types';

interface Props {
  project: ProjectWorkspace;
  onNavigate: (section: NavSection) => void;
  onOpenAdminClient?: () => void;
}

export const ExecutiveDashboard: React.FC<Props> = ({
  project,
  onNavigate,
  onOpenAdminClient,
}) => {
  const [range, setRange] = useState<'3m' | '6m'>('6m');
  const [postalFilter, setPostalFilter] = useState('');

  const timeline = range === '3m' ? project.roiTimeline.slice(-3) : project.roiTimeline;
  const maxTraffic = Math.max(...timeline.map((p) => p.organicTraffic), 1);
  const maxLeads = Math.max(...timeline.map((p) => p.totalLeads), 1);

  const primaryGrid = project.geoKeywords[0];
  const filteredPostal = project.postalMetrics.filter(
    (z) =>
      z.postalCode.includes(postalFilter.trim()) ||
      z.district.toLowerCase().includes(postalFilter.trim().toLowerCase())
  );

  const handleExportCsv = () => {
    const headers = [
      'Codigo Postal',
      'Distrito',
      'Impresiones',
      'Clics',
      'Llamadas',
      'WhatsApp',
      'Como Llegar',
      'Leads Formulario',
      'Posicion Media',
      'Tasa Conversion %',
    ];
    const rows = project.postalMetrics.map((z) => [
      z.postalCode,
      `"${z.district}"`,
      z.impressions,
      z.clicks,
      z.calls,
      z.whatsappClicks,
      z.directionRequests,
      z.formLeads,
      z.avgPosition,
      z.conversionRate,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.profile.companyName.toLowerCase().replace(/\s+/g, '-')}-rendimiento-local.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingApprovals =
    project.articles.filter((a) => a.status === 'Pendiente Aprobación').length +
    project.reviews.filter((r) => r.replyStatus === 'Pendiente Aprobación').length +
    project.socialPosts.filter((s) => s.status === 'Pendiente Aprobación').length;

  const enabledModules = project.enabledModules || ['reputacion_local', 'seo_geo', 'campanas'];
  const hasReputation = enabledModules.includes('reputacion_local');
  const hasSeoGeo = enabledModules.includes('seo_geo');
  const hasCampaigns = enabledModules.includes('campanas');

  const activeAlertsCount = (project.proactiveAlerts || []).filter(
    (a) => a.status === 'Activa'
  ).length;

  const gbpScore = project.gbpAudit?.completenessScore ?? 0;
  const openIncidentsCount = (project.reviewIncidents || []).filter(
    (c) => c.status !== 'Resuelta'
  ).length;
  const directories = project.directoryListings || [];
  const syncedDirectories = directories.filter((d) => d.status === 'Sincronizado').length;
  const napConsistencyPct = directories.length
    ? Math.round((syncedDirectories / directories.length) * 100)
    : 100;
  const invitationsSentCount = (project.reviewInvitations || []).length;
  const invitationsPublishedCount = (project.reviewInvitations || []).filter(
    (i) => i.status === 'Reseña Publicada'
  ).length;

  const cm = project.clientMaster;
  const pendingPayments = (cm?.payments || []).filter(
    (p) => p.status === 'Pendiente' || p.status === 'Vencido'
  );
  const pendingPaymentsTotal = pendingPayments.reduce((sum, p) => sum + p.amountEur, 0);
  const nextPendingDue = [...pendingPayments]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const activeSubsMrr = (cm?.subscriptions || [])
    .filter((s) => s.status === 'Activa')
    .reduce((sum, s) => {
      if (s.billingCycle === 'Anual') return sum + s.amountEur / 12;
      if (s.billingCycle === 'Trimestral') return sum + s.amountEur / 3;
      return sum + s.amountEur;
    }, 0);

  return (
    <div className="space-y-6">
      {/* Cabecera de contexto de negocio */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {project.profile.sector} · {project.profile.primaryCity}, {project.profile.country} · Plan{' '}
            {project.plan}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Rendimiento Geolocalizado y Retorno de Negocio
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasCampaigns && (
            <button
              type="button"
              onClick={() => onNavigate('campaigns')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <span>Avisos proactivos:</span>
              <span className="font-mono font-semibold text-blue-700 tabular-nums">
                {activeAlertsCount}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate(hasSeoGeo ? 'content' : 'reputation')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <span>Aprobaciones pendientes:</span>
            <span className="font-mono font-semibold text-amber-700 tabular-nums">
              {pendingApprovals}
            </span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tira KPI de 4 columnas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Leads locales y web (mes)</span>
            <PhoneCall className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {project.kpis.leadsMonth}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 tabular-nums">
              <ArrowUpRight className="h-3.5 w-3.5" />+{project.kpis.leadsDeltaPct}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Incluye {project.kpis.gbpCallsAndWhatsapp} llamadas y WhatsApp GBP
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Coste por Lead y ROI est.</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {project.kpis.cplEur.toFixed(1)} €
            </span>
            <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
              ROI {project.kpis.estimatedRoiPct}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Atribución directa sin métricas de vanidad</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Posición media Geo-Grid</span>
            <MapPin className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              #{project.kpis.avgGeoGridPos.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-blue-700 tabular-nums">
              Top 3 en {primaryGrid?.top3Pct ?? 0}% nodos
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Radio {primaryGrid?.radiusKm ?? 5} km · {project.profile.primaryCity}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cuota de voz GEO (IAs)</span>
            <Sparkles className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {project.kpis.aiShareOfVoicePct}%
            </span>
            <span className="text-xs font-medium text-slate-600 tabular-nums">
              Salud técnica {project.kpis.technicalHealthPct}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">ChatGPT · Perplexity · Gemini · Claude</p>
        </div>
      </div>

      {/* Tira Ficha Única de Cliente Confia360 y Situación de Cuenta */}
      {cm && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-700 shrink-0" />
              <span className="font-semibold text-slate-900">{cm.legalName}</span>
              <span className="font-mono text-slate-500">{cm.taxId}</span>
            </div>
            <div>
              <span className="text-slate-500">Estado: </span>
              <span
                className={`font-semibold ${
                  cm.accountStatus === 'Activo'
                    ? 'text-emerald-700'
                    : cm.accountStatus === 'Riesgo de Impago'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                }`}
              >
                {cm.accountStatus}
              </span>
            </div>
            <div className="tabular-nums">
              <span className="text-slate-500">
                {cm.specialClientAmountEur !== null && cm.specialClientAmountEur !== undefined
                  ? 'Tarifa especial cliente: '
                  : 'Cuota activa: '}
              </span>
              <span className="font-mono font-semibold text-slate-900">
                {(cm.specialClientAmountEur !== null && cm.specialClientAmountEur !== undefined
                  ? cm.specialClientAmountEur
                  : activeSubsMrr
                ).toFixed(2)}{' '}
                €/mes
              </span>
            </div>
            <div className="flex items-center gap-1.5 tabular-nums">
              <CreditCard
                className={`h-3.5 w-3.5 shrink-0 ${
                  pendingPayments.length > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              />
              {pendingPayments.length > 0 ? (
                <span className="font-medium text-amber-800">
                  {pendingPayments.length} pago(s) pendiente(s):{' '}
                  <strong className="font-mono">{pendingPaymentsTotal.toFixed(2)} €</strong>
                  {nextPendingDue ? ` · Vence ${nextPendingDue.dueDate}` : ''}
                </span>
              ) : (
                <span className="font-medium text-emerald-700">
                  Facturación y pagos al día
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => (onOpenAdminClient ? onOpenAdminClient() : onNavigate('onboarding'))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            <span>Gestionar Ficha en Administración (Asexia) →</span>
          </button>
        </div>
      )}

      {/* Resumen ReputaciónLocal y Directorios NAP */}
      {hasReputation && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-blue-700 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Confia360 ReputaciónLocal y Coherencia NAP
                </h2>
                <p className="text-xs text-slate-500">
                  Estado operativo de Google Business Profile, invitaciones sin review gating y directorios
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reputation')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <span>Abrir ReputaciónLocal y GBP →</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
              <div>
                <span className="text-slate-500">Completitud ficha GBP</span>
                <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {gbpScore}%
                </p>
              </div>
              <ShieldCheck
                className={`h-4 w-4 shrink-0 ${
                  gbpScore >= 85 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
              <div>
                <span className="text-slate-500">Incidencias críticas abiertas</span>
                <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {openIncidentsCount}
                </p>
              </div>
              <AlertTriangle
                className={`h-4 w-4 shrink-0 ${
                  openIncidentsCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
              <div>
                <span className="text-slate-500">Coherencia NAP directorios</span>
                <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {napConsistencyPct}%{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({syncedDirectories}/{directories.length})
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 border border-slate-100">
              <div>
                <span className="text-slate-500">Invitaciones enviadas</span>
                <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {invitationsSentCount}{' '}
                  <span className="text-xs font-normal text-emerald-700">
                    ({invitationsPublishedCount} reseñas)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bloque principal: Gráfico ROI + Mini Geo-Grid en vivo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Evolución de Leads, Tráfico Orgánico y Menciones IA
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Comparativa mensual de captación comercial frente a visibilidad en buscadores
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setRange('3m')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  range === '3m'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3 meses
              </button>
              <button
                type="button"
                onClick={() => setRange('6m')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  range === '6m'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                6 meses
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-700" />
                Leads cualificados
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-300" />
                Tráfico orgánico
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                Menciones en IA
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 pt-2">
              {timeline.map((point) => {
                const trafficH = Math.max(12, Math.round((point.organicTraffic / maxTraffic) * 140));
                const leadsH = Math.max(12, Math.round((point.totalLeads / maxLeads) * 140));
                const aiH = Math.max(8, Math.round((point.aiMentions / Math.max(maxLeads, 1)) * 140));
                return (
                  <div key={point.period} className="flex flex-col items-center">
                    <div className="flex h-40 w-full items-end justify-center gap-1.5 rounded-lg bg-slate-50 px-2 pb-2 pt-3 border border-slate-100">
                      <div
                        className="w-3 rounded-t bg-slate-300 transition-all"
                        style={{ height: `${trafficH}px` }}
                        title={`Tráfico: ${point.organicTraffic}`}
                      />
                      <div
                        className="w-3 rounded-t bg-blue-700 transition-all"
                        style={{ height: `${leadsH}px` }}
                        title={`Leads: ${point.totalLeads}`}
                      />
                      <div
                        className="w-3 rounded-t bg-emerald-600 transition-all"
                        style={{ height: `${aiH}px` }}
                        title={`Menciones IA: ${point.aiMentions}`}
                      />
                    </div>
                    <span className="mt-2 text-xs font-medium text-slate-700">{point.period}</span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {point.totalLeads} leads · {point.cplEur.toFixed(0)}€
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Vista rápida Geo-Grid */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Malla Geo-Grid Activa
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {primaryGrid ? `${primaryGrid.keyword} · ${primaryGrid.sedeName}` : 'Sin malla activa'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('geogrid')}
                className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
              >
                Abrir mapa completo →
              </button>
            </div>

            {primaryGrid && (
              <div className="mt-4">
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {/* Cuadrícula vectorial sutil */}
                  <div
                    className="grid gap-2 relative z-10"
                    style={{
                      gridTemplateColumns: `repeat(${primaryGrid.gridSize}, minmax(0, 1fr))`,
                    }}
                  >
                    {primaryGrid.nodes.slice(0, primaryGrid.gridSize * primaryGrid.gridSize).map((node) => {
                      const tone =
                        node.rank <= 3
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : node.rank <= 10
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-rose-600 text-white border-rose-700';
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => onNavigate('geogrid')}
                          title={`${node.zoneName} (${node.postalCode}): Posición #${node.rank}`}
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs font-semibold tabular-nums transition-transform hover:scale-110 ${tone}`}
                        >
                          {node.rank}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>Top 3 (Verde): {primaryGrid.top3Pct}%</span>
                  <span>Visibilidad local: {primaryGrid.visibilityScore}/100</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">Última auditoría verificada: {project.profile.lastAuditedAt}</span>
            <button
              type="button"
              onClick={() => onNavigate('geo-ai')}
              className="font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Ver citas en IAs →
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de rendimiento geolocalizado por código postal */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Rendimiento Geolocalizado por Código Postal y Distrito
            </h2>
            <p className="text-xs text-slate-500">
              Conversión real en Google Business Profile y formularios locales
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={postalFilter}
              onChange={(e) => setPostalFilter(e.target.value)}
              placeholder="Filtrar por CP o distrito..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">CP / Distrito</th>
                <th className="px-4 py-3 font-medium text-right">Impresiones</th>
                <th className="px-4 py-3 font-medium text-right">Clics web</th>
                <th className="px-4 py-3 font-medium text-right">Llamadas</th>
                <th className="px-4 py-3 font-medium text-right">WhatsApp</th>
                <th className="px-4 py-3 font-medium text-right">Cómo llegar</th>
                <th className="px-4 py-3 font-medium text-right">Leads</th>
                <th className="px-4 py-3 font-medium text-right">Pos. media</th>
                <th className="px-6 py-3 font-medium text-right">Conversión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPostal.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No hay códigos postales que coincidan con "{postalFilter}".
                  </td>
                </tr>
              ) : (
                filteredPostal.map((z) => (
                  <tr key={z.postalCode} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {z.postalCode}
                      </span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-slate-700">{z.district}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {z.impressions.toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {z.clicks.toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 font-medium tabular-nums">
                      {z.calls}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 font-medium tabular-nums">
                      {z.whatsappClicks}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {z.directionRequests}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-blue-700 tabular-nums">
                      {z.formLeads}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          z.avgPosition <= 3
                            ? 'font-semibold text-emerald-700'
                            : 'font-medium text-amber-700'
                        }
                      >
                        #{z.avgPosition.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-slate-700 tabular-nums">
                      <span className="inline-flex items-center gap-0.5">
                        {z.conversionRate.toFixed(1)}%
                        {z.conversionRate >= 10 ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-amber-600" />
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
