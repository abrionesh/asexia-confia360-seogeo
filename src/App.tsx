import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileEdit,
  Globe2,
  HelpCircle,
  Layers,
  Link2,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { ClientMasterRecordView } from './components/ClientMasterRecordView';
import { GeoGridView } from './components/GeoGridView';
import { GeoAIMonitorView } from './components/GeoAIMonitorView';
import { ContentStrategyView } from './components/ContentStrategyView';
import { StrategicCalendarView } from './components/StrategicCalendarView';
import { CampaignsProactiveView } from './components/CampaignsProactiveView';
import { TechnicalSeoView } from './components/TechnicalSeoView';
import { BacklinksView } from './components/BacklinksView';
import { ReputationGbpView } from './components/ReputationGbpView';
import { OnboardingAuditView } from './components/OnboardingAuditView';
import { ModuleReleaseBanner } from './components/ModuleReleaseBanner';
import { ContextualTutorDrawer } from './components/ContextualTutorDrawer';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallControl';
import type {
  AdminLockStatus,
  BacklinkProspect,
  BrandProfile,
  CalendarEvent,
  CatalogItem,
  ClientMasterRecord,
  ClientPaymentRecord,
  ClientSubscriptionItem,
  ConfiaModuleId,
  EcosystemBridgeItem,
  EditorialArticle,
  GbpLocalPost,
  InvitationWebhookConfig,
  MediaCampaign,
  ModuleReleaseNote,
  NavSection,
  ProactiveAlert,
  ProactiveSeoSuggestion,
  ReleaseNoteModuleTarget,
  ReputationSourceCategory,
  ReputationSourcePlatform,
  ReviewAutomationPolicy,
  ReviewIncidentCase,
  ReviewInvitationChannel,
  SeasonalAction,
  StoreState,
  TechnicalIssue,
  UserRole,
} from './types';

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: ConfiaModuleId;
}[] = [
  { id: 'dashboard', label: 'Resumen y ROI', icon: BarChart3 },
  { id: 'client', label: 'Ficha de Cliente Confia360', icon: Briefcase },
  { id: 'reputation', label: 'ReputaciónLocal y GBP', icon: MessageSquare, module: 'reputacion_local' },
  { id: 'geogrid', label: 'Mapa Geo-Grid', icon: MapPin, module: 'seo_geo' },
  { id: 'geo-ai', label: 'Monitor GEO (IAs)', icon: Sparkles, module: 'seo_geo' },
  { id: 'content', label: 'Estrategia y Contenido', icon: FileEdit, module: 'seo_geo' },
  { id: 'technical', label: 'SEO Técnico', icon: Wrench, module: 'seo_geo' },
  { id: 'backlinks', label: 'Backlinks Éticos', icon: Link2, module: 'seo_geo' },
  { id: 'calendar', label: 'Calendario Estratégico', icon: CalendarDays, module: 'campanas' },
  { id: 'campaigns', label: 'Campañas y Avisos', icon: Megaphone, module: 'campanas' },
  { id: 'onboarding', label: 'Onboarding y Auditoría', icon: ShieldCheck },
];

const ROLES: UserRole[] = ['Agencia', 'Propietario', 'Editor', 'Especialista SEO', 'Cliente'];

