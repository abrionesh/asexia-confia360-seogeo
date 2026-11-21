import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Globe,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Settings2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Unlock,
  Webhook,
} from 'lucide-react';
import {
  DEFAULT_REPUTATION_SOURCE_CATALOG,
} from '../data/seedData';
import { ReputationKpiD3Panel } from './ReputationKpiD3Panel';
import {
  ReputationSourcesAdminPanel,
  type CreateReputationSourcePayload,
  type UpdateReputationSourcePayload,
} from './ReputationSourcesAdminPanel';
import type {
  AdminLockStatus,
  GbpLocalPost,
  GbpReview,
  ProjectWorkspace,
  ReputationSourceDefinition,
  ReputationSourcePlatform,
  ReviewAutomationPolicy,
  ReviewIncidentCase,
  ReviewInvitationChannel,
} from '../types';

type ReviewSourceGroupId =
  | 'google_maps'
  | 'trustpilot'
  | 'tripadvisor'
  | 'doctoralia'
  | 'habitissimo'
  | 'custom_sources'
  | 'social_negative';

type PlatformFilterValue =
  | 'all'
  | ReviewSourceGroupId
  | ReputationSourcePlatform;

type SentimentFilterValue = 'all' | 'Positivo' | 'Neutro' | 'Crítico';

interface ClassifiedReview {
  review: GbpReview;
  platform: ReputationSourcePlatform;
  groupId: ReviewSourceGroupId;
  groupLabel: string;
  sentiment: 'Positivo' | 'Neutro' | 'Crítico';
  isSocial: boolean;
  isNegativeSocial: boolean;
}

const SOURCE_GROUP_META: Record<
  ReviewSourceGroupId,
  { label: string; shortLabel: string; description: string }
> = {
  google_maps: {
    label: 'Google Maps (Google Business Profile)',
    shortLabel: 'Google Maps',
    description: 'Reseñas verificadas en fichas locales y búsquedas de Maps',
  },
  trustpilot: {
    label: 'Trustpilot',
    shortLabel: 'Trustpilot',
    description: 'Valoraciones de servicio y confianza comercial',
  },
  tripadvisor: {
    label: 'TripAdvisor',
    shortLabel: 'TripAdvisor',
    description: 'Opiniones de experiencias, visitas y atención presencial',
  },
  doctoralia: {
    label: 'Doctoralia',
    shortLabel: 'Doctoralia',
    description: 'Reseñas sectoriales de clínicas, especialistas y salud',
  },
  habitissimo: {
    label: 'Habitissimo',
    shortLabel: 'Habitissimo',
    description: 'Valoraciones de presupuestos y servicios locales',
  },
  custom_sources: {
    label: 'Fuentes Personalizadas Configuradas',
    shortLabel: 'Fuentes Propias',
    description: 'Portales y plataformas añadidas por el administrador',
  },
  social_negative: {
    label: 'Comentarios Negativos en Redes Sociales',
    shortLabel: 'Redes Negativas',
    description: 'Críticas y dudas urgentes en Meta, TikTok y YouTube',
  },
};

function classifyReviewSource(
  rev: GbpReview,
  catalog: ReputationSourceDefinition[] = DEFAULT_REPUTATION_SOURCE_CATALOG
): ClassifiedReview {
  const hint = `${rev.platform || ''} ${rev.sede || ''}`;
  let platform: ReputationSourcePlatform = rev.platform || 'Google Business Profile';

  if (!rev.platform) {
    if (/trustpilot/i.test(hint) || rev.id === 'rev-2') {
      platform = 'Trustpilot';
    } else if (/tripadvisor/i.test(hint)) {
      platform = 'TripAdvisor';
    } else if (/doctoralia/i.test(hint)) {
      platform = 'Doctoralia';
    } else if (/habitissimo/i.test(hint)) {
      platform = 'Habitissimo';
    } else if (/tiktok/i.test(hint)) {
      platform = 'TikTok';
    } else if (/youtube/i.test(hint)) {
      platform = 'YouTube';
    } else if (/meta|instagram|facebook/i.test(hint)) {
      platform = 'Meta (Instagram/Facebook)';
    } else {
      platform = 'Google Business Profile';
    }
  }

  const catalogMatch = catalog.find((c) => c.name === platform);
  const sentiment: 'Positivo' | 'Neutro' | 'Crítico' =
    rev.sentiment || (rev.rating >= 4 ? 'Positivo' : rev.rating === 3 ? 'Neutro' : 'Crítico');

  const isSocial =
    catalogMatch?.category === 'social' ||
    platform === 'Meta (Instagram/Facebook)' ||
    platform === 'TikTok' ||
    platform === 'YouTube' ||
    rev.channelKind === 'Comentario Social';

  let groupId: ReviewSourceGroupId = 'google_maps';
  if (isSocial) {
    groupId = 'social_negative';
  } else if (platform === 'Trustpilot') {
    groupId = 'trustpilot';
  } else if (platform === 'TripAdvisor') {
    groupId = 'tripadvisor';
  } else if (platform === 'Doctoralia') {
    groupId = 'doctoralia';
  } else if (platform === 'Habitissimo') {
    groupId = 'habitissimo';
  } else if (platform !== 'Google Business Profile') {
    groupId = 'custom_sources';
  }

  const isNegativeSocial = isSocial && (sentiment === 'Crítico' || rev.rating <= 3);

  return {
    review: rev,
    platform,
    groupId,
    groupLabel:
      groupId === 'custom_sources' ? String(platform) : SOURCE_GROUP_META[groupId].shortLabel,
    sentiment,
    isSocial,
    isNegativeSocial,
  };
}

interface Props {
  project: ProjectWorkspace;
  adminStatus: AdminLockStatus;
  onAdminUnlock: (username: string, pin: string) => Promise<string>;
  onAdminLock: () => Promise<void>;
  onAdminChangePin: (currentPin: string, newPin: string) => Promise<void>;
  onUpdateReputationSources: (
    enabledSources: ReputationSourcePlatform[],
    tokenOverride?: string
  ) => Promise<void>;
  onCreateReputationSource: (payload: CreateReputationSourcePayload) => Promise<void>;
  onUpdateReputationSourceItem: (
    sourceId: string,
    payload: UpdateReputationSourcePayload
  ) => Promise<void>;
  onDeleteReputationSourceItem: (sourceId: string) => Promise<void>;
  onReviewAction: (
    reviewId: string,
    action: 'regenerate' | 'approve' | 'publish',
    replyText?: string
  ) => Promise<void>;
  onSocialApprove: (postId: string, status: 'Aprobada' | 'Publicada') => Promise<void>;
  onUpdatePolicy: (mode: ReviewAutomationPolicy['mode'], minAutoStars: 4 | 5) => Promise<void>;
  onSimulateReview: (payload: {
    author: string;
    rating: number;
    comment: string;
    platform?: ReputationSourcePlatform;
  }) => Promise<void>;
  onNavigateToAdminConfig?: () => void;
  onToggleChecklist: (itemId: string, status: 'Pendiente' | 'Completado') => Promise<void>;
  onDismissGbpAlert: (acceptChange: boolean) => Promise<void>;
  onOptimizeGbp: () => Promise<void>;
  onUpdateQa: (qaId: string, answer: string, status: 'Pendiente' | 'Publicada') => Promise<void>;
  onCreateGbpPost: (payload: {
    type: GbpLocalPost['type'];
    title: string;
    body: string;
    ctaText: string;
    scheduledDate: string;
  }) => Promise<void>;
  onUpdateGbpPostStatus: (postId: string, status: GbpLocalPost['status']) => Promise<void>;
  onSendInvitation: (payload: {
    customerName: string;
    contact: string;
    serviceName: string;
    channel: ReviewInvitationChannel;
    consentVerified: boolean;
  }) => Promise<void>;
  onTriggerWebhook: (payload: {
    customerName: string;
    contact: string;
    serviceName: string;
    channel: ReviewInvitationChannel;
  }) => Promise<void>;
  onUpdateInvitation: (
    invitationId: string,
    action: 'remind' | 'click_public' | 'published' | 'private_incident' | 'opt_out',
    privateFeedback?: string
  ) => Promise<void>;
  onUpdateIncident: (
    incidentId: string,
    updates: {
      status?: ReviewIncidentCase['status'];
      owner?: string;
      resolutionNotes?: string;
    }
  ) => Promise<void>;
  onAnalyzeIncidentPatterns: () => Promise<void>;
  onAuditDirectories: () => Promise<void>;
  onFixDirectory: (
    directoryId: string,
    action: 'sync_nap' | 'resolve_duplicate' | 'claim'
  ) => Promise<void>;
}

