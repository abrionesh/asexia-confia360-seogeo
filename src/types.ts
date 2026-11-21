export type UserRole =
  | 'Propietario'
  | 'Editor'
  | 'Especialista SEO'
  | 'Agencia'
  | 'Cliente';

export type NavSection =
  | 'dashboard'
  | 'client'
  | 'geogrid'
  | 'geo-ai'
  | 'content'
  | 'calendar'
  | 'campaigns'
  | 'technical'
  | 'backlinks'
  | 'reputation'
  | 'onboarding';

export interface BrandProfile {
  companyName: string;
  domain: string;
  sector: string;
  country: string;
  primaryCity: string;
  language: string;
  valueProposition: string;
  targetAudience: string;
  services: string[];
  competitors: string[];
  yearsExperience: number;
  certifications: string[];
  priceRange: string;
  guarantees: string;
  commercialPolicy: string;
  forbiddenClaims: string[];
  brandTone: string;
  gdprCompliant: boolean;
  lastAuditedAt: string;
}

export interface GeoGridNode {
  id: string;
  row: number;
  col: number;
  lat: number;
  lng: number;
  zoneName: string;
  postalCode: string;
  rank: number; // 1-20 (21 = >20)
  previousRank: number;
  topCompetitors: { name: string; rank: number; rating: number; reviews: number }[];
}

export interface GeoKeywordTrack {
  id: string;
  keyword: string;
  sedeName: string;
  city: string;
  radiusKm: number;
  gridSize: 5 | 7;
  avgRank: number;
  top3Pct: number;
  visibilityScore: number;
  monthlySearches: number;
  nodes: GeoGridNode[];
}

export interface PostalZoneMetric {
  postalCode: string;
  district: string;
  impressions: number;
  clicks: number;
  calls: number;
  whatsappClicks: number;
  directionRequests: number;
  formLeads: number;
  avgPosition: number;
  conversionRate: number;
}

export interface RoiTimelinePoint {
  period: string;
  organicTraffic: number;
  totalLeads: number;
  aiMentions: number;
  cplEur: number;
}

export type ArticleStatus =
  | 'Borrador IA'
  | 'Revisión Automática'
  | 'Pendiente Aprobación'
  | 'Aprobado y Programado'
  | 'Publicado';

export interface TopicCluster {
  id: string;
  pillarTitle: string;
  intentScope: 'Google SEO' | 'GEO IA' | 'Mixto SEO + GEO';
  commercialGoal: 'Leads' | 'Autoridad' | 'Menciones IA' | 'Tráfico Local';
  difficulty: number;
  estimatedVolume: number;
  leadPotential: 'Alto' | 'Medio' | 'Exploratorio';
  dueDate: string;
  owner: string;
  status: 'Planificado' | 'En Redacción' | 'En Revisión' | 'Completado';
}

export interface EditorialArticle {
  id: string;
  clusterId: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  url: string;
  intentType: 'Google Local' | 'GEO Conversacional' | 'Comparativa' | 'Caso de Éxito';
  status: ArticleStatus;
  authorHuman: string;
  aiModel: string;
  promptSummary: string;
  reviewedBy?: string;
  reviewedAt?: string;
  scheduledFor?: string;
  originalityScore: number;
  sensitiveClaimFlag: boolean;
  complianceChecked: boolean;
  sections: { heading: string; level: 'H2' | 'H3'; body: string }[];
  faq: { question: string; answer: string }[];
  ctaText: string;
  jsonLdType: 'Article' | 'FAQPage' | 'LocalBusiness' | 'Service';
  jsonLdCode: string;
  internalLinks: string[];
  sources: { title: string; url: string; verified: boolean }[];
  imageSuggestion: { altText: string; description: string };
  estimatedLeadsMonth: number;
}

export interface AIEngineStatus {
  engine: 'ChatGPT' | 'Perplexity' | 'Gemini' | 'Claude';
  mentioned: boolean;
  position: number | null;
  sentiment: 'Positivo' | 'Neutral' | 'Ausente';
  citedUrls: string[];
}

export interface GeoTrendPoint {
  period: string;
  shareOfVoicePct: number;
  queryVolumeIndex: number;
}