export default function App() {
  const [store, setStore] = useState<StoreState | null>(null);
  const [section, setSection] = useState<NavSection>('dashboard');
  const [onboardingTab, setOnboardingTab] = useState<
    'onboarding' | 'profile' | 'audit' | 'plans' | 'ecosystem'
  >('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<AdminLockStatus>({
    unlocked: false,
    username: 'Asexia',
    isDefaultPin: true,
    updatedAt: '',
  });

  useEffect(() => {
    fetch('/api/workspace')
      .then((res) => {
        if (!res.ok) throw new Error('Error cargando el espacio de trabajo.');
        return res.json();
      })
      .then((data: StoreState) => setStore(data))
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Error de conexión con el servidor.')
      );

    fetch('/api/admin/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((status: AdminLockStatus | null) => {
        if (status) setAdminStatus(status);
      })
      .catch(() => {});
  }, []);

  const activeProject =
    store?.projects.find((p) => p.id === store.activeProjectId) || store?.projects[0];

  const handleSelectWorkspace = async (payload: { projectId?: string; role?: UserRole }) => {
    const res = await fetch('/api/workspace/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setStore(await res.json());
    }
  };

  const handleLiveGeoCheck = async (payload: { queryId?: string; customQuery?: string }) => {
    if (!activeProject) return;
    const res = await fetch('/api/geo/live-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error ejecutando consulta GEO.');
    setStore(data);
  };

  const handleAnalyzeGeoTrends = async () => {
    if (!activeProject) return;
    const res = await fetch('/api/geo/trend-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error analizando tendencias GEO.');
    setStore(data);
  };

  const handleUpdateGeoOptimization = async (
    suggestionId: string,
    status: ProactiveSeoSuggestion['status']
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/geo/optimizations/${suggestionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando optimización.');
    setStore(data);
  };

  const handleGenerateArticle = async (payload: {
    topic: string;
    intentType: EditorialArticle['intentType'];
    clusterId?: string;
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/content/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error generando borrador.');
    setStore(data.store);
  };

  const handleTransitionArticle = async (
    articleId: string,
    nextStatus: EditorialArticle['status'],
    scheduledFor?: string
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/content/${articleId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, nextStatus, scheduledFor }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando el artículo.');
    setStore(data);
  };

  const handleUpdateTechnical = async (
    issueId: string,
    status: TechnicalIssue['status']
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/technical/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, status }),
    });
    if (res.ok) setStore(await res.json());
  };

  const handleOutreach = async (
    prospectId: string,
    action: 'generate' | 'status',
    nextStatus?: BacklinkProspect['status']
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/backlinks/${prospectId}/outreach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, action, nextStatus }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en módulo de enlaces.');
    setStore(data);
  };

  const handleReviewAction = async (
    reviewId: string,
    action: 'regenerate' | 'approve' | 'publish',
    replyText?: string
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, action, replyText }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando reseña.');
    setStore(data);
  };

  const handleSocialApprove = async (postId: string, status: 'Aprobada' | 'Publicada') => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/social/${postId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, status }),
    });
    if (res.ok) setStore(await res.json());
  };

  const handleSaveProfile = async (updates: Partial<BrandProfile>) => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error guardando perfil.');
    setStore(data);
  };

  const handleCreateProject = async (payload: {
    profile: BrandProfile;
    clusters?: unknown[];
    technicalHints?: unknown[];
    clientIdentification?: object;
  }) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error creando el proyecto.');
    setStore(data);
  };

  const handleSaveClientMaster = async (payload: {
    clientMaster?: Partial<ClientMasterRecord>;
    profileUpdates?: Partial<BrandProfile>;
    reviewPolicyUpdates?: Partial<ReviewAutomationPolicy>;
    invitationConfigUpdates?: Partial<InvitationWebhookConfig>;
  }) => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/client-master`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error guardando la Ficha Única de Cliente.');
    setStore(data);
  };

  const handleAddSubscription = async (payload: Partial<ClientSubscriptionItem>) => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/client-master/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error añadiendo suscripción.');
    setStore(data);
  };

  const handleUpdateSubscription = async (
    subId: string,
    updates: Partial<ClientSubscriptionItem>
  ) => {
    if (!activeProject) return;
    const res = await fetch(
      `/api/projects/${activeProject.id}/client-master/subscriptions/${subId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando suscripción.');
    setStore(data);
  };

  const handleAddPayment = async (payload: Partial<ClientPaymentRecord>) => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/client-master/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error registrando pago o vencimiento.');
    setStore(data);
  };

  const handleUpdatePayment = async (
    paymentId: string,
    updates: Partial<ClientPaymentRecord>
  ) => {
    if (!activeProject) return;
    const res = await fetch(
      `/api/projects/${activeProject.id}/client-master/payments/${paymentId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando pago.');
    setStore(data);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!activeProject) return;
    const res = await fetch(
      `/api/projects/${activeProject.id}/client-master/payments/${paymentId}`,
      {
        method: 'DELETE',
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error eliminando pago.');
    setStore(data);
  };

  const handleSyncConfia360 = async (
    direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional'
  ) => {
    if (!activeProject) return;
    const res = await fetch('/api/confia360/client-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, direction }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error sincronizando Ficha Única con Confia360.');
    setStore(data.store || data);
  };

  const handleCreateReleaseNote = async (payload: {
    version: string;
    title: string;
    summary: string;
    details: string;
    modules: ReleaseNoteModuleTarget[];
    category: ModuleReleaseNote['category'];
  }) => {
    if (!adminToken) throw new Error('Desbloquea primero el panel con tu PIN de administrador.');
    const res = await fetch('/api/release-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error publicando nota de novedad.');
    setStore(data);
  };

  const handleUpdateReleaseNote = async (
    noteId: string,
    updates: Partial<ModuleReleaseNote>
  ) => {
    if (!adminToken) throw new Error('Desbloquea primero el panel con tu PIN de administrador.');
    const res = await fetch(`/api/release-notes/${noteId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error actualizando nota de novedad.');
    setStore(data);
  };

  const handleDeleteReleaseNote = async (noteId: string) => {
    if (!adminToken) throw new Error('Desbloquea primero el panel con tu PIN de administrador.');
    const res = await fetch(`/api/release-notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error eliminando nota de novedad.');
    setStore(data);
  };

  const handleDismissReleaseNote = async (noteId: string, reset = false) => {
    const res = await fetch('/api/release-notes/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, reset }),
    });
    if (res.ok) {
      setStore(await res.json());
    }
  };

  const handleSyncEcosystem = async (
    bridgeId: EcosystemBridgeItem['id'],
    toggleOnly = false
  ) => {
    if (!activeProject) return;
    const res = await fetch('/api/ecosystem/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, bridgeId, toggleOnly }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error sincronizando con Confia360.');
    setStore(data);
  };

  const handleEvaluateProactive = async (scenario?: 'real' | 'rain' | 'heat' | 'cold') => {
    if (!activeProject) return;
    const res = await fetch('/api/proactive/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, scenario }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error evaluando reglas proactivas.');
    setStore(data);
  };

  const handleUpdateStock = async (itemId: string, stockUnits: number) => {
    if (!activeProject) return;
    const res = await fetch(`/api/catalog/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, stockUnits }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando stock.');
    setStore(data);
  };

  const handleAddCatalogItem = async (payload: {
    name: string;
    category: string;
    priceEur: number;
    stockUnits: number;
    seasonality: CatalogItem['seasonality'];
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error creando referencia.');
    setStore(data);
  };

  const handleAlertStatus = async (alertId: string, status: ProactiveAlert['status']) => {
    if (!activeProject) return;
    const res = await fetch(`/api/proactive/alerts/${alertId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando aviso.');
    setStore(data);
  };

  const handleGenerateCampaign = async (payload: {
    channel: MediaCampaign['channel'];
    topic: string;
    budgetEurMonth: number;
    objective: MediaCampaign['objective'];
    alertId?: string;
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/campaigns/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error generando campaña.');
    setStore(data);
  };

  const handleCampaignStatus = async (campaignId: string, status: MediaCampaign['status']) => {
    if (!activeProject) return;
    const res = await fetch(`/api/campaigns/${campaignId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cambiando estado de campaña.');
    setStore(data);
  };

  const handleUpdateReviewPolicy = async (
    mode: ReviewAutomationPolicy['mode'],
    minAutoStars: 4 | 5
  ) => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, mode, minAutoStars }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando política de reseñas.');
    setStore(data);
  };

  const handleSimulateReview = async (payload: {
    author: string;
    rating: number;
    comment: string;
    platform?: ReputationSourcePlatform;
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/reviews/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error evaluando reseña.');
    setStore(data);
  };

  const clearExpiredAdmin = () => {
    setAdminToken(null);
    setAdminStatus((prev) => ({ ...prev, unlocked: false }));
  };

  const handleAdminUnlock = async (username: string, pin: string): Promise<string> => {
    const res = await fetch('/api/admin/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo validar el PIN.');
    setAdminToken(data.token);
    setAdminStatus(data.status);
    return data.token as string;
  };

  const handleAdminLock = async () => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    const res = await fetch('/api/admin/lock', { method: 'POST', headers });
    setAdminToken(null);
    if (res.ok) {
      setAdminStatus(await res.json());
    } else {
      setAdminStatus((prev) => ({ ...prev, unlocked: false }));
    }
  };

  const handleAdminChangePin = async (currentPin: string, newPin: string) => {
    if (!adminToken) throw new Error('Desbloquea primero el panel con tu PIN actual.');
    const res = await fetch('/api/admin/change-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await res.json();
    if (res.status === 401 && !data.error?.includes('actual')) {
      clearExpiredAdmin();
    }
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el PIN.');
    setAdminToken(data.token);
    setAdminStatus(data.status);
    const wsRes = await fetch('/api/workspace');
    if (wsRes.ok) setStore(await wsRes.json());
  };

  const handleUpdateReputationSources = async (
    enabledSources: ReputationSourcePlatform[],
    tokenOverride?: string
  ) => {
    if (!activeProject) return;
    const effectiveToken = tokenOverride || adminToken;
    if (!effectiveToken) throw new Error('Desbloquea la configuración con el PIN de Asexia.');
    const res = await fetch('/api/reputation/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveToken}`,
      },
      body: JSON.stringify({ projectId: activeProject.id, enabledSources }),
    });
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error actualizando fuentes de reputación.');
    setStore(data);
  };

  const handleCreateReputationSource = async (payload: {
    name: string;
    label: string;
    detail: string;
    category: ReputationSourceCategory;
    profileUrl?: string;
    activateNow: boolean;
  }) => {
    if (!activeProject) return;
    if (!adminToken) throw new Error('Desbloquea la configuración con el PIN de Asexia.');
    const res = await fetch('/api/reputation/sources/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error añadiendo fuente al catálogo.');
    setStore(data);
  };

  const handleUpdateReputationSourceItem = async (
    sourceId: string,
    payload: {
      name?: string;
      label: string;
      detail: string;
      category: ReputationSourceCategory;
      profileUrl?: string;
    }
  ) => {
    if (!activeProject) return;
    if (!adminToken) throw new Error('Desbloquea la configuración con el PIN de Asexia.');
    const res = await fetch(`/api/reputation/sources/catalog/${sourceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error modificando fuente.');
    setStore(data);
  };

  const handleDeleteReputationSourceItem = async (sourceId: string) => {
    if (!activeProject) return;
    if (!adminToken) throw new Error('Desbloquea la configuración con el PIN de Asexia.');
    const res = await fetch(
      `/api/reputation/sources/catalog/${sourceId}?projectId=${encodeURIComponent(activeProject.id)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error eliminando fuente.');
    setStore(data);
  };

  const handleAddCalendarEvent = async (payload: {
    date: string;
    title: string;
    scope: CalendarEvent['scope'];
    commercialPriority: CalendarEvent['commercialPriority'];
    linkedCatalogIds?: string[];
    recommendedAction?: string;
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error añadiendo fecha comercial.');
    setStore(data);
  };

  const handleCreateSeasonalAction = async (payload: {
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
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/calendar/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error programando acción estacional.');
    setStore(data);
  };

  const handleUpdateSeasonalAction = async (
    actionId: string,
    updates: { status?: SeasonalAction['status']; scheduledDate?: string }
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/calendar/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando acción estacional.');
    setStore(data);
  };

  const handleDeleteSeasonalAction = async (actionId: string) => {
    if (!activeProject) return;
    const res = await fetch(`/api/calendar/actions/${actionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error eliminando acción estacional.');
    setStore(data);
  };

  const handleToggleModules = async (enabledModules: ConfiaModuleId[]) => {
    if (!activeProject) return;
    if (!adminToken) throw new Error('Desbloquea la configuración con el PIN de Asexia.');
    const res = await fetch('/api/ecosystem/modules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ projectId: activeProject.id, enabledModules }),
    });
    const data = await res.json();
    if (res.status === 401) clearExpiredAdmin();
    if (!res.ok) throw new Error(data.error || 'Error actualizando módulos activos.');
    setStore(data);
  };

  const handleToggleChecklist = async (itemId: string, status: 'Pendiente' | 'Completado') => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/gbp/checklist/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando checklist GBP.');
    setStore(data);
  };

  const handleDismissGbpAlert = async (acceptChange: boolean) => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/gbp/dismiss-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, acceptChange }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error resolviendo alerta de ficha GBP.');
    setStore(data);
  };

  const handleOptimizeGbp = async () => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/gbp/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error optimizando ficha GBP con IA.');
    setStore(data);
  };

  const handleUpdateQa = async (qaId: string, answer: string, status: 'Pendiente' | 'Publicada') => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/gbp/qa/${qaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, answer, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando Q&A.');
    setStore(data);
  };

  const handleCreateGbpPost = async (payload: {
    type: GbpLocalPost['type'];
    title: string;
    body: string;
    ctaText: string;
    scheduledDate: string;
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/gbp/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error creando publicación local.');
    setStore(data);
  };

  const handleUpdateGbpPostStatus = async (postId: string, status: GbpLocalPost['status']) => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/gbp/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando publicación local.');
    setStore(data);
  };

  const handleSendInvitation = async (payload: {
    customerName: string;
    contact: string;
    serviceName: string;
    channel: ReviewInvitationChannel;
    consentVerified: boolean;
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/invitations/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error enviando invitación.');
    setStore(data);
  };

  const handleTriggerWebhook = async (payload: {
    customerName: string;
    contact: string;
    serviceName: string;
    channel: ReviewInvitationChannel;
  }) => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/webhooks/review-trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error disparando webhook.');
    setStore(data.store || data);
  };

  const handleUpdateInvitation = async (
    invitationId: string,
    action: 'remind' | 'click_public' | 'published' | 'private_incident' | 'opt_out',
    privateFeedback?: string
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/invitations/${invitationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, action, privateFeedback }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando invitación.');
    setStore(data);
  };

  const handleUpdateIncident = async (
    incidentId: string,
    updates: {
      status?: ReviewIncidentCase['status'];
      owner?: string;
      resolutionNotes?: string;
    }
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error actualizando incidencia.');
    setStore(data);
  };

  const handleAnalyzeIncidentPatterns = async () => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/incidents/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error analizando patrones de quejas.');
    setStore(data);
  };

  const handleAuditDirectories = async () => {
    if (!activeProject) return;
    const res = await fetch('/api/reputation/directories/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error auditando directorios NAP.');
    setStore(data);
  };

  const handleFixDirectory = async (
    directoryId: string,
    action: 'sync_nap' | 'resolve_duplicate' | 'claim'
  ) => {
    if (!activeProject) return;
    const res = await fetch(`/api/reputation/directories/${directoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: activeProject.id, action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error sincronizando directorio.');
    setStore(data);
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center">
          <h1 className="text-base font-semibold text-slate-900">Error de conexión</h1>
          <p className="mt-2 text-xs text-slate-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!store || !activeProject) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <div className="hidden lg:block w-64 border-r border-slate-200 bg-white p-5 space-y-4">
          <div className="h-6 w-36 rounded bg-slate-100" />
          <div className="h-9 w-full rounded bg-slate-100" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="h-8 w-full rounded bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8 space-y-6">
          <div className="h-10 w-72 rounded bg-slate-200/70" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-28 rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const enabledModules: ConfiaModuleId[] = activeProject.enabledModules || [
    'reputacion_local',
    'seo_geo',
    'campanas',
  ];
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.module || enabledModules.includes(item.module)
  );
  const currentNavItem = NAV_ITEMS.find((i) => i.id === section);
  const effectiveSection: NavSection =
    currentNavItem?.module && !enabledModules.includes(currentNavItem.module)
      ? 'dashboard'
      : section;
  const activeNavLabel = NAV_ITEMS.find((i) => i.id === effectiveSection)?.label || '';

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white shrink-0">
              <Globe2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="block font-display text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Confia360 Suite
              </span>
              <span className="block text-[10px] font-medium text-slate-500 whitespace-nowrap">
                AxesIA · {enabledModules.length} módulos activos
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector de Proyecto / Sede */}
        <div className="px-4 py-4 border-b border-slate-100">
          <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
            Negocio / Sede activa
          </label>
          <select
            value={activeProject.id}
            onChange={(e) => handleSelectWorkspace({ projectId: e.target.value })}
            aria-label="Seleccionar negocio activo"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
          >
            {store.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = effectiveSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  if (item.id === 'onboarding') setOnboardingTab('profile');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setOnboardingTab('ecosystem');
              setSection('onboarding');
              setMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              section === 'onboarding' && onboardingTab === 'ecosystem'
                ? 'bg-blue-50 text-blue-800'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Layers
              className={`h-4 w-4 shrink-0 ${
                section === 'onboarding' && onboardingTab === 'ecosystem'
                  ? 'text-blue-700'
                  : 'text-slate-400'
              }`}
            />
            <span className="truncate">Integración Confia360</span>
          </button>
        </nav>
      </div>

      {/* Instalación PWA y Perfil de usuario */}
      <div className="border-t border-slate-100 px-4 py-4 space-y-3">
        <PWAInstallButton />
        <div className="flex items-center gap-3">
          {avatarFailed ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              LS
            </div>
          ) : (
            <img
              src="/src/assets/images/avatar_confia_user_1795269785991.jpg"
              alt="Lucía Serrano, Dirección SEO-GEO en AxesIA"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900">Lucía Serrano</p>
            <p className="truncate text-[11px] text-slate-500">
              AxesIA · {store.activeRole}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">{SidebarContent}</aside>

      {/* Sidebar Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-xs h-full">{SidebarContent}</div>
        </div>
      )}

      {/* Columna Principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb izquierda — Selector de Rol + 1 CTA primaria derecha */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Abrir navegación"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="hidden sm:inline whitespace-nowrap">AxesIA · Confia360</span>
              <span className="hidden sm:inline">/</span>
              <span className="truncate font-medium text-slate-700">
                {activeProject.profile.companyName}
              </span>
              <span>/</span>
              <span className="truncate font-semibold text-slate-900">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={store.activeRole}
              onChange={(e) => handleSelectWorkspace({ role: e.target.value as UserRole })}
              aria-label="Cambiar rol de vista"
              className="hidden sm:block rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  Vista: {r}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setTutorOpen(true)}
              aria-label="Abrir guía y tutor contextual con voz"
              title="Guía contextual de pantalla y tutor con voz"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 whitespace-nowrap shrink-0"
            >
              <HelpCircle className="h-4 w-4 text-blue-700" />
              <span className="hidden md:inline">Ayuda y Voz</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOnboardingTab('onboarding');
                setSection('onboarding');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nuevo proyecto</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1400px] w-full mx-auto">
          <ModuleReleaseBanner
            section={effectiveSection}
            releaseNotes={store.releaseNotes || []}
            dismissedIds={(store.dismissedReleaseNotesByRole || {})[store.activeRole] || []}
            onDismissNote={handleDismissReleaseNote}
            onOpenTutor={() => setTutorOpen(true)}
          />
          {effectiveSection === 'dashboard' && (
            <ExecutiveDashboard project={activeProject} onNavigate={setSection} />
          )}
          {effectiveSection === 'client' && (
            <ClientMasterRecordView
              project={activeProject}
              adminStatus={adminStatus}
              onSaveClientMaster={handleSaveClientMaster}
              onAddSubscription={handleAddSubscription}
              onUpdateSubscription={handleUpdateSubscription}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onDeletePayment={handleDeletePayment}
              onSyncConfia360={handleSyncConfia360}
              onNavigateToAdmin={() => {
                setOnboardingTab('ecosystem');
                setSection('onboarding');
              }}
            />
          )}
          {effectiveSection === 'geogrid' && <GeoGridView project={activeProject} />}
          {effectiveSection === 'geo-ai' && (
            <GeoAIMonitorView
              project={activeProject}
              onLiveCheck={handleLiveGeoCheck}
              onAnalyzeTrends={handleAnalyzeGeoTrends}
              onUpdateOptimizationStatus={handleUpdateGeoOptimization}
              onGenerateArticle={handleGenerateArticle}
              onScheduleOptimization={async (s) => {
                await handleCreateSeasonalAction({
                  title: `${s.optimizationType}: ${s.targetPageUrl}`,
                  scheduledDate: '2026-11-26',
                  seasonalityTag: 'Sectorial',
                  actionType: 'Artículo SEO/GEO',
                  channel: 'Blog / Web',
                  notes: `${s.title} — ${s.rationale}`,
                  owner: `Responsable (${store.activeRole})`,
                });
              }}
              onNavigate={setSection}
            />
          )}
          {effectiveSection === 'content' && (
            <ContentStrategyView
              project={activeProject}
              activeRole={store.activeRole}
              onGenerateArticle={handleGenerateArticle}
              onTransitionArticle={handleTransitionArticle}
            />
          )}
          {effectiveSection === 'calendar' && (
            <StrategicCalendarView
              project={activeProject}
              onAddEvent={handleAddCalendarEvent}
              onCreateAction={handleCreateSeasonalAction}
              onUpdateAction={handleUpdateSeasonalAction}
              onDeleteAction={handleDeleteSeasonalAction}
              onGenerateArticle={handleGenerateArticle}
              onGenerateCampaign={handleGenerateCampaign}
              onNavigate={setSection}
            />
          )}
          {effectiveSection === 'campaigns' && (
            <CampaignsProactiveView
              project={activeProject}
              onEvaluateProactive={handleEvaluateProactive}
              onUpdateStock={handleUpdateStock}
              onAddCatalogItem={handleAddCatalogItem}
              onAlertStatus={handleAlertStatus}
              onGenerateCampaign={handleGenerateCampaign}
              onCampaignStatus={handleCampaignStatus}
            />
          )}
          {effectiveSection === 'technical' && (
            <TechnicalSeoView project={activeProject} onUpdateStatus={handleUpdateTechnical} />
          )}
          {effectiveSection === 'backlinks' && (
            <BacklinksView project={activeProject} onOutreachAction={handleOutreach} />
          )}
          {effectiveSection === 'reputation' && (
            <ReputationGbpView
              project={activeProject}
              adminStatus={adminStatus}
              onAdminUnlock={handleAdminUnlock}
              onAdminLock={handleAdminLock}
              onAdminChangePin={handleAdminChangePin}
              onUpdateReputationSources={handleUpdateReputationSources}
              onCreateReputationSource={handleCreateReputationSource}
              onUpdateReputationSourceItem={handleUpdateReputationSourceItem}
              onDeleteReputationSourceItem={handleDeleteReputationSourceItem}
              onReviewAction={handleReviewAction}
              onSocialApprove={handleSocialApprove}
              onUpdatePolicy={handleUpdateReviewPolicy}
              onSimulateReview={handleSimulateReview}
              onNavigateToAdminConfig={() => {
                setOnboardingTab('ecosystem');
                setSection('onboarding');
              }}
              onToggleChecklist={handleToggleChecklist}
              onDismissGbpAlert={handleDismissGbpAlert}
              onOptimizeGbp={handleOptimizeGbp}
              onUpdateQa={handleUpdateQa}
              onCreateGbpPost={handleCreateGbpPost}
              onUpdateGbpPostStatus={handleUpdateGbpPostStatus}
              onSendInvitation={handleSendInvitation}
              onTriggerWebhook={handleTriggerWebhook}
              onUpdateInvitation={handleUpdateInvitation}
              onUpdateIncident={handleUpdateIncident}
              onAnalyzeIncidentPatterns={handleAnalyzeIncidentPatterns}
              onAuditDirectories={handleAuditDirectories}
              onFixDirectory={handleFixDirectory}
            />
          )}
          {effectiveSection === 'onboarding' && (
            <OnboardingAuditView
              key={`${activeProject.id}-${onboardingTab}`}
              project={activeProject}
              initialTab={onboardingTab}
              adminStatus={adminStatus}
              releaseNotes={store.releaseNotes || []}
              onAdminUnlock={handleAdminUnlock}
              onAdminLock={handleAdminLock}
              onAdminChangePin={handleAdminChangePin}
              onSaveProfile={handleSaveProfile}
              onCreateProject={handleCreateProject}
              onSyncEcosystem={handleSyncEcosystem}
              onToggleModules={handleToggleModules}
              onUpdateReputationSources={handleUpdateReputationSources}
              onCreateReputationSource={handleCreateReputationSource}
              onUpdateReputationSourceItem={handleUpdateReputationSourceItem}
              onDeleteReputationSourceItem={handleDeleteReputationSourceItem}
              onCreateReleaseNote={handleCreateReleaseNote}
              onUpdateReleaseNote={handleUpdateReleaseNote}
              onDeleteReleaseNote={handleDeleteReleaseNote}
              onNavigateToClientMaster={() => setSection('client')}
            />
          )}
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          Derechos reservados by MundoConfIA
        </footer>
      </div>
      <ContextualTutorDrawer
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        section={effectiveSection}
        subTab={effectiveSection === 'onboarding' ? onboardingTab : undefined}
        project={activeProject}
      />
      <OfflineIndicator />
    </div>
  );
}