type SubTab =
  | 'kpis'
  | 'gbp'
  | 'invitations'
  | 'reviews'
  | 'directories'
  | 'posts'
  | 'config';

export const ReputationGbpView: React.FC<Props> = ({
  project,
  adminStatus,
  onAdminUnlock,
  onAdminLock,
  onAdminChangePin,
  onUpdateReputationSources,
  onCreateReputationSource,
  onUpdateReputationSourceItem,
  onDeleteReputationSourceItem,
  onReviewAction,
  onSocialApprove,
  onUpdatePolicy,
  onSimulateReview,
  onNavigateToAdminConfig,
  onToggleChecklist,
  onDismissGbpAlert,
  onOptimizeGbp,
  onUpdateQa,
  onCreateGbpPost,
  onUpdateGbpPostStatus,
  onSendInvitation,
  onTriggerWebhook,
  onUpdateInvitation,
  onUpdateIncident,
  onAnalyzeIncidentPatterns,
  onAuditDirectories,
  onFixDirectory,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('gbp');
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({});
  const [editedQaAnswers, setEditedQaAnswers] = useState<Record<string, string>>({});
  const [incidentNotes, setIncidentNotes] = useState<Record<string, string>>({});
  const [incidentOwners, setIncidentOwners] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Filters
  const [chkFilter, setChkFilter] = useState<'all' | 'Pendiente' | 'Completado'>('all');
  const [invFilter, setInvFilter] = useState<string>('all');
  const [incFilter, setIncFilter] = useState<'open' | 'all'>('open');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilterValue>('all');
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilterValue>('all');
  const [reviewLayoutMode, setReviewLayoutMode] = useState<'grouped' | 'list'>('grouped');
  const [dirFilter, setDirFilter] = useState<'all' | 'issues' | 'synced'>('all');

  // Forms
  const [simAuthor, setSimAuthor] = useState('Carlos Navarro');
  const [simRating, setSimRating] = useState<number>(2);
  const [simPlatform, setSimPlatform] = useState<ReputationSourcePlatform>('Google Business Profile');
  const [simComment, setSimComment] = useState('');

  const [invName, setInvName] = useState('');
  const [invContact, setInvContact] = useState('');
  const [invService, setInvService] = useState(project.profile.services[0] || 'Servicio local');
  const [invChannel, setInvChannel] = useState<ReviewInvitationChannel>(
    project.invitationConfig?.defaultChannel || 'WhatsApp'
  );
  const [invConsent, setInvConsent] = useState(true);
  const [previewChannel, setPreviewChannel] = useState<ReviewInvitationChannel>('WhatsApp');

  const [postType, setPostType] = useState<GbpLocalPost['type']>('Novedad');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postCta, setPostCta] = useState('Reservar cita');

  const policy = project.reviewPolicy || {
    mode: 'Mixto' as const,
    minAutoStars: 4 as const,
    lastUpdatedAt: project.profile.lastAuditedAt,
  };

  const gbp = project.gbpAudit;
  const invConfig = project.invitationConfig;
  const invitations = project.reviewInvitations || [];
  const incidents = project.reviewIncidents || [];
  const directories = project.directoryListings || [];
  const sourceCatalog: ReputationSourceDefinition[] =
    project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
      ? project.reputationSourcesCatalog
      : DEFAULT_REPUTATION_SOURCE_CATALOG;
  const allCatalogNames = sourceCatalog.map((s) => s.name);
  const coreCatalogNames = sourceCatalog
    .filter((s) => s.category !== 'social')
    .map((s) => s.name);
  const socialCatalogNames = sourceCatalog
    .filter((s) => s.category === 'social')
    .map((s) => s.name);

  const enabledSources: ReputationSourcePlatform[] =
    project.enabledReputationSources ||
    (project.socialListeningAddonEnabled ? allCatalogNames : coreCatalogNames);
  const activeSocialSources = enabledSources.filter((s) =>
    socialCatalogNames.includes(s)
  );
  const effectiveSimPlatform: ReputationSourcePlatform = enabledSources.includes(simPlatform)
    ? simPlatform
    : enabledSources[0] || 'Google Business Profile';

  const openIncidentsCount = incidents.filter(
    (i) => i.status !== 'Resuelta' && i.status !== 'Cerrada'
  ).length;
  const syncedDirectoriesCount = directories.filter((d) => d.status === 'Sincronizado').length;
  const napPct =
    directories.length > 0 ? Math.round((syncedDirectoriesCount / directories.length) * 100) : 100;
  const publishedReviewsCount = invitations.filter((i) => i.status === 'Reseña Publicada').length;
  const avgRating =
    project.reviews.length > 0
      ? (project.reviews.reduce((s, r) => s + r.rating, 0) / project.reviews.length).toFixed(1)
      : '5.0';

  const runAction = async (key: string, fn: () => Promise<void>, okMessage?: string) => {
    setError(null);
    setNotice(null);
    setBusyKey(key);
    try {
      await fn();
      if (okMessage) setNotice(okMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error ejecutando operación.');
    } finally {
      setBusyKey(null);
    }
  };

  const renderPreviewMessage = (channel: ReviewInvitationChannel) => {
    const raw =
      channel === 'WhatsApp'
        ? invConfig.whatsappTemplate
        : channel === 'SMS'
          ? invConfig.smsTemplate
          : invConfig.emailTemplate;
    return raw
      .replace(/\{\{nombre\}\}/g, invName.trim() || 'Elena')
      .replace(/\{\{servicio\}\}/g, invService.trim() || project.profile.services[0] || 'Servicio')
      .replace(/\{\{enlace_publico\}\}/g, invConfig.publicReviewUrl)
      .replace(/\{\{soporte_privado\}\}/g, invConfig.privateSupportLabel)
      .replace(
        /\{\{enlace_privado\}\}/g,
        `${project.profile.domain}/soporte-directo`
      );
  };

  const sampleWebhookPayload = JSON.stringify(
    {
      projectId: project.id,
      customerName: 'Laura Martín',
      contact: '+34 644 120 890',
      serviceName: project.profile.services[0] || 'Servicio local',
      channel: invConfig.defaultChannel,
    },
    null,
    2
  );

  const handleCopyWebhook = () => {
    navigator.clipboard?.writeText(sampleWebhookPayload);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 1800);
  };

  const filteredChecklist = gbp.checklist.filter((c) =>
    chkFilter === 'all' ? true : c.status === chkFilter
  );
  const filteredInvitations = invitations.filter((i) =>
    invFilter === 'all' ? true : i.status === invFilter
  );
  const filteredIncidents = incidents.filter((c) =>
    incFilter === 'open' ? c.status !== 'Resuelta' && c.status !== 'Cerrada' : true
  );
  const filteredDirectories = directories.filter((d) => {
    if (dirFilter === 'issues') return d.status !== 'Sincronizado';
    if (dirFilter === 'synced') return d.status === 'Sincronizado';
    return true;
  });

  const masterGbpDir = directories.find((d) => d.directoryName === 'Google Business Profile');
  const checklistTotal = gbp.checklist.length;
  const checklistCompleted = gbp.checklist.filter((c) => c.status === 'Completado').length;
  const checklistPending = checklistTotal - checklistCompleted;
  const checklistProgressPct =
    checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 100;
  const highImpactPending = gbp.checklist.filter(
    (c) => c.status === 'Pendiente' && c.impact === 'Alto'
  ).length;

  // Clasificación omnicanal de reseñas y comentarios sociales
  const classifiedReviews = project.reviews.map((rev) =>
    classifyReviewSource(rev, sourceCatalog)
  );

  // En la vista unificada, de redes sociales se agrupan por defecto los comentarios negativos/críticos
  // (y cualquier mención social explícitamente filtrada por plataforma o sentimiento)
  const isSpecificSocialSelected = socialCatalogNames.includes(platformFilter);

  const inboxReviews = classifiedReviews.filter((item) => {
    if (item.isSocial && !item.isNegativeSocial && !isSpecificSocialSelected && sentimentFilter === 'all') {
      return false;
    }
    return true;
  });

  const filteredClassifiedReviews = inboxReviews.filter((item) => {
    const matchesPlatform =
      platformFilter === 'all'
        ? true
        : platformFilter === item.groupId || platformFilter === item.platform;
    const matchesSentiment =
      sentimentFilter === 'all' ? true : item.sentiment === sentimentFilter;
    return matchesPlatform && matchesSentiment;
  });

  const coreSourceGroupOrder: ReviewSourceGroupId[] = [
    'google_maps',
    'trustpilot',
    'tripadvisor',
    'doctoralia',
    'social_negative',
  ];

  const allSourceGroupOrder: ReviewSourceGroupId[] = [
    ...coreSourceGroupOrder,
    ...(classifiedReviews.some((c) => c.groupId === 'habitissimo') ? (['habitissimo'] as const) : []),
    ...(classifiedReviews.some((c) => c.groupId === 'custom_sources') ? (['custom_sources'] as const) : []),
  ];

  const sourceSummaries = coreSourceGroupOrder.map((groupId) => {
    const items = inboxReviews.filter((c) => c.groupId === groupId);
    const avg =
      items.length > 0
        ? (items.reduce((sum, c) => sum + c.review.rating, 0) / items.length).toFixed(1)
        : '—';
    const criticalCount = items.filter((c) => c.sentiment === 'Crítico').length;
    const pendingCount = items.filter((c) => c.review.replyStatus !== 'Publicada').length;
    return {
      groupId,
      ...SOURCE_GROUP_META[groupId],
      count: items.length,
      avg,
      criticalCount,
      pendingCount,
    };
  });

  const sentimentCounts = {
    all: inboxReviews.length,
    Positivo: inboxReviews.filter((c) => c.sentiment === 'Positivo').length,
    Neutro: inboxReviews.filter((c) => c.sentiment === 'Neutro').length,
    Crítico: inboxReviews.filter((c) => c.sentiment === 'Crítico').length,
  };

  const hasActiveReviewFilters = platformFilter !== 'all' || sentimentFilter !== 'all';

  const renderReviewCard = (item: ClassifiedReview) => {
    const rev = item.review;
    const currentText = editedReplies[rev.id] ?? rev.suggestedReply;
    const sentimentTextClass =
      item.sentiment === 'Crítico'
        ? 'font-semibold text-rose-700'
        : item.sentiment === 'Neutro'
          ? 'font-medium text-amber-700'
          : 'font-medium text-emerald-700';

    return (
      <div
        key={rev.id}
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{rev.author}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="font-medium text-blue-800">{item.platform}</span>
              <span aria-hidden="true"> · </span>
              <span>{rev.sede}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">{rev.date}</span>
              <span aria-hidden="true"> · </span>
              <span className={sentimentTextClass}>{item.sentiment}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-800 tabular-nums shrink-0">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{rev.rating}.0</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-700">“{rev.comment}”</p>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Respuesta sugerida</span>
            <span
              className={
                rev.replyStatus === 'Publicada'
                  ? 'font-medium text-emerald-700'
                  : 'font-medium text-amber-700'
              }
            >
              {rev.replyStatus}
            </span>
          </div>
          <textarea
            rows={3}
            value={currentText}
            onChange={(e) =>
              setEditedReplies((prev) => ({ ...prev, [rev.id]: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={() =>
                runAction(`reg-${rev.id}`, () =>
                  onReviewAction(rev.id, 'regenerate', currentText)
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Regenerar borrador
            </button>
            {rev.replyStatus !== 'Publicada' && (
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() =>
                  runAction(`pubrev-${rev.id}`, () =>
                    onReviewAction(rev.id, 'publish', currentText)
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Aprobar y publicar</span>
              </button>
            )}
          </div>
          {rev.rating <= 3 && (
            <span className="text-[11px] font-medium text-rose-700">
              Vinculada a Incidencias ≤3★
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Confia360 ReputaciónLocal · Ficha GBP · Invitaciones sin gating · Incidencias · Directorios NAP
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Reputación Local, Reseñas y Directorios
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() =>
              runAction('optimize-gbp', onOptimizeGbp, 'Ficha GBP optimizada con Gemini.')
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {busyKey === 'optimize-gbp' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Optimizar ficha GBP con IA</span>
          </button>
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() =>
              runAction(
                'audit-dirs',
                onAuditDirectories,
                'Auditoría NAP completada en todos los directorios.'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {busyKey === 'audit-dirs' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            <span>Auditar directorios NAP</span>
          </button>
        </div>
      </div>

      {/* Tira KPI ReputaciónLocal (4 columnas) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Completitud Ficha GBP</span>
            <ClipboardCheck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {gbp.completenessScore}%
            </span>
            <span className="text-xs font-medium text-emerald-700">
              {gbp.verified ? 'Verificada' : 'Sin verificar'}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                gbp.completenessScore >= 95 ? 'bg-emerald-600' : 'bg-blue-700'
              }`}
              style={{ width: `${gbp.completenessScore}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
            {checklistCompleted}/{checklistTotal} checklist · {gbp.photosCount}/{gbp.recommendedPhotosCount} fotos
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Reseñas e Invitaciones</span>
            <Star className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {avgRating}★
            </span>
            <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
              {invitations.length} enviadas · {publishedReviewsCount} publicadas
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Política activa: {policy.mode} · Sin review gating
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubTab('reviews');
            setIncFilter('open');
          }}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-slate-50/40"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Incidencias Críticas</span>
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {openIncidentsCount}
            </span>
            <span
              className={`text-xs font-medium ${
                openIncidentsCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {openIncidentsCount > 0 ? 'Requieren intervención' : 'Al día'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Reseñas ≤3★ + canal privado paralelo
          </p>
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Coherencia NAP Directorios</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {napPct}%
            </span>
            <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
              {syncedDirectoriesCount}/{directories.length} sincronizados
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {directories.filter((d) => d.duplicateCount > 0).length} duplicados detectados
          </p>
        </div>
      </div>

      {/* Subnavegación segmentada */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {(
          [
            { id: 'kpis', label: 'KPIs de Reputación' },
            { id: 'gbp', label: 'Ficha GBP y Checklist' },
            { id: 'invitations', label: 'Invitaciones y Webhooks' },
            { id: 'reviews', label: `Reseñas e Incidencias (${openIncidentsCount})` },
            { id: 'directories', label: 'Directorios y NAP' },
            { id: 'posts', label: 'Publicaciones y Redes' },
            {
              id: 'config',
              label: `Configuración y Fuentes (${enabledSources.length}/${sourceCatalog.length})`,
            },
          ] as { id: SubTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          {notice}
        </div>
      )}

      {/* TAB 0: KPIS DE REPUTACIÓN (D3.js) */}
      {subTab === 'kpis' && (
        <ReputationKpiD3Panel
          companyName={project.profile.companyName}
          city={project.profile.primaryCity}
          timeline={project.reputationKpisTimeline || []}
          competitors={project.reputationCompetitors || []}
        />
      )}

      {/* TAB 1: FICHA GBP Y CHECKLIST */}
      {subTab === 'gbp' && (
        <div className="space-y-6">
          {gbp.thirdPartyChangeAlert && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Alerta de cambio sugerido por terceros o Google en la ficha
                  </p>
                  <p className="mt-0.5 text-xs text-slate-700">{gbp.thirdPartyChangeAlert}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    runAction(
                      'dismiss-reject',
                      () => onDismissGbpAlert(false),
                      'Cambio de terceros rechazado; ficha protegida.'
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                >
                  Rechazar cambio
                </button>
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    runAction(
                      'dismiss-accept',
                      () => onDismissGbpAlert(true),
                      'Cambio validado y actualizado.'
                    )
                  }
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Aceptar
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Checklist */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Checklist de Optimización Google Business Profile
                  </h2>
                  <p className="text-xs text-slate-500">
                    Categoría principal: {gbp.primaryCategory} · Última auditoría:{' '}
                    <span className="font-mono tabular-nums">{gbp.lastAuditedAt}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {(['all', 'Pendiente', 'Completado'] as const).map((f) => {
                    const count =
                      f === 'all'
                        ? checklistTotal
                        : f === 'Completado'
                          ? checklistCompleted
                          : checklistPending;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setChkFilter(f)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap tabular-nums ${
                          chkFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {f === 'all' ? `Todos (${count})` : `${f} (${count})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tracker de progreso del Checklist GBP */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      Progreso del Checklist GBP
                    </span>
                    <span className="font-mono font-semibold text-blue-700 tabular-nums">
                      {checklistCompleted}/{checklistTotal} tareas ({checklistProgressPct}%)
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      checklistPending === 0
                        ? 'text-emerald-700'
                        : highImpactPending > 0
                          ? 'text-amber-700'
                          : 'text-slate-600'
                    }`}
                  >
                    {checklistPending === 0
                      ? 'Optimización 100% completada'
                      : `${highImpactPending} de impacto alto pendientes · Ficha al ${gbp.completenessScore}%`}
                  </span>
                </div>
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuenow={checklistProgressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progreso del checklist de optimización GBP"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      checklistProgressPct === 100 ? 'bg-emerald-600' : 'bg-blue-700'
                    }`}
                    style={{ width: `${checklistProgressPct}%` }}
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredChecklist.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    No hay elementos en el checklist con el estado "{chkFilter}".
                  </p>
                ) : (
                  filteredChecklist.map((item) => {
                    const isDone = item.status === 'Completado';
                    const isBusy = busyKey === `chk-${item.id}`;
                    const toggleItem = () =>
                      runAction(
                        `chk-${item.id}`,
                        () => onToggleChecklist(item.id, isDone ? 'Pendiente' : 'Completado'),
                        isDone
                          ? `Tarea "${item.title}" reabierta como pendiente.`
                          : `Tarea "${item.title}" completada.`
                      );

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isDone}
                            aria-label={`Cambiar estado de ${item.title}`}
                            disabled={busyKey !== null}
                            onClick={toggleItem}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
                              isDone
                                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'border-slate-300 bg-white text-transparent hover:border-blue-600'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <div className="space-y-1">
                            <p className="text-xs text-slate-500">
                              {item.category} · Impacto {item.impact} ·{' '}
                              {item.autoFixable
                                ? 'Aplicable desde Confia360'
                                : 'Requiere medio del cliente'}
                            </p>
                            <p
                              className={`text-sm font-semibold ${
                                isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-600">{item.detail}</p>
                            {item.aiSuggestion && !isDone && (
                              <p className="text-xs text-blue-800">
                                Sugerencia operativa: {item.aiSuggestion}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={toggleItem}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-50 ${
                            isDone
                              ? 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>{isDone ? 'Completado' : 'Marcar completado'}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Descripción + Categorías + Q&A */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Ficha Maestra Optimizada (Descripción y Categorías)
                </h2>
                <p className="text-xs leading-relaxed text-slate-700">
                  {gbp.optimizedDescription}
                </p>
                <div className="border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <span className="font-medium text-slate-800">Categorías secundarias: </span>
                  <span>{gbp.secondaryCategories.join(' · ')}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Preguntas y Respuestas (Q&amp;A) de Google Maps
                </h2>
                {gbp.qas.map((qa) => {
                  const ans = editedQaAnswers[qa.id] ?? qa.answer;
                  return (
                    <div key={qa.id} className="space-y-2 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{qa.source}</span>
                        <span
                          className={
                            qa.status === 'Publicada'
                              ? 'font-medium text-emerald-700'
                              : 'font-medium text-amber-700'
                          }
                        >
                          {qa.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900">{qa.question}</p>
                      <textarea
                        rows={2}
                        value={ans}
                        onChange={(e) =>
                          setEditedQaAnswers((prev) => ({ ...prev, [qa.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                      {qa.status !== 'Publicada' && (
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() =>
                            runAction(
                              `qa-${qa.id}`,
                              () => onUpdateQa(qa.id, ans, 'Publicada'),
                              'Respuesta Q&A publicada en ficha.'
                            )
                          }
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                        >
                          Aprobar y publicar Q&amp;A
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVITACIONES MULTICANAL Y WEBHOOKS */}
      {subTab === 'invitations' && (
        <div className="space-y-6">
          {/* Regla de cumplimiento sin Review Gating */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-slate-900">
                Flujo ético sin Review Gating · Cumplimiento Google y Trustpilot
              </p>
              <p className="mt-0.5 text-slate-600">
                Todas las invitaciones muestran el mismo enlace público directo de reseña a cualquier cliente sin filtros previos ni incentivos. En paralelo, incluyen un enlace secundario de soporte rápido para atender incidencias en privado sin ocultar el acceso público.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Enviar invitación manual */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  'send-inv',
                  async () => {
                    await onSendInvitation({
                      customerName: invName,
                      contact: invContact,
                      serviceName: invService,
                      channel: invChannel,
                      consentVerified: invConsent,
                    });
                    setInvName('');
                    setInvContact('');
                  },
                  `Invitación neutra enviada por ${invChannel}.`
                );
              }}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 lg:col-span-6"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Send className="h-4 w-4 text-blue-700" />
                <span>Enviar invitación post-servicio</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={invContact}
                  onChange={(e) => setInvContact(e.target.value)}
                  placeholder="Teléfono (+34...) o email"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  value={invService}
                  onChange={(e) => setInvService(e.target.value)}
                  placeholder="Servicio prestado"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
                <select
                  value={invChannel}
                  onChange={(e) => setInvChannel(e.target.value as ReviewInvitationChannel)}
                  aria-label="Canal de envío"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={invConsent}
                  onChange={(e) => setInvConsent(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>
                  Consentimiento RGPD verificado y enlace de baja incluido (máx. {invConfig.maxReminders} recordatorios)
                </span>
              </label>
              <button
                type="submit"
                disabled={busyKey !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
              >
                {busyKey === 'send-inv' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Enviar invitación neutra</span>
              </button>
            </form>

            {/* Vista previa mensaje y Webhook CRM/TPV */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Webhook className="h-4 w-4 text-blue-700" />
                  <span>Plantilla en vivo y Webhook CRM / TPV</span>
                </h2>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {(['WhatsApp', 'SMS', 'Email'] as ReviewInvitationChannel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setPreviewChannel(ch)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                        previewChannel === ch ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                {renderPreviewMessage(previewChannel)}
              </div>

              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-600">
                  <span className="font-mono text-[11px] text-slate-800">
                    POST {invConfig.endpointPath}
                  </span>
                  {invConfig.lastTriggeredAt && (
                    <span className="block text-[11px] text-slate-500">
                      Último disparo: {invConfig.lastTriggeredAt}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedWebhook ? 'JSON copiado' : 'Copiar JSON'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() =>
                      runAction(
                        'trigger-wh',
                        () =>
                          onTriggerWebhook({
                            customerName: 'Laura Martín (Webhook CRM)',
                            contact: '+34 644 120 890',
                            serviceName: project.profile.services[0] || 'Servicio local',
                            channel: invConfig.defaultChannel,
                          }),
                        'Webhook ejecutado: invitación automática registrada.'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    {busyKey === 'trigger-wh' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Webhook className="h-3.5 w-3.5" />
                    )}
                    <span>Disparar prueba webhook</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Registro de invitaciones */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Trazabilidad de Invitaciones Enviadas
              </h2>
              <select
                value={invFilter}
                onChange={(e) => setInvFilter(e.target.value)}
                aria-label="Filtrar estado de invitaciones"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
              >
                <option value="all">Todos los estados</option>
                <option value="Enviada">Enviada</option>
                <option value="Recordatorio Enviado">Recordatorio Enviado</option>
                <option value="Clic Enlace Público">Clic Enlace Público</option>
                <option value="Reseña Publicada">Reseña Publicada</option>
                <option value="Incidencia Privada">Incidencia Privada</option>
                <option value="Baja RGPD">Baja RGPD</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 px-3 font-medium">Canal</th>
                    <th className="py-2 px-3 font-medium">Servicio</th>
                    <th className="py-2 px-3 font-medium">Estado</th>
                    <th className="py-2 px-3 font-medium text-right">Recordatorios</th>
                    <th className="py-2 pl-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">{inv.customerName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{inv.contact}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          {inv.channel === 'Email' ? (
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          {inv.channel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{inv.serviceName}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            inv.status === 'Reseña Publicada'
                              ? 'text-emerald-700'
                              : inv.status === 'Incidencia Privada'
                                ? 'text-rose-700'
                                : inv.status === 'Baja RGPD'
                                  ? 'text-slate-400'
                                  : 'text-blue-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {inv.remindersSent}/{inv.maxReminders}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={
                              busyKey !== null ||
                              inv.status === 'Baja RGPD' ||
                              inv.remindersSent >= inv.maxReminders
                            }
                            onClick={() =>
                              runAction(
                                `rem-${inv.id}`,
                                () => onUpdateInvitation(inv.id, 'remind'),
                                'Recordatorio enviado.'
                              )
                            }
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
                          >
                            Recordar
                          </button>
                          <button
                            type="button"
                            disabled={busyKey !== null || inv.status === 'Baja RGPD'}
                            onClick={() =>
                              runAction(
                                `pub-${inv.id}`,
                                () => onUpdateInvitation(inv.id, 'published'),
                                'Marcada reseña pública recibida.'
                              )
                            }
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 whitespace-nowrap"
                          >
                            Reseña OK
                          </button>
                          <button
                            type="button"
                            disabled={busyKey !== null || inv.status === 'Baja RGPD'}
                            onClick={() =>
                              runAction(
                                `priv-${inv.id}`,
                                () => onUpdateInvitation(inv.id, 'private_incident'),
                                'Incidencia privada abierta en centro de casos.'
                              )
                            }
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40 whitespace-nowrap"
                          >
                            Soporte privado
                          </button>
                          <button
                            type="button"
                            disabled={busyKey !== null || inv.status === 'Baja RGPD'}
                            onClick={() =>
                              runAction(
                                `opt-${inv.id}`,
                                () => onUpdateInvitation(inv.id, 'opt_out'),
                                'Contacto marcado en Baja RGPD.'
                              )
                            }
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap"
                          >
                            Baja RGPD
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESEÑAS E INCIDENCIAS */}
      {subTab === 'reviews' && (
        <div className="space-y-6">
          {/* Resumen de cobertura configurada + enlace al módulo de administración con PIN */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-900">
                  Cobertura Omnicanal de Críticas y Reseñas
                </span>
                <span className="text-slate-300">·</span>
                <span
                  className={
                    activeSocialSources.length > 0
                      ? 'font-medium text-emerald-700'
                      : 'font-medium text-slate-600'
                  }
                >
                  {activeSocialSources.length > 0
                    ? `${enabledSources.length} fuentes activas (incluye ${activeSocialSources.join(', ')})`
                    : `${enabledSources.length} fuentes activas (Google Maps, Trustpilot y Portales Sectoriales)`}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Fuentes habilitadas actualmente:{' '}
                <strong className="font-medium text-slate-800">
                  {enabledSources.join(' · ')}
                </strong>
                . Activa selectores múltiples, añade o edita fuentes y gestiona el Add-on de Escucha Social desde{' '}
                <strong className="font-medium text-slate-800">
                  Configuración y Fuentes
                </strong>{' '}
                con PIN de administrador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubTab('config')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              {adminStatus.unlocked ? (
                <Unlock className="h-3.5 w-3.5 text-emerald-700" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-blue-700" />
              )}
              <span>
                {adminStatus.unlocked
                  ? 'Gestionar fuentes y add-on'
                  : 'Configurar fuentes y acceso (PIN)'}
              </span>
            </button>
          </div>

          {/* Política de Respuesta + Simulador */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Settings2 className="h-4 w-4 text-blue-700" />
                  <span>Política de Respuesta a Reseñas</span>
                </h2>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {policy.lastUpdatedAt}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    {
                      mode: 'Mixto',
                      desc: `Auto-publica ≥${policy.minAutoStars}★ y retiene críticas`,
                    },
                    {
                      mode: 'Semiautomático',
                      desc: 'Todas requieren aprobación humana',
                    },
                    {
                      mode: 'Automático',
                      desc: 'Auto-publica respetando prohibiciones',
                    },
                  ] as const
                ).map((opt) => {
                  const active = policy.mode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() =>
                        runAction('policy', () => onUpdatePolicy(opt.mode, policy.minAutoStars))
                      }
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? 'border-blue-700 bg-blue-50/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`block text-xs font-semibold ${
                          active ? 'text-blue-800' : 'text-slate-900'
                        }`}
                      >
                        {opt.mode}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-slate-600">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {policy.mode === 'Mixto' && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                  <span className="text-slate-700">Umbral mínimo para autopublicar sin bloqueo:</span>
                  <div className="flex items-center gap-1.5">
                    {([4, 5] as const).map((stars) => (
                      <button
                        key={stars}
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() =>
                          runAction('policy-stars', () => onUpdatePolicy('Mixto', stars))
                        }
                        className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold tabular-nums ${
                          policy.minAutoStars === stars
                            ? 'bg-blue-700 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {stars}★+
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!simComment.trim()) return;
                runAction(
                  'simulate-rev',
                  async () => {
                    await onSimulateReview({
                      author: simAuthor.trim() || 'Cliente local',
                      rating: simRating,
                      comment: simComment.trim(),
                      platform: effectiveSimPlatform,
                    });
                    setSimComment('');
                  },
                  simRating <= 3
                    ? `Crítica en ${effectiveSimPlatform} evaluada: se ha abierto incidencia automática con SLA 24 h.`
                    : `Mención en ${effectiveSimPlatform} evaluada según la política activa.`
                );
              }}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 lg:col-span-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-blue-700" />
                  <span>Simular Crítica / Reseña Omnicanal (≤3★ abre incidencia)</span>
                </h2>
                <span className="text-[11px] text-slate-500">Modo: {policy.mode}</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                <select
                  value={effectiveSimPlatform}
                  onChange={(e) => setSimPlatform(e.target.value as ReputationSourcePlatform)}
                  aria-label="Canal de origen"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 sm:col-span-2"
                >
                  {sourceCatalog.some(
                    (c) => c.category === 'base' && enabledSources.includes(c.name)
                  ) && (
                    <optgroup label="Buscadores y Reseñas Base">
                      {sourceCatalog
                        .filter((c) => c.category === 'base' && enabledSources.includes(c.name))
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {sourceCatalog.some(
                    (c) => c.category === 'sectorial' && enabledSources.includes(c.name)
                  ) && (
                    <optgroup label="Portales Sectoriales y Propios">
                      {sourceCatalog
                        .filter(
                          (c) => c.category === 'sectorial' && enabledSources.includes(c.name)
                        )
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {activeSocialSources.length > 0 && (
                    <optgroup label="Add-on Escucha Social">
                      {sourceCatalog
                        .filter((c) => c.category === 'social' && enabledSources.includes(c.name))
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <input
                  type="text"
                  value={simAuthor}
                  onChange={(e) => setSimAuthor(e.target.value)}
                  placeholder="Autor / @usuario"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
                <select
                  value={simRating}
                  onChange={(e) => setSimRating(Number(e.target.value))}
                  aria-label="Valoración en estrellas"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900 tabular-nums"
                >
                  <option value={5}>5 estrellas</option>
                  <option value={4}>4 estrellas</option>
                  <option value={3}>3 estrellas</option>
                  <option value={2}>2 estrellas</option>
                  <option value={1}>1 estrella</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  required
                  value={simComment}
                  onChange={(e) => setSimComment(e.target.value)}
                  placeholder="Ej: Tardaron en responder en TikTok / duda sobre presupuesto en Doctoralia..."
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busyKey !== null}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {busyKey === 'simulate-rev' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>Evaluar crítica</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sección Incidencias de Reseñas (Casos abiertos con intervención humana) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldAlert className="h-4 w-4 text-rose-700" />
                  <span>Incidencias de Reseñas</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Casos abiertos que requieren intervención humana, seguimiento SLA y documentación de resolución sin exponer datos personales
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setIncFilter('open')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium tabular-nums ${
                      incFilter === 'open' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Abiertas ({openIncidentsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncFilter('all')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium tabular-nums ${
                      incFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Todas ({incidents.length})
                  </button>
                </div>
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    runAction(
                      'analyze-patterns',
                      onAnalyzeIncidentPatterns,
                      'Patrones operativos detectados.'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  {busyKey === 'analyze-patterns' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                  )}
                  <span>Detectar patrones con IA</span>
                </button>
              </div>
            </div>

            {project.incidentPatternSummary && project.incidentPatternSummary.topPatterns.length > 0 && (
              <div className="grid grid-cols-1 gap-3 border-b border-slate-100 pb-4 md:grid-cols-3">
                {project.incidentPatternSummary.topPatterns.map((pat, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-50 p-3 text-xs border border-slate-100">
                    <p className="font-semibold text-slate-900">
                      {pat.theme} · <span className="font-mono tabular-nums">{pat.count} casos</span>
                    </p>
                    <p className="mt-1 text-slate-600">{pat.recommendation}</p>
                  </div>
                ))}
              </div>
            )}

            {filteredIncidents.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-600">
                {incFilter === 'open'
                  ? 'No hay casos abiertos que requieran intervención humana en este momento.'
                  : 'No existen incidencias registradas para este negocio.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredIncidents.map((inc) => {
                  const notes = incidentNotes[inc.id] ?? inc.resolutionNotes;
                  const owner = incidentOwners[inc.id] ?? inc.owner;
                  const isClosed = inc.status === 'Resuelta' || inc.status === 'Cerrada';
                  return (
                    <div
                      key={inc.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-500">
                            {inc.source} · {inc.category} · Severidad{' '}
                            <span
                              className={
                                inc.severity === 'Alta'
                                  ? 'font-semibold text-rose-700'
                                  : 'font-medium text-amber-700'
                              }
                            >
                              {inc.severity}
                            </span>{' '}
                            · SLA <span className="font-mono tabular-nums">{inc.slaDueAt}</span>
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900">
                            {inc.customerName}{' '}
                            {inc.rating ? (
                              <span className="font-mono text-xs text-rose-700 tabular-nums">
                                ({inc.rating}.0★)
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <select
                          value={inc.status}
                          onChange={(e) =>
                            runAction(`inc-st-${inc.id}`, () =>
                              onUpdateIncident(inc.id, {
                                status: e.target.value as ReviewIncidentCase['status'],
                              })
                            )
                          }
                          aria-label="Estado de incidencia"
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                        >
                          <option value="Abierta">Abierta</option>
                          <option value="En gestión">En gestión</option>
                          <option value="Contacto realizado">Contacto realizado</option>
                          <option value="Resuelta">Resuelta</option>
                          <option value="Cerrada">Cerrada</option>
                        </select>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-700">“{inc.summary}”</p>
                      <p className="text-xs text-blue-800">
                        Acción sugerida: {inc.suggestedAction}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium text-slate-600 shrink-0">
                            Responsable:
                          </label>
                          <input
                            type="text"
                            value={owner}
                            onChange={(e) =>
                              setIncidentOwners((prev) => ({ ...prev, [inc.id]: e.target.value }))
                            }
                            placeholder="Responsable del caso"
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) =>
                            setIncidentNotes((prev) => ({ ...prev, [inc.id]: e.target.value }))
                          }
                          placeholder="Documenta las notas de resolución (llamada realizada, compensación, acuerdo)..."
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() =>
                            runAction(
                              `inc-save-${inc.id}`,
                              () => onUpdateIncident(inc.id, { owner, resolutionNotes: notes }),
                              'Notas de seguimiento guardadas.'
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          Guardar notas
                        </button>

                        {!isClosed ? (
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() =>
                              runAction(
                                `inc-resolve-${inc.id}`,
                                () =>
                                  onUpdateIncident(inc.id, {
                                    status: 'Resuelta',
                                    owner: owner.trim() || 'Lucía Serrano',
                                    resolutionNotes:
                                      notes.trim() ||
                                      'Caso atendido y resuelto mediante intervención humana.',
                                  }),
                                `Incidencia de ${inc.customerName} marcada como Resuelta.`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {busyKey === `inc-resolve-${inc.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Resolver</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{inc.status}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vista Unificada y Agrupada de Reseñas por Fuente y Sentimiento */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MessageSquare className="h-4 w-4 text-blue-700" />
                  <span>
                    Buzón Unificado por Fuente ({filteredClassifiedReviews.length}/
                    {inboxReviews.length})
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Agrupa en una sola vista reseñas de Google Maps, Trustpilot, TripAdvisor, Doctoralia y comentarios negativos en redes sociales.
                </p>
              </div>
              <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 lg:self-auto">
                <button
                  type="button"
                  onClick={() => setReviewLayoutMode('grouped')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    reviewLayoutMode === 'grouped'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Agrupado por fuente
                </button>
                <button
                  type="button"
                  onClick={() => setReviewLayoutMode('list')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    reviewLayoutMode === 'list'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lista unificada
                </button>
              </div>
            </div>

            {/* Tarjetas resumen interactivas de clasificación por fuente */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {sourceSummaries.map((bucket) => {
                const isActive = platformFilter === bucket.groupId;
                const isSocialBucket = bucket.groupId === 'social_negative';
                return (
                  <button
                    key={bucket.groupId}
                    type="button"
                    onClick={() =>
                      setPlatformFilter(isActive ? 'all' : bucket.groupId)
                    }
                    className={`rounded-xl border p-3.5 text-left transition-colors ${
                      isActive
                        ? 'border-blue-700 bg-blue-50/60'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-semibold truncate ${
                          isActive ? 'text-blue-800' : 'text-slate-900'
                        }`}
                      >
                        {bucket.shortLabel}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                        {bucket.avg === '—' ? '—' : `${bucket.avg}★`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                        {bucket.count}
                      </span>
                      <span
                        className={`text-[11px] tabular-nums ${
                          bucket.criticalCount > 0
                            ? 'font-medium text-rose-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {bucket.criticalCount > 0
                          ? `${bucket.criticalCount} críticas`
                          : `${bucket.pendingCount} por responder`}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {isSocialBucket
                        ? project.socialListeningAddonEnabled
                          ? 'Meta · TikTok · YouTube activo'
                          : 'Add-on redes pausado'
                        : bucket.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Barra de filtros por Plataforma y Sentimiento */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 shrink-0">
                    Plataforma:
                  </span>
                  <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                    {(
                      [
                        { id: 'all', label: 'Todas' },
                        { id: 'google_maps', label: 'Google Maps' },
                        { id: 'trustpilot', label: 'Trustpilot' },
                        { id: 'tripadvisor', label: 'TripAdvisor' },
                        { id: 'doctoralia', label: 'Doctoralia' },
                        { id: 'social_negative', label: 'Redes Negativas' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPlatformFilter(opt.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          platformFilter === opt.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <select
                    value={platformFilter}
                    onChange={(e) =>
                      setPlatformFilter(e.target.value as PlatformFilterValue)
                    }
                    aria-label="Seleccionar plataforma específica"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="all">Todas las plataformas</option>
                    <optgroup label="Reseñas y Directorios">
                      {sourceCatalog
                        .filter((c) => c.category !== 'social')
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Redes Sociales (Comentarios Negativos)">
                      <option value="social_negative">
                        Todas las redes sociales
                      </option>
                      {sourceCatalog
                        .filter((c) => c.category === 'social')
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.label}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 shrink-0">
                    Sentimiento:
                  </span>
                  <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                    {(
                      [
                        { id: 'all', label: `Todos (${sentimentCounts.all})` },
                        {
                          id: 'Positivo',
                          label: `Positivo (${sentimentCounts.Positivo})`,
                        },
                        {
                          id: 'Neutro',
                          label: `Neutro (${sentimentCounts.Neutro})`,
                        },
                        {
                          id: 'Crítico',
                          label: `Crítico (${sentimentCounts.Crítico})`,
                        },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSentimentFilter(s.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                          sentimentFilter === s.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {hasActiveReviewFilters && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 text-xs">
                  <span className="text-slate-600 tabular-nums">
                    Mostrando <strong className="font-semibold text-slate-900">{filteredClassifiedReviews.length}</strong> de {inboxReviews.length} comentarios clasificados
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformFilter('all');
                      setSentimentFilter('all');
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    Restablecer filtros
                  </button>
                </div>
              )}
            </div>

            {/* Contenido: Vista Agrupada por Fuente o Lista Unificada */}
            {filteredClassifiedReviews.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center space-y-2">
                <p className="text-xs font-medium text-slate-800">
                  No hay comentarios que coincidan con la combinación de plataforma y sentimiento seleccionada.
                </p>
                <p className="text-xs text-slate-500">
                  Prueba ampliando el filtro o simulando un nuevo comentario desde el formulario superior.
                </p>
                {hasActiveReviewFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformFilter('all');
                      setSentimentFilter('all');
                    }}
                    className="mt-2 inline-flex items-center rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    Ver todas las fuentes
                  </button>
                )}
              </div>
            ) : reviewLayoutMode === 'grouped' ? (
              <div className="space-y-6">
                {allSourceGroupOrder.map((groupId) => {
                  const groupItems = filteredClassifiedReviews.filter(
                    (c) => c.groupId === groupId
                  );
                  if (hasActiveReviewFilters && groupItems.length === 0) {
                    return null;
                  }
                  const meta = SOURCE_GROUP_META[groupId];
                  const avgGroup =
                    groupItems.length > 0
                      ? (
                          groupItems.reduce((acc, c) => acc + c.review.rating, 0) /
                          groupItems.length
                        ).toFixed(1)
                      : '—';
                  const pendingGroup = groupItems.filter(
                    (c) => c.review.replyStatus !== 'Publicada'
                  ).length;

                  return (
                    <section key={groupId} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {meta.label}
                          </h3>
                          <p className="text-xs text-slate-500">{meta.description}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                          <span className="font-mono font-semibold text-slate-900">
                            {groupItems.length}{' '}
                            {groupItems.length === 1 ? 'comentario' : 'comentarios'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            Media {avgGroup === '—' ? '—' : `${avgGroup}★`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              pendingGroup > 0
                                ? 'font-medium text-amber-700'
                                : 'font-medium text-emerald-700'
                            }
                          >
                            {pendingGroup > 0
                              ? `${pendingGroup} pendientes`
                              : 'Todo respondido'}
                          </span>
                        </div>
                      </div>

                      {groupItems.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                          {groupId === 'social_negative' && !project.socialListeningAddonEnabled
                            ? 'Add-on de escucha social pausado. Actívalo arriba para capturar comentarios negativos de Meta, TikTok y YouTube.'
                            : 'Sin comentarios registrados todavía en esta plataforma.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          {groupItems.map(renderReviewCard)}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredClassifiedReviews.map(renderReviewCard)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DIRECTORIOS Y AUDITORÍA NAP */}
      {subTab === 'directories' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Ficha Maestra NAP (Referencia Canónica)
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{project.profile.companyName}</span> ·{' '}
                  {masterGbpDir?.detectedAddress || project.profile.primaryCity} ·{' '}
                  <span className="font-mono">{masterGbpDir?.detectedPhone || '+34 910 482 310'}</span> ·{' '}
                  {project.profile.domain}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['all', 'issues', 'synced'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDirFilter(f)}
                    className={`rounded-md px-3 py-1 text-[11px] font-medium whitespace-nowrap ${
                      dirFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'issues' ? 'Con incidencias' : 'Sincronizados'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Directorio</th>
                    <th className="py-2 px-3 font-medium">Estado NAP</th>
                    <th className="py-2 px-3 font-medium">Datos detectados y discrepancias</th>
                    <th className="py-2 px-3 font-medium">Regla de reseñas</th>
                    <th className="py-2 pl-3 font-medium text-right">Corrección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDirectories.map((dir) => (
                    <tr key={dir.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">{dir.directoryName}</p>
                        <p className="text-[11px] text-slate-500">{dir.tier}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            dir.status === 'Sincronizado'
                              ? 'text-emerald-700'
                              : dir.status === 'Duplicado Detectado'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                          }`}
                        >
                          {dir.status}
                        </span>
                        {dir.duplicateCount > 0 && (
                          <span className="block font-mono text-[11px] text-rose-700">
                            {dir.duplicateCount} duplicado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <p>
                          {dir.detectedName} · {dir.detectedAddress} ·{' '}
                          <span className="font-mono">{dir.detectedPhone}</span>
                        </p>
                        {dir.discrepancies.length > 0 ? (
                          <p className="mt-1 text-amber-800">{dir.discrepancies.join(' · ')}</p>
                        ) : (
                          <p className="mt-1 text-emerald-700">100% coherente con ficha maestra</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span
                          className={
                            dir.solicitationPolicy.includes('No solicitar')
                              ? 'font-medium text-rose-700'
                              : 'text-slate-600'
                          }
                        >
                          {dir.solicitationPolicy}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {dir.status !== 'Sincronizado' ? (
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() =>
                              runAction(
                                `dir-${dir.id}`,
                                () =>
                                  onFixDirectory(
                                    dir.id,
                                    dir.status === 'Duplicado Detectado'
                                      ? 'resolve_duplicate'
                                      : dir.status === 'Sin Reclamar'
                                        ? 'claim'
                                        : 'sync_nap'
                                  ),
                                `${dir.directoryName} sincronizado con el perfil maestro.`
                              )
                            }
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                          >
                            {dir.status === 'Duplicado Detectado'
                              ? 'Fusionar duplicado'
                              : dir.status === 'Sin Reclamar'
                                ? 'Reclamar y sincronizar'
                                : 'Corregir NAP'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {dir.lastCheckedAt}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PUBLICACIONES LOCALES GBP Y REDES */}
      {subTab === 'posts' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  'create-gbp-post',
                  async () => {
                    await onCreateGbpPost({
                      type: postType,
                      title: postTitle,
                      body: postBody,
                      ctaText: postCta,
                      scheduledDate: '2026-11-26',
                    });
                    setPostTitle('');
                    setPostBody('');
                  },
                  'Publicación local GBP añadida.'
                );
              }}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <h2 className="text-sm font-semibold text-slate-900">
                Nueva Publicación Local en Google Business Profile
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as GbpLocalPost['type'])}
                  aria-label="Tipo de publicación GBP"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900"
                >
                  <option value="Novedad">Novedad</option>
                  <option value="Oferta">Oferta</option>
                  <option value="Evento">Evento</option>
                </select>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Título publicación local"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 sm:col-span-2"
                />
              </div>
              <textarea
                rows={3}
                required
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                placeholder="Texto veraz con servicios, zona y llamada a la acción..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900"
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={postCta}
                  onChange={(e) => setPostCta(e.target.value)}
                  placeholder="Texto botón CTA"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900"
                />
                <button
                  type="submit"
                  disabled={busyKey !== null}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  Programar en GBP
                </button>
              </div>
            </form>

            {gbp.localPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    {post.type} · {post.scheduledDate}
                  </span>
                  <span
                    className={
                      post.status === 'Publicada' ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'
                    }
                  >
                    {post.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{post.title}</p>
                <p className="text-xs text-slate-700">{post.body}</p>
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-slate-500">CTA: {post.ctaText}</span>
                  {post.status !== 'Publicada' && (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() =>
                        runAction(`gbp-post-${post.id}`, () =>
                          onUpdateGbpPostStatus(post.id, 'Publicada')
                        )
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap"
                    >
                      Publicar en Google Maps
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cola de Redes Sociales y Comunidades */}
          <div className="space-y-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Share2 className="h-4 w-4 text-blue-700" />
                <span>Cola de Redes Sociales y Comunidades</span>
              </h2>
              <span className="text-xs text-slate-500">Aprobación previa obligatoria</span>
            </div>

            {project.socialPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    {post.channel} · {post.format}
                  </span>
                  <span
                    className={
                      post.status === 'Publicada' || post.status === 'Aprobada'
                        ? 'font-medium text-emerald-700'
                        : 'font-medium text-amber-700'
                    }
                  >
                    {post.status}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">{post.copy}</p>
                {post.antiSpamNote && (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    {post.antiSpamNote}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-mono text-slate-500 tabular-nums">
                    Programado: {post.scheduledDate}
                  </span>
                  <div className="flex items-center gap-2">
                    {post.status === 'Pendiente Aprobación' && (
                      <button
                        type="button"
                        onClick={() => onSocialApprove(post.id, 'Aprobada')}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap"
                      >
                        Aprobar publicación
                      </button>
                    )}
                    {post.status === 'Aprobada' && (
                      <button
                        type="button"
                        onClick={() => onSocialApprove(post.id, 'Publicada')}
                        className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                      >
                        Publicar ahora
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* TAB 6: ADMINISTRACIÓN Y CONFIGURACIÓN DE REPUTACIÓNLOCAL */}
      {subTab === 'config' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Administración · ReputaciónLocal
              </p>
              <h2 className="mt-0.5 text-base font-bold text-slate-900">
                Configuración de Fuentes, Escucha Social y Acceso PIN
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Gestiona la activación múltiple de fuentes, añade nuevos portales o modifica los existentes bajo clave PIN del administrador.
              </p>
            </div>
            {onNavigateToAdminConfig && (
              <button
                type="button"
                onClick={onNavigateToAdminConfig}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <Settings2 className="h-3.5 w-3.5 text-blue-700" />
                <span>Módulos globales Confia360</span>
              </button>
            )}
          </div>

          <ReputationSourcesAdminPanel
            project={project}
            adminStatus={adminStatus}
            onAdminUnlock={onAdminUnlock}
            onAdminLock={onAdminLock}
            onAdminChangePin={onAdminChangePin}
            onUpdateReputationSources={onUpdateReputationSources}
            onCreateReputationSource={onCreateReputationSource}
            onUpdateReputationSourceItem={onUpdateReputationSourceItem}
            onDeleteReputationSourceItem={onDeleteReputationSourceItem}
          />
        </div>
      )}
    </div>
  );
};