export interface GeoAIQuery {
  id: string;
  query: string;
  category: 'Recomendación' | 'Comparativa' | 'Precio' | 'Local';
  brandAppears: boolean;
  shareOfVoicePct: number;
  competitorsMentioned: string[];
  engines: AIEngineStatus[];
  missingContentOpportunity: string;
  lastCheckedAt: string;
  liveSummary?: string;
  liveSources?: { title: string; uri: string }[];
  trendHistory?: GeoTrendPoint[];
  forecastedDropPct?: number;
  forecastReason?: string;
}

export interface ProactiveSeoSuggestion {
  id: string;
  queryId: string;
  targetPageUrl: string;
  targetPageTitle: string;
  optimizationType:
    | 'Actualizar Landing Page'
    | 'Añadir Schema JSON-LD'
    | 'Reforzar FAQ Conversacional'
    | 'Comparativa y Precios';
  forecastedDropPct: number;
  urgency: 'Alta' | 'Media';
  title: string;
  rationale: string;
  actionSteps: string[];
  estimatedRecoveryPct: number;
  status: 'Pendiente' | 'En curso' | 'Aplicada' | 'Descartada';
  createdAt: string;
}

export interface TechnicalIssue {
  id: string;
  url: string;
  category:
    | 'Indexación'
    | 'Core Web Vitals'
    | 'Schema Markup'
    | 'Metadatos'
    | 'Enlaces Rotos'
    | 'Canibalización';
  title: string;
  recommendation: string;
  impact: 'Alto' | 'Medio' | 'Bajo';
  effort: 'Bajo' | 'Medio' | 'Alto';
  status: 'Pendiente' | 'En curso' | 'Resuelto';
  detectedAt: string;
}

export interface BacklinkProspect {
  id: string;
  domain: string;
  category: 'Prensa Local' | 'Asociación' | 'Directorio Sectorial' | 'Universidad' | 'Digital PR';
  relevanceScore: number;
  estimatedTraffic: number;
  spamScore: number;
  editorialJustification: string;
  anchorSuggestion: string;
  status: 'Prospecto' | 'Outreach Enviado' | 'Negociación' | 'Conseguido' | 'Descartado';
  outreachDraft?: string;
  contactEmail?: string;
}

export type ReputationSourceCategory = 'base' | 'sectorial' | 'social';

export type ReputationSourcePlatform =
  | 'Google Business Profile'
  | 'Trustpilot'
  | 'TripAdvisor'
  | 'Doctoralia'
  | 'Habitissimo'
  | 'Meta (Instagram/Facebook)'
  | 'TikTok'
  | 'YouTube'
  | (string & {});

export interface ReputationSourceDefinition {
  id: string;
  name: ReputationSourcePlatform;
  label: string;
  detail: string;
  category: ReputationSourceCategory;
  profileUrl?: string;
  isDefault?: boolean;
}

export interface GbpReview {
  id: string;
  author: string;
  sede: string;
  platform?: ReputationSourcePlatform;
  channelKind?: 'Reseña Local' | 'Portal Sectorial' | 'Comentario Social';
  rating: number;
  date: string;
  comment: string;
  sentiment: 'Positivo' | 'Neutro' | 'Crítico';
  suggestedReply: string;
  replyStatus: 'Pendiente Aprobación' | 'Aprobada' | 'Publicada';
}

export interface SocialAdaptation {
  id: string;
  articleId: string;
  channel: 'LinkedIn' | 'Instagram' | 'Facebook' | 'Reddit / Quora';
  format: 'Carrusel' | 'Post Ejecutivo' | 'Hilo' | 'Respuesta con Divulgación';
  copy: string;
  antiSpamNote?: string;
  scheduledDate: string;
  status: 'Pendiente Aprobación' | 'Aprobada' | 'Publicada';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  module: string;
  action: string;
  detail: string;
}

export interface EcosystemBridgeItem {
  id: 'crm-leads' | 'kit-digital' | 'portal-roi';
  moduleName: string;
  ecosystemSuite: 'Confia360 CRM' | 'Confia360 Kit Digital' | 'Confia360 Portal Cliente';
  description: string;
  status: 'Conectado' | 'Pendiente';
  lastSyncAt: string;
  syncedRecords: number;
  endpointPath: string;
}

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceEur: number;
  stockUnits: number;
  minThreshold: number;
  surplusThreshold: number;
  seasonality: 'Todo el año' | 'Lluvia / Frío' | 'Calor / Verano' | 'Cierre Fiscal / Campaña';
  linkedWebPath: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  scope: 'Nacional' | 'Local Sede' | 'Sectorial';
  commercialPriority: 'Alta' | 'Media';
  linkedCatalogIds: string[];
  recommendedAction: string;
}

export interface WeatherSnapshot {
  city: string;
  lat: number;
  lng: number;
  temperatureC: number;
  precipitationMm: number;
  precipitationProbPct: number;
  conditionLabel: string;
  scenarioMode: 'real' | 'rain' | 'heat' | 'cold';
  sourceLabel: string;
  updatedAt: string;
}

export interface ProactiveAlert {
  id: string;
  triggerType: 'Clima' | 'Stock' | 'Calendario' | 'Combinado';
  severity: 'Oportunidad' | 'Preventiva' | 'Crítica';
  title: string;
  detail: string;
  recommendedChannel: 'Meta Ads' | 'TikTok' | 'YouTube' | 'Google Business Profile';
  suggestedTopic: string;
  relatedCatalogId?: string;
  status: 'Activa' | 'Convertida en campaña' | 'Descartada';
  createdAt: string;
}

export interface MediaCampaign {
  id: string;
  channel: 'Meta Ads' | 'TikTok' | 'YouTube';
  title: string;
  objective: 'Leads locales' | 'Tráfico web' | 'Reconocimiento local' | 'Liquidación stock';
  status: 'Borrador' | 'Aprobada' | 'Activa' | 'Pausada';
  budgetEurMonth: number;
  targetPostalCodes: string[];
  calendarOrAlertRef: string;
  hook3s: string;
  videoScript: string;
  adCopyPrimary: string;
  adHeadline: string;
  ctaLabel: string;
  estimatedLeads: number;
  estimatedCplEur: number;
  createdAt: string;
}

export interface ReviewAutomationPolicy {
  mode: 'Mixto' | 'Semiautomático' | 'Automático';
  minAutoStars: 4 | 5;
  lastUpdatedAt: string;
}

export interface SeasonalAction {
  id: string;
  title: string;
  scheduledDate: string; // YYYY-MM-DD
  seasonalityTag:
    | 'Lluvia / Frío'
    | 'Calor / Verano'
    | 'Campaña Comercial / Festivo'
    | 'Sectorial'
    | 'Todo el año';
  actionType:
    | 'Artículo SEO/GEO'
    | 'Campaña Meta/TikTok/YT'
    | 'Publicación GBP / Redes'
    | 'Ajuste Stock / Oferta';
  channel:
    | 'Blog / Web'
    | 'Meta Ads'
    | 'TikTok'
    | 'YouTube'
    | 'Google Business Profile'
    | 'LinkedIn / Instagram';
  linkedEventId?: string;
  linkedAlertId?: string;
  linkedCatalogId?: string;
  notes: string;
  owner: string;
  status: 'Programada' | 'En curso' | 'Completada' | 'Cancelada';
}

export type ConfiaModuleId = 'reputacion_local' | 'seo_geo' | 'campanas';

export interface GbpChecklistItem {
  id: string;
  category:
    | 'Identidad y Categorías'
    | 'Horarios y Festivos'
    | 'Servicios y Atributos'
    | 'Fotos y Medios'
    | 'Preguntas y Terceros';
  title: string;
  detail: string;
  impact: 'Alto' | 'Medio';
  autoFixable: boolean;
  status: 'Pendiente' | 'Completado';
  aiSuggestion?: string;
}

export interface GbpQaItem {
  id: string;
  question: string;
  answer: string;
  source: 'Usuario GBP' | 'Sugerida IA';
  status: 'Pendiente' | 'Publicada';
}

export interface GbpLocalPost {
  id: string;
  type: 'Novedad' | 'Oferta' | 'Evento';
  title: string;
  body: string;
  ctaText: string;
  scheduledDate: string;
  status: 'Borrador IA' | 'Aprobada' | 'Publicada';
}

export interface GbpProfileAudit {
  verified: boolean;
  primaryCategory: string;
  secondaryCategories: string[];
  completenessScore: number;
  photosCount: number;
  recommendedPhotosCount: number;
  thirdPartyChangeAlert: string | null;
  optimizedDescription: string;
  checklist: GbpChecklistItem[];
  qas: GbpQaItem[];
  localPosts: GbpLocalPost[];
  lastAuditedAt: string;
}

export type ReviewInvitationChannel = 'WhatsApp' | 'SMS' | 'Email';

export type ReviewInvitationStatus =
  | 'Enviada'
  | 'Recordatorio Enviado'
  | 'Clic Enlace Público'
  | 'Reseña Publicada'
  | 'Incidencia Privada'
  | 'Baja RGPD';

export interface ReviewInvitation {
  id: string;
  customerName: string;
  contact: string;
  serviceName: string;
  channel: ReviewInvitationChannel;
  status: ReviewInvitationStatus;
  sentAt: string;
  remindersSent: number;
  maxReminders: number;
  consentVerified: boolean;
  publicLinkUsed: string;
  privateSupportTriggered: boolean;
}

export interface InvitationWebhookConfig {
  enabled: boolean;
  endpointPath: string;
  webhookSecretPreview: string;
  publicReviewUrl: string;
  privateSupportLabel: string;
  defaultChannel: ReviewInvitationChannel;
  maxReminders: 1 | 2;
  whatsappTemplate: string;
  smsTemplate: string;
  emailSubject: string;
  emailTemplate: string;
  lastTriggeredAt?: string;
}

export type ReviewIncidentCategory =
  | 'Precio'
  | 'Espera / Retraso'
  | 'Trato'
  | 'Calidad'
  | 'Facturación'
  | 'Otro';

export type ReviewIncidentStatus =
  | 'Abierta'
  | 'En gestión'
  | 'Contacto realizado'
  | 'Resuelta'
  | 'Cerrada';

export interface ReviewIncidentCase {
  id: string;
  source:
    | 'Reseña GBP'
    | 'Canal Privado Paralelo'
    | 'Directorio Externo'
    | 'Portal Sectorial'
    | 'Comentario Social';
  reviewId?: string;
  customerName: string;
  rating?: number;
  platform: string;
  category: ReviewIncidentCategory;
  severity: 'Alta' | 'Media';
  summary: string;
  status: ReviewIncidentStatus;
  owner: string;
  slaDueAt: string;
  suggestedAction: string;
  resolutionNotes: string;
  createdAt: string;
}

export interface ReputationKpiPoint {
  period: string;
  avgRating: number;
  competitorAvgRating: number;
  responseRatePct: number;
  mapsVisibilitySharePct: number;
  competitorTopSharePct: number;
  reviewsCount: number;
}

export interface ReputationCompetitorBenchmark {
  id: string;
  name: string;
  avgRating: number;
  reviewsCount: number;
  responseRatePct: number;
  mapsSharePct: number;
}

export type DirectoryStatus =
  | 'Sincronizado'
  | 'Inconsistencia NAP'
  | 'Duplicado Detectado'
  | 'Sin Reclamar'
  | 'Pendiente';

export interface DirectoryListing {
  id: string;
  directoryName: string;
  tier: 'Esencial' | 'Sectorial' | 'Redes / Mapas';
  profileUrl: string;
  status: DirectoryStatus;
  detectedName: string;
  detectedAddress: string;
  detectedPhone: string;
  detectedHours: string;
  discrepancies: string[];
  duplicateCount: number;
  solicitationPolicy:
    | 'Invitación neutra permitida'
    | 'No solicitar reseñas (regla plataforma)'
    | 'Solo ficha y catálogo';
  lastCheckedAt: string;
}

export interface IncidentPatternSummary {
  topPatterns: { theme: string; count: number; recommendation: string }[];
  analyzedAt: string;
}

export type ClientAccountStatus = 'Activo' | 'En Onboarding' | 'Pausado' | 'Riesgo de Impago';

export interface ClientSubscriptionItem {
  id: string;
  planName: string;
  modulesIncluded: ConfiaModuleId[];
  billingCycle: 'Mensual' | 'Trimestral' | 'Anual';
  amountEur: number;
  status: 'Activa' | 'Pausada' | 'Pendiente Activación' | 'Cancelada';
  startDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
}

export interface ClientPaymentRecord {
  id: string;
  concept: string;
  invoiceNumber: string;
  amountEur: number;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod: 'Domiciliación SEPA' | 'Tarjeta Corporativa' | 'Transferencia';
  status: 'Pagado' | 'Pendiente' | 'Vencido';
}

export interface ClientConfiaSyncMeta {
  confiaClientId: string;
  apiEndpointUrl: string;
  syncStatus: 'Sincronizado' | 'Pendiente' | 'Error';
  lastSyncedAt: string;
  lastSyncDirection: 'Push a Confia360' | 'Pull desde Confia360' | 'Bidireccional';
  syncedModulesSummary: string;
  priorityMode: 'Ficha Maestra Prioritaria';
}

export interface ClientMasterRecord {
  confiaCode: string;
  legalName: string;
  commercialName: string;
  taxId: string;
  sector: string;
  fiscalAddress: string;
  postalCode: string;
  city: string;
  country: string;
  primaryContactName: string;
  primaryContactRole: string;
  email: string;
  phone: string;
  website: string;
  locations: string[];
  accountStatus: ClientAccountStatus;
  accountManager: string;
  onboardingDate: string;
  renewalDate: string;
  lastReviewDate: string;
  nextReviewDate: string;
  notes: string;
  subscriptions: ClientSubscriptionItem[];
  payments: ClientPaymentRecord[];
  notificationEmail: string;
  billingEmail: string;
  preferredLanguage: string;
  confiaSync: ClientConfiaSyncMeta;
  updatedAt: string;
}

export type ReleaseNoteModuleTarget = NavSection;

export interface ModuleReleaseNote {
  id: string;
  version: string;
  title: string;
  summary: string;
  details: string;
  modules: ReleaseNoteModuleTarget[];
  category: 'Nueva función' | 'Mejora' | 'Integración';
  publishedAt: string;
  publishedBy: string;
  active: boolean;
}

export interface ProjectWorkspace {
  id: string;
  name: string;
  plan: 'Starter' | 'Growth' | 'Agency' | 'Enterprise';
  enabledModules: ConfiaModuleId[];
  profile: BrandProfile;
  clientMaster?: ClientMasterRecord;
  kpis: {
    leadsMonth: number;
    leadsDeltaPct: number;
    cplEur: number;
    estimatedRoiPct: number;
    avgGeoGridPos: number;
    aiShareOfVoicePct: number;
    gbpCallsAndWhatsapp: number;
    technicalHealthPct: number;
  };
  roiTimeline: RoiTimelinePoint[];
  geoKeywords: GeoKeywordTrack[];
  postalMetrics: PostalZoneMetric[];
  clusters: TopicCluster[];
  articles: EditorialArticle[];
  aiQueries: GeoAIQuery[];
  technicalIssues: TechnicalIssue[];
  backlinks: BacklinkProspect[];
  reviews: GbpReview[];
  socialPosts: SocialAdaptation[];
  auditLogs: AuditLogEntry[];
  ecosystemLinks: EcosystemBridgeItem[];
  catalog: CatalogItem[];
  calendarEvents: CalendarEvent[];
  weather: WeatherSnapshot;
  proactiveAlerts: ProactiveAlert[];
  campaigns: MediaCampaign[];
  reviewPolicy: ReviewAutomationPolicy;
  seasonalActions: SeasonalAction[];
  proactiveSeoSuggestions: ProactiveSeoSuggestion[];
  gbpAudit: GbpProfileAudit;
  invitationConfig: InvitationWebhookConfig;
  reviewInvitations: ReviewInvitation[];
  reviewIncidents: ReviewIncidentCase[];
  directoryListings: DirectoryListing[];
  incidentPatternSummary?: IncidentPatternSummary;
  socialListeningAddonEnabled: boolean;
  enabledReputationSources?: ReputationSourcePlatform[];
  reputationSourcesCatalog?: ReputationSourceDefinition[];
  reputationKpisTimeline: ReputationKpiPoint[];
  reputationCompetitors: ReputationCompetitorBenchmark[];
}

export interface AdminLockStatus {
  unlocked: boolean;
  username: string;
  isDefaultPin: boolean;
  updatedAt: string;
  envManaged?: boolean;
}

export interface StoreState {
  activeProjectId: string;
  activeRole: UserRole;
  projects: ProjectWorkspace[];
  releaseNotes?: ModuleReleaseNote[];
  dismissedReleaseNotesByRole?: Record<string, string[]>;
}
