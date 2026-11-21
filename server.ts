import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  ALL_REPUTATION_SOURCES,
  CORE_REPUTATION_SOURCES,
  createDefaultClientMaster,
  createDefaultGrowthExtensions,
  createDefaultReputationExtensions,
  DEFAULT_ECOSYSTEM_LINKS,
  DEFAULT_RELEASE_NOTES,
  DEFAULT_REPUTATION_SOURCE_CATALOG,
  INITIAL_STORE,
  SOCIAL_REPUTATION_SOURCES,
} from './src/data/seedData.ts';
import type {
  BrandProfile,
  CalendarEvent,
  ClientAccountStatus,
  ClientMasterRecord,
  ClientPaymentRecord,
  ClientSubscriptionItem,
  ConfiaModuleId,
  EcosystemBridgeItem,
  EditorialArticle,
  GbpLocalPost,
  GeoGridNode,
  InvitationWebhookConfig,
  MediaCampaign,
  ModuleReleaseNote,
  ProactiveAlert,
  ProactiveSeoSuggestion,
  ProjectWorkspace,
  ReleaseNoteModuleTarget,
  ReputationSourceCategory,
  ReputationSourceDefinition,
  ReputationSourcePlatform,
  ReviewAutomationPolicy,
  ReviewIncidentCase,
  ReviewInvitation,
  ReviewInvitationChannel,
  ReviewInvitationStatus,
  SeasonalAction,
  StoreState,
  UserRole,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');
const ADMIN_AUTH_PATH = path.resolve(DATA_DIR, 'admin-auth.json');

interface AdminAuthRecord {
  username: string;
  pinSalt: string;
  pinHash: string;
  isDefaultPin: boolean;
  updatedAt: string;
}

const adminSessions = new Map<string, { username: string; expiresAt: number }>();
const adminFailedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function hashPinWithSalt(pin: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return { salt, hash };
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function ensureAdminAuth(): AdminAuthRecord {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(ADMIN_AUTH_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(ADMIN_AUTH_PATH, 'utf-8')) as AdminAuthRecord;
      if (parsed?.username && parsed?.pinSalt && parsed?.pinHash) {
        return parsed;
      }
    } catch {
      // Re-seed if malformed
    }
  }
  const envPin = process.env.CONFIA_ADMIN_PIN?.trim();
  const initialPin = envPin || '0204';
  const { salt, hash } = hashPinWithSalt(initialPin);
  const record: AdminAuthRecord = {
    username: 'Asexia',
    pinSalt: salt,
    pinHash: hash,
    isDefaultPin: !envPin,
    updatedAt: nowStamp(),
  };
  fs.writeFileSync(ADMIN_AUTH_PATH, JSON.stringify(record, null, 2), { encoding: 'utf-8', mode: 0o600 });
  return record;
}

function saveAdminAuth(record: AdminAuthRecord): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(ADMIN_AUTH_PATH, JSON.stringify(record, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

function verifyAdminPin(pin: string, record: AdminAuthRecord): boolean {
  const envPin = process.env.CONFIA_ADMIN_PIN?.trim();
  if (envPin) {
    return timingSafeTextEqual(pin, envPin);
  }
  const derived = crypto.scryptSync(pin, record.pinSalt, 64);
  const expected = Buffer.from(record.pinHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function extractBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

function getValidAdminSession(req: express.Request): { token: string; username: string } | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return null;
  }
  return { token, username: session.username };
}

function requireAdminSession(
  req: express.Request,
  res: express.Response
): { token: string; username: string } | null {
  const session = getValidAdminSession(req);
  if (!session) {
    res.status(401).json({
      error: 'Se requiere clave PIN de administrador (usuario Asexia) para modificar esta configuración.',
    });
    return null;
  }
  return session;
}

function ensureStore(): StoreState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_STORE, null, 2), 'utf-8');
    return structuredClone(INITIAL_STORE);
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoreState;
    let migrated = false;
    parsed.projects = parsed.projects.map((p) => {
      let updated = p;
      if (!updated.ecosystemLinks) {
        migrated = true;
        updated = {
          ...updated,
          ecosystemLinks: DEFAULT_ECOSYSTEM_LINKS.map((l) => ({ ...l })),
        };
      }
      if (
        !updated.catalog ||
        !updated.weather ||
        !updated.campaigns ||
        !updated.reviewPolicy ||
        !updated.seasonalActions ||
        !updated.proactiveSeoSuggestions
      ) {
        migrated = true;
        const ext = createDefaultGrowthExtensions(
          updated.profile?.primaryCity || 'Madrid',
          updated.profile?.sector || 'Consultoría Pyme'
        );
        updated = {
          ...updated,
          catalog: updated.catalog || ext.catalog,
          calendarEvents: updated.calendarEvents || ext.calendarEvents,
          weather: updated.weather || ext.weather,
          proactiveAlerts: updated.proactiveAlerts || ext.proactiveAlerts,
          campaigns: updated.campaigns || ext.campaigns,
          reviewPolicy: updated.reviewPolicy || ext.reviewPolicy,
          seasonalActions: updated.seasonalActions || ext.seasonalActions,
          proactiveSeoSuggestions:
            updated.proactiveSeoSuggestions || ext.proactiveSeoSuggestions,
        };
      }
      if (
        !updated.enabledModules ||
        !updated.gbpAudit ||
        !updated.invitationConfig ||
        !updated.reviewInvitations ||
        !updated.reviewIncidents ||
        !updated.directoryListings ||
        updated.socialListeningAddonEnabled === undefined ||
        !updated.enabledReputationSources ||
        !updated.reputationSourcesCatalog ||
        !updated.reputationKpisTimeline ||
        !updated.reputationCompetitors
      ) {
        migrated = true;
        const repExt = createDefaultReputationExtensions(
          updated.profile?.companyName || updated.name || 'AsexIA',
          updated.profile?.domain || 'https://asexia.es',
          updated.profile?.primaryCity || 'Madrid',
          updated.profile?.sector || 'Consultoría Pyme'
        );
        const socialAddon =
          updated.socialListeningAddonEnabled ?? repExt.socialListeningAddonEnabled;
        const defaultSources: ReputationSourcePlatform[] = socialAddon
          ? [...ALL_REPUTATION_SOURCES]
          : [...CORE_REPUTATION_SOURCES];
        updated = {
          ...updated,
          enabledModules: updated.enabledModules || repExt.enabledModules,
          gbpAudit: updated.gbpAudit || repExt.gbpAudit,
          invitationConfig: updated.invitationConfig || repExt.invitationConfig,
          reviewInvitations: updated.reviewInvitations || repExt.reviewInvitations,
          reviewIncidents: updated.reviewIncidents || repExt.reviewIncidents,
          directoryListings: updated.directoryListings || repExt.directoryListings,
          socialListeningAddonEnabled: socialAddon,
          enabledReputationSources: updated.enabledReputationSources || defaultSources,
          reputationSourcesCatalog:
            updated.reputationSourcesCatalog || repExt.reputationSourcesCatalog,
          reputationKpisTimeline: updated.reputationKpisTimeline || repExt.reputationKpisTimeline,
          reputationCompetitors: updated.reputationCompetitors || repExt.reputationCompetitors,
        };
      }
      if (updated.aiQueries?.some((q) => !q.trendHistory)) {
        migrated = true;
        updated = {
          ...updated,
          aiQueries: updated.aiQueries.map((q) => {
            if (q.trendHistory) return q;
            const base = q.shareOfVoicePct || 20;
            const drop = q.brandAppears ? -6.5 : -14.8;
            return {
              ...q,
              trendHistory: [
                { period: 'Ago', shareOfVoicePct: Math.min(95, base + 4), queryVolumeIndex: 84 },
                { period: 'Sep', shareOfVoicePct: Math.min(95, base + 2), queryVolumeIndex: 81 },
                { period: 'Oct', shareOfVoicePct: Math.min(95, base + 1), queryVolumeIndex: 77 },
                { period: 'Nov', shareOfVoicePct: base, queryVolumeIndex: 73 },
              ],
              forecastedDropPct: drop,
              forecastReason:
                q.missingContentOpportunity ||
                'Descenso previsto por mayor competencia conversacional y falta de FAQ estructurada.',
            };
          }),
        };
      }
      const originalId = updated.id;
      const serializedWithoutId = JSON.stringify({ ...updated, id: '' });
      if (
        /MundoConf[íi]a|mundoconfia\.es/i.test(serializedWithoutId) ||
        /AsexIA\.es/.test(serializedWithoutId)
      ) {
        migrated = true;
        const normalized = JSON.parse(
          JSON.stringify(updated)
            .replace(/mundoconfia\.es/gi, 'asexia.es')
            .replace(/AsexIA\.es/g, 'asexia.es')
            .replace(/MundoConf[íi]a/gi, 'AsexIA')
        ) as ProjectWorkspace;
        normalized.id = originalId;
        updated = normalized;
      }
      if (
        updated.reviews?.some((r) => !r.platform || !r.channelKind) ||
        !updated.reviews?.some((r) => r.platform === 'TripAdvisor' || r.platform === 'Doctoralia')
      ) {
        const seedProject = INITIAL_STORE.projects.find((sp) => sp.id === updated.id);
        const normalizedExisting = (updated.reviews || []).map((r) => {
          if (r.platform && r.channelKind) return r;
          const inferredPlatform: ReputationSourcePlatform =
            r.platform ||
            (r.id === 'rev-2' || /trustpilot/i.test(r.sede)
              ? 'Trustpilot'
              : /tripadvisor/i.test(r.sede)
                ? 'TripAdvisor'
                : /doctoralia/i.test(r.sede)
                  ? 'Doctoralia'
                  : /habitissimo/i.test(r.sede)
                    ? 'Habitissimo'
                    : /tiktok/i.test(r.sede)
                      ? 'TikTok'
                      : /youtube/i.test(r.sede)
                        ? 'YouTube'
                        : /meta|instagram|facebook/i.test(r.sede)
                          ? 'Meta (Instagram/Facebook)'
                          : 'Google Business Profile');
          const isSocial =
            inferredPlatform === 'Meta (Instagram/Facebook)' ||
            inferredPlatform === 'TikTok' ||
            inferredPlatform === 'YouTube';
          const isDirectory =
            inferredPlatform === 'Trustpilot' ||
            inferredPlatform === 'TripAdvisor' ||
            inferredPlatform === 'Doctoralia' ||
            inferredPlatform === 'Habitissimo';
          const inferredKind: 'Reseña Local' | 'Portal Sectorial' | 'Comentario Social' =
            r.channelKind ||
            (isSocial ? 'Comentario Social' : isDirectory ? 'Portal Sectorial' : 'Reseña Local');
          return {
            ...r,
            platform: inferredPlatform,
            channelKind: inferredKind,
          };
        });
        const existingIds = new Set(normalizedExisting.map((r) => r.id));
        const missingSeedReviews =
          seedProject?.reviews.filter((sr) => !existingIds.has(sr.id)) || [];
        if (
          missingSeedReviews.length > 0 ||
          normalizedExisting.some((r, idx) => r !== updated.reviews[idx])
        ) {
          migrated = true;
          updated = {
            ...updated,
            reviews: [...normalizedExisting, ...missingSeedReviews],
          };
        }
      }
      if (!updated.clientMaster) {
        migrated = true;
        updated = {
          ...updated,
          clientMaster: createDefaultClientMaster({
            companyName: updated.profile?.companyName || updated.name || 'Cliente Confia360',
            domain: updated.profile?.domain || 'https://asexia.es',
            city: updated.profile?.primaryCity || 'Madrid',
            sector: updated.profile?.sector || 'Consultoría Pyme',
            plan: updated.plan,
            enabledModules: updated.enabledModules,
            language: updated.profile?.language,
            country: updated.profile?.country,
          }),
        };
      }
      return updated;
    });
    if (!parsed.releaseNotes || parsed.releaseNotes.length === 0) {
      migrated = true;
      parsed.releaseNotes = DEFAULT_RELEASE_NOTES.map((n) => ({ ...n }));
    }
    if (!parsed.dismissedReleaseNotesByRole) {
      migrated = true;
      parsed.dismissedReleaseNotesByRole = {};
    }
    if (migrated) saveStore(parsed);
    return parsed;
  } catch {
    fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_STORE, null, 2), 'utf-8');
    return structuredClone(INITIAL_STORE);
  }
}

function saveStore(state: StoreState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'No se ha configurado GEMINI_API_KEY en el entorno del servidor. Añádela en Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function nowStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function buildStarterGrid(city: string, competitors: string[]): GeoGridNode[] {
  const nodes: GeoGridNode[] = [];
  const baseLat = 40.4168;
  const baseLng = -3.7038;
  const comps = competitors.length >= 3 ? competitors : ['Competidor Local A', 'Competidor Local B', 'Competidor Local C'];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const dist = Math.abs(r - 2) + Math.abs(c - 2);
      const rank = Math.min(18, Math.max(1, 2 + dist * 2 + ((r + c) % 2)));
      nodes.push({
        id: `node-${r}-${c}`,
        row: r,
        col: c,
        lat: Number((baseLat + (2 - r) * 0.011).toFixed(4)),
        lng: Number((baseLng + (c - 2) * 0.014).toFixed(4)),
        zoneName: `${city} Zona ${r * 5 + c + 1}`,
        postalCode: `280${String(10 + r * 3 + c).padStart(2, '0')}`,
        rank,
        previousRank: Math.min(20, rank + 1),
        topCompetitors: [
          { name: rank === 1 ? 'Tu negocio' : comps[0], rank: 1, rating: 4.8, reviews: 84 },
          { name: rank === 2 ? 'Tu negocio' : comps[1], rank: 2, rating: 4.6, reviews: 61 },
          { name: rank === 3 ? 'Tu negocio' : comps[2], rank: 3, rating: 4.5, reviews: 47 },
        ],
      });
    }
  }
  return nodes;
}

function propagateClientMasterToProject(project: ProjectWorkspace): void {
  const cm = project.clientMaster;
  if (!cm) return;
  const stamp = nowStamp();
  cm.updatedAt = stamp;
  project.name = `${cm.commercialName} · ${cm.city}`;
  project.profile = {
    ...project.profile,
    companyName: cm.commercialName,
    domain: cm.website,
    sector: cm.sector,
    primaryCity: cm.city,
    country: cm.country,
    language: cm.preferredLanguage || project.profile.language,
    lastAuditedAt: stamp,
  };
  if (project.weather) {
    project.weather.city = cm.city;
  }
  const activeBaseSub = cm.subscriptions.find(
    (s) => s.status === 'Activa' && /Plan\s+(Starter|Growth|Agency|Enterprise)/i.test(s.planName)
  );
  if (activeBaseSub) {
    const match = activeBaseSub.planName.match(/(Starter|Growth|Agency|Enterprise)/i);
    if (match) {
      project.plan = (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()) as ProjectWorkspace['plan'];
    }
  }
  const gbpDir = (project.directoryListings || []).find(
    (d) => d.directoryName === 'Google Business Profile'
  );
  if (gbpDir) {
    gbpDir.detectedName = cm.commercialName;
    if (cm.phone) gbpDir.detectedPhone = cm.phone;
    if (cm.fiscalAddress && cm.city) {
      gbpDir.detectedAddress = `${cm.fiscalAddress}, ${cm.postalCode} ${cm.city}`.trim();
    }
  }
  const enabledCount = (project.enabledModules || []).length;
  const socialText = project.socialListeningAddonEnabled ? ' + Escucha Social' : '';
  cm.confiaSync = {
    ...cm.confiaSync,
    syncedModulesSummary: `${enabledCount} módulos base + Ficha Única${socialText} + Tutor Gemini`,
    priorityMode: 'Ficha Maestra Prioritaria',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/workspace', (_req, res) => {
    const store = ensureStore();
    res.json(store);
  });

  app.post('/api/workspace/select', (req, res) => {
    const store = ensureStore();
    const { projectId, role } = req.body as { projectId?: string; role?: UserRole };
    if (projectId && store.projects.some((p) => p.id === projectId)) {
      store.activeProjectId = projectId;
    }
    if (role) {
      store.activeRole = role;
    }
    saveStore(store);
    res.json(store);
  });

  app.post('/api/onboarding/analyze', async (req, res) => {
    try {
      const { domain, companyName, sector, city, language, competitors, knownServices } = req.body as {
        domain: string;
        companyName: string;
        sector: string;
        city: string;
        language?: string;
        competitors?: string[];
        knownServices?: string[];
      };

      if (!domain || !companyName || !sector || !city) {
        return res.status(400).json({
          error: 'Introduce dominio, nombre comercial, sector y ciudad principal.',
        });
      }

      const ai = getGeminiClient();
      const prompt = `Analiza el negocio "${companyName}" con dominio "${domain}", ubicado en "${city}", sector "${sector}", idioma "${language || 'es-ES'}".
Competidores declarados: ${(competitors || []).join(', ') || 'No especificados'}.
Servicios declarados: ${(knownServices || []).join(', ') || 'No especificados'}.

Usa la información pública disponible de la web o búsqueda si existe, sin inventar certificaciones ni precios específicos.
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta:
{
  "valueProposition": "resumen claro de propuesta de valor en 1-2 frases",
  "targetAudience": "público objetivo principal",
  "detectedServices": ["servicio 1", "servicio 2", "servicio 3"],
  "suggestedQuestionsToVerify": ["pregunta sobre certificaciones/precios/garantías que la IA no debe inventar 1", "pregunta 2", "pregunta 3"],
  "competitorGaps": ["hueco competitivo 1", "hueco competitivo 2"],
  "initialClusters": [
    {
      "pillarTitle": "título de clúster SEO/GEO",
      "intentScope": "Mixto SEO + GEO",
      "commercialGoal": "Leads",
      "difficulty": 35,
      "estimatedVolume": 1200,
      "leadPotential": "Alto"
    }
  ],
  "initialTechnicalHints": [
    {
      "url": "/",
      "category": "Schema Markup",
      "title": "título conciso de mejora técnica",
      "recommendation": "acción recomendada",
      "impact": "Alto",
      "effort": "Bajo"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }, { urlContext: {} }],
        },
      });

      const rawText = response.text || '';
      const parsed = JSON.parse(extractJsonBlock(rawText));
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c) => ({
          title: c.web?.title || 'Fuente verificada',
          uri: c.web?.uri || '',
        })).filter((c) => c.uri) || [];

      res.json({ analysis: parsed, sources: groundingChunks });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error analizando el dominio con Gemini.';
      console.error('Error /api/onboarding/analyze:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/projects', (req, res) => {
    const store = ensureStore();
    const {
      profile,
      clusters,
      technicalHints,
      clientIdentification,
    } = req.body as {
      profile: BrandProfile;
      clusters?: Array<{
        pillarTitle: string;
        intentScope: 'Google SEO' | 'GEO IA' | 'Mixto SEO + GEO';
        commercialGoal: 'Leads' | 'Autoridad' | 'Menciones IA' | 'Tráfico Local';
        difficulty: number;
        estimatedVolume: number;
        leadPotential: 'Alto' | 'Medio' | 'Exploratorio';
      }>;
      technicalHints?: Array<{
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
      }>;
      clientIdentification?: {
        legalName?: string;
        taxId?: string;
        fiscalAddress?: string;
        postalCode?: string;
        primaryContactName?: string;
        primaryContactRole?: string;
        email?: string;
        phone?: string;
        accountStatus?: ClientAccountStatus;
        plan?: 'Starter' | 'Growth' | 'Agency' | 'Enterprise';
        billingCycle?: 'Mensual' | 'Trimestral' | 'Anual';
        monthlyFeeEur?: number;
        nextPaymentDueDate?: string;
      };
    };

    if (!profile?.companyName || !profile?.domain) {
      return res.status(400).json({ error: 'Faltan datos del perfil de negocio.' });
    }

    const id = `proj-${Date.now()}`;
    const chosenPlan = clientIdentification?.plan || 'Growth';
    const defaultClientMaster = createDefaultClientMaster({
      companyName: profile.companyName,
      domain: profile.domain,
      city: profile.primaryCity,
      sector: profile.sector,
      plan: chosenPlan,
      enabledModules: ['reputacion_local', 'seo_geo', 'campanas'],
      language: profile.language,
      country: profile.country,
    });
    if (clientIdentification) {
      if (clientIdentification.legalName?.trim()) defaultClientMaster.legalName = clientIdentification.legalName.trim();
      if (clientIdentification.taxId?.trim()) defaultClientMaster.taxId = clientIdentification.taxId.trim().toUpperCase();
      if (clientIdentification.fiscalAddress?.trim()) defaultClientMaster.fiscalAddress = clientIdentification.fiscalAddress.trim();
      if (clientIdentification.postalCode?.trim()) defaultClientMaster.postalCode = clientIdentification.postalCode.trim();
      if (clientIdentification.primaryContactName?.trim()) defaultClientMaster.primaryContactName = clientIdentification.primaryContactName.trim();
      if (clientIdentification.primaryContactRole?.trim()) defaultClientMaster.primaryContactRole = clientIdentification.primaryContactRole.trim();
      if (clientIdentification.email?.trim()) {
        defaultClientMaster.email = clientIdentification.email.trim();
        defaultClientMaster.billingEmail = clientIdentification.email.trim();
        defaultClientMaster.notificationEmail = clientIdentification.email.trim();
      }
      if (clientIdentification.phone?.trim()) defaultClientMaster.phone = clientIdentification.phone.trim();
      if (clientIdentification.accountStatus) defaultClientMaster.accountStatus = clientIdentification.accountStatus;
      if (clientIdentification.monthlyFeeEur && defaultClientMaster.subscriptions[0]) {
        defaultClientMaster.subscriptions[0].amountEur = Number(clientIdentification.monthlyFeeEur);
      }
      if (clientIdentification.billingCycle && defaultClientMaster.subscriptions[0]) {
        defaultClientMaster.subscriptions[0].billingCycle = clientIdentification.billingCycle;
      }
      if (clientIdentification.nextPaymentDueDate) {
        defaultClientMaster.payments = [
          {
            id: `pay-init-${Date.now()}`,
            concept: `Alta Inicial · Suite Confia360 ${chosenPlan}`,
            invoiceNumber: `FAC-ALTA-${String(Date.now()).slice(-5)}`,
            amountEur: Number(clientIdentification.monthlyFeeEur) || defaultClientMaster.subscriptions[0]?.amountEur || 129,
            issueDate: nowStamp().split(' ')[0],
            dueDate: clientIdentification.nextPaymentDueDate,
            paymentMethod: 'Domiciliación SEPA',
            status: 'Pendiente',
          },
        ];
      }
    }

    const mainKeyword = `${profile.sector.toLowerCase().split(' ').slice(0, 3).join(' ')} ${profile.primaryCity.toLowerCase()}`;
    const newProject: ProjectWorkspace = {
      id,
      name: `${profile.companyName} · ${profile.primaryCity}`,
      plan: chosenPlan,
      profile: {
        ...profile,
        lastAuditedAt: nowStamp(),
      },
      clientMaster: defaultClientMaster,
      kpis: {
        leadsMonth: 18,
        leadsDeltaPct: 12.0,
        cplEur: 24.5,
        estimatedRoiPct: 190,
        avgGeoGridPos: 5.4,
        aiShareOfVoicePct: 14.0,
        gbpCallsAndWhatsapp: 16,
        technicalHealthPct: 78,
      },
      roiTimeline: [
        { period: 'Sep', organicTraffic: 420, totalLeads: 8, aiMentions: 1, cplEur: 34.0 },
        { period: 'Oct', organicTraffic: 590, totalLeads: 13, aiMentions: 3, cplEur: 28.0 },
        { period: 'Nov', organicTraffic: 780, totalLeads: 18, aiMentions: 6, cplEur: 24.5 },
      ],
      geoKeywords: [
        {
          id: `kw-${Date.now()}`,
          keyword: mainKeyword,
          sedeName: `Sede ${profile.primaryCity}`,
          city: profile.primaryCity,
          radiusKm: 5,
          gridSize: 5,
          avgRank: 5.4,
          top3Pct: 28,
          visibilityScore: 52,
          monthlySearches: 720,
          nodes: buildStarterGrid(profile.primaryCity, profile.competitors),
        },
      ],
      postalMetrics: [
        {
          postalCode: defaultClientMaster.postalCode || '28001',
          district: `${profile.primaryCity} Centro`,
          impressions: 940,
          clicks: 82,
          calls: 7,
          whatsappClicks: 5,
          directionRequests: 11,
          formLeads: 6,
          avgPosition: 4.8,
          conversionRate: 8.5,
        },
      ],
      clusters: (clusters || []).map((c, i) => ({
        id: `cl-${Date.now()}-${i}`,
        pillarTitle: c.pillarTitle,
        intentScope: c.intentScope || 'Mixto SEO + GEO',
        commercialGoal: c.commercialGoal || 'Leads',
        difficulty: Number(c.difficulty) || 35,
        estimatedVolume: Number(c.estimatedVolume) || 850,
        leadPotential: c.leadPotential || 'Alto',
        dueDate: '2026-12-10',
        owner: 'Equipo Editorial',
        status: 'Planificado',
      })),
      articles: [],
      aiQueries: [
        {
          id: `geoq-${Date.now()}`,
          query: `¿Qué empresa recomiendas para ${profile.sector.toLowerCase()} en ${profile.primaryCity}?`,
          category: 'Local',
          brandAppears: false,
          shareOfVoicePct: 12,
          competitorsMentioned: profile.competitors.slice(0, 2),
          engines: [
            { engine: 'ChatGPT', mentioned: false, position: null, sentiment: 'Ausente', citedUrls: [] },
            { engine: 'Perplexity', mentioned: false, position: null, sentiment: 'Ausente', citedUrls: [] },
            { engine: 'Gemini', mentioned: false, position: null, sentiment: 'Ausente', citedUrls: [] },
            { engine: 'Claude', mentioned: false, position: null, sentiment: 'Ausente', citedUrls: [] },
          ],
          missingContentOpportunity:
            'Ejecuta la comprobación en vivo para identificar qué fuentes citan actualmente los buscadores IA.',
          lastCheckedAt: nowStamp(),
        },
      ],
      technicalIssues: (technicalHints || []).map((t, i) => ({
        id: `tech-${Date.now()}-${i}`,
        url: t.url || '/',
        category: t.category || 'Schema Markup',
        title: t.title,
        recommendation: t.recommendation,
        impact: t.impact || 'Alto',
        effort: t.effort || 'Bajo',
        status: 'Pendiente',
        detectedAt: nowStamp().split(' ')[0],
      })),
      backlinks: [
        {
          id: `bl-${Date.now()}`,
          domain: `camaracomercio-${profile.primaryCity.toLowerCase().replace(/\s+/g, '')}.es`,
          category: 'Asociación',
          relevanceScore: 90,
          estimatedTraffic: 24000,
          spamScore: 1,
          editorialJustification: `Asociación empresarial de ${profile.primaryCity}; perfil verificado por relevancia geográfica.`,
          anchorSuggestion: profile.companyName,
          status: 'Prospecto',
        },
      ],
      reviews: [],
      socialPosts: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: nowStamp(),
          actor: 'Onboarding Inteligente',
          role: store.activeRole,
          module: 'Onboarding · Ficha Única',
          action: 'Alta de cliente y Ficha Maestra Confia360',
          detail: `Cliente "${defaultClientMaster.legalName}" (${defaultClientMaster.taxId}) dado de alta con cumplimiento RGPD y propagación prioritaria.`,
        },
      ],
      ecosystemLinks: DEFAULT_ECOSYSTEM_LINKS.map((l) => ({ ...l, syncedRecords: 0, status: 'Pendiente', lastSyncAt: 'Sin sincronizar' })),
      ...createDefaultGrowthExtensions(profile.primaryCity, profile.sector),
      ...createDefaultReputationExtensions(
        profile.companyName,
        profile.domain,
        profile.primaryCity,
        profile.sector
      ),
    };

    propagateClientMasterToProject(newProject);
    store.projects.unshift(newProject);
    store.activeProjectId = id;
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/projects/:id/profile', (req, res) => {
    const store = ensureStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const updates = req.body as Partial<BrandProfile>;
    project.profile = {
      ...project.profile,
      ...updates,
      lastAuditedAt: nowStamp(),
    };
    if (project.clientMaster) {
      if (updates.companyName) project.clientMaster.commercialName = updates.companyName;
      if (updates.domain) project.clientMaster.website = updates.domain;
      if (updates.sector) project.clientMaster.sector = updates.sector;
      if (updates.primaryCity) project.clientMaster.city = updates.primaryCity;
      if (updates.country) project.clientMaster.country = updates.country;
      if (updates.language) project.clientMaster.preferredLanguage = updates.language;
      propagateClientMasterToProject(project);
    }
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: 'Usuario Workspace',
      role: store.activeRole,
      module: 'Perfil de Negocio',
      action: 'Actualización de datos verificables',
      detail: 'Guardadas certificaciones, precios, garantías y sincronizadas con la Ficha Única Confia360.',
    });
    saveStore(store);
    res.json(store);
  });

  // =========================================================================
  // Ficha Única de Cliente Confia360 + Suscripciones + Pagos + API Sync
  // =========================================================================

  app.patch('/api/projects/:id/client-master', (req, res) => {
    const store = ensureStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const {
      clientMaster: cmUpdates,
      profileUpdates,
      reviewPolicyUpdates,
      invitationConfigUpdates,
    } = req.body as {
      clientMaster?: Partial<ClientMasterRecord>;
      profileUpdates?: Partial<BrandProfile>;
      reviewPolicyUpdates?: Partial<ReviewAutomationPolicy>;
      invitationConfigUpdates?: Partial<InvitationWebhookConfig>;
    };

    const currentCm =
      project.clientMaster ||
      createDefaultClientMaster({
        companyName: project.profile.companyName,
        domain: project.profile.domain,
        city: project.profile.primaryCity,
        sector: project.profile.sector,
        plan: project.plan,
        enabledModules: project.enabledModules,
      });

    project.clientMaster = {
      ...currentCm,
      ...cmUpdates,
      confiaSync: {
        ...currentCm.confiaSync,
        ...(cmUpdates?.confiaSync || {}),
        syncStatus: 'Pendiente',
      },
      updatedAt: nowStamp(),
    };

    if (profileUpdates) {
      project.profile = { ...project.profile, ...profileUpdates };
    }
    if (reviewPolicyUpdates) {
      project.reviewPolicy = {
        ...project.reviewPolicy,
        ...reviewPolicyUpdates,
        lastUpdatedAt: nowStamp(),
      };
    }
    if (invitationConfigUpdates) {
      project.invitationConfig = {
        ...project.invitationConfig,
        ...invitationConfigUpdates,
      };
    }

    propagateClientMasterToProject(project);

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Ficha Maestra (${store.activeRole})`,
      role: store.activeRole,
      module: 'Ficha Única Confia360',
      action: 'Datos maestros y configuración propagados',
      detail: `Actualizada ficha "${project.clientMaster.commercialName}" (${project.clientMaster.taxId}) con prioridad en todos los módulos Confia360.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/projects/:id/client-master/subscriptions', (req, res) => {
    const store = ensureStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!project.clientMaster) {
      project.clientMaster = createDefaultClientMaster({
        companyName: project.profile.companyName,
        domain: project.profile.domain,
        city: project.profile.primaryCity,
        sector: project.profile.sector,
      });
    }

    const { planName, modulesIncluded, billingCycle, amountEur, status, startDate, nextBillingDate, autoRenew } =
      req.body as Partial<ClientSubscriptionItem>;
    if (!planName?.trim()) {
      return res.status(400).json({ error: 'Indica el nombre del plan o suscripción.' });
    }

    const sub: ClientSubscriptionItem = {
      id: `sub-${Date.now()}`,
      planName: planName.trim(),
      modulesIncluded:
        Array.isArray(modulesIncluded) && modulesIncluded.length > 0
          ? modulesIncluded
          : project.enabledModules,
      billingCycle: billingCycle || 'Mensual',
      amountEur: Math.max(0, Number(amountEur) || 0),
      status: status || 'Activa',
      startDate: startDate || nowStamp().split(' ')[0],
      nextBillingDate: nextBillingDate || '2026-12-01',
      autoRenew: autoRenew !== false,
    };

    project.clientMaster.subscriptions.unshift(sub);
    propagateClientMasterToProject(project);
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Facturación (${store.activeRole})`,
      role: store.activeRole,
      module: 'Ficha Única · Suscripciones',
      action: `Suscripción añadida: ${sub.planName}`,
      detail: `${sub.amountEur} € (${sub.billingCycle}) · Próximo cobro ${sub.nextBillingDate}.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/projects/:id/client-master/subscriptions/:subId', (req, res) => {
    const store = ensureStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project || !project.clientMaster) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    const sub = project.clientMaster.subscriptions.find((s) => s.id === req.params.subId);
    if (!sub) return res.status(404).json({ error: 'Suscripción no encontrada.' });

    const updates = req.body as Partial<ClientSubscriptionItem>;
    Object.assign(sub, updates);
    propagateClientMasterToProject(project);
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Facturación (${store.activeRole})`,
      role: store.activeRole,
      module: 'Ficha Única · Suscripciones',
      action: `Suscripción actualizada: ${sub.planName}`,
      detail: `Estado: ${sub.status} · Importe: ${sub.amountEur} €.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/projects/:id/client-master/payments', (req, res) => {
    const store = ensureStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project || !project.clientMaster) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    const { concept, invoiceNumber, amountEur, issueDate, dueDate, paymentMethod, status } =
      req.body as Partial<ClientPaymentRecord>;
    if (!concept?.trim() || !dueDate?.trim()) {
      return res.status(400).json({ error: 'Concepto y fecha de vencimiento son obligatorios.' });
    }

    const paymentStatus: ClientPaymentRecord['status'] = status || 'Pendiente';
    const payment: ClientPaymentRecord = {
      id: `pay-${Date.now()}`,
      concept: concept.trim(),
      invoiceNumber: invoiceNumber?.trim() || `FAC-${String(Date.now()).slice(-6)}`,
      amountEur: Math.max(0, Number(amountEur) || 0),
      issueDate: issueDate || nowStamp().split(' ')[0],
      dueDate: dueDate.trim(),
      paidAt: paymentStatus === 'Pagado' ? nowStamp().split(' ')[0] : undefined,
      paymentMethod: paymentMethod || 'Domiciliación SEPA',
      status: paymentStatus,
    };

    project.clientMaster.payments.unshift(payment);
    project.clientMaster.updatedAt = nowStamp();
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Facturación (${store.activeRole})`,
      role: store.activeRole,
      module: 'Ficha Única · Pagos',
      action: `Registro de cobro (${payment.status})`,
      detail: `${payment.invoiceNumber} · ${payment.concept} (${payment.amountEur} € · Vto: ${payment.dueDate}).`,
    });
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/projects/:id/client-master/payments/:paymentId', (req, res) => {
    const store = ensureStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project || !project.clientMaster) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    const pay = project.clientMaster.payments.find((p) => p.id === req.params.paymentId);
    if (!pay) return res.status(404).json({ error: 'Pago no encontrado.' });

    const updates = req.body as Partial<ClientPaymentRecord>;
    if (updates.status === 'Pagado' && !updates.paidAt) {
      updates.paidAt = nowStamp().split(' ')[0];
    } else if (updates.status && updates.status !== 'Pagado') {
      pay.paidAt = undefined;
    }
    Object.assign(pay, updates);
    project.clientMaster.updatedAt = nowStamp();

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Facturación (${store.activeRole})`,
      role: store.activeRole,
      module: 'Ficha Única · Pagos',
      action: `Pago ${pay.invoiceNumber}: ${pay.status}`,
      detail: `${pay.concept} (${pay.amountEur} €) actualizado a ${pay.status}.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.delete('/api/projects/:id/client-master/payments/:paymentId', (req, res) => {
    const store = ensureStore();
    const project = store.projects.find((p) => p.id === req.params.id);
    if (!project || !project.clientMaster) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    const target = project.clientMaster.payments.find((p) => p.id === req.params.paymentId);
    if (!target) return res.status(404).json({ error: 'Pago no encontrado.' });

    project.clientMaster.payments = project.clientMaster.payments.filter(
      (p) => p.id !== req.params.paymentId
    );
    project.clientMaster.updatedAt = nowStamp();
    saveStore(store);
    res.json(store);
  });

  app.post('/api/confia360/client-sync', async (req, res) => {
    const store = ensureStore();
    const { projectId, direction } = req.body as {
      projectId: string;
      direction?: 'push' | 'pull' | 'bidirectional';
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!project.clientMaster) {
      project.clientMaster = createDefaultClientMaster({
        companyName: project.profile.companyName,
        domain: project.profile.domain,
        city: project.profile.primaryCity,
        sector: project.profile.sector,
      });
    }

    const syncDir =
      direction === 'push'
        ? 'Push a Confia360'
        : direction === 'pull'
          ? 'Pull desde Confia360'
          : 'Bidireccional';
    const stamp = nowStamp();
    const externalApiUrl = process.env.CONFIA360_API_URL?.trim();
    const externalApiKey = process.env.CONFIA360_API_KEY?.trim();

    let remoteSyncMode = 'Puente Local Ecosistema Confia360';
    if (externalApiUrl && /^https?:\/\//i.test(externalApiUrl)) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (externalApiKey) headers.Authorization = `Bearer ${externalApiKey}`;
        const extRes = await fetch(externalApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: 'client_master.sync',
            direction: syncDir,
            priorityMode: 'Ficha Maestra Prioritaria',
            clientMaster: project.clientMaster,
            enabledModules: project.enabledModules,
            socialListeningAddonEnabled: project.socialListeningAddonEnabled,
            enabledReputationSources: project.enabledReputationSources || [],
          }),
        });
        if (!extRes.ok) {
          project.clientMaster.confiaSync.syncStatus = 'Error';
          saveStore(store);
          return res.status(502).json({
            error: `La API externa de Confia360 respondió con estado ${extRes.status}.`,
          });
        }
        remoteSyncMode = 'API Externa Confia360';
      } catch (err) {
        project.clientMaster.confiaSync.syncStatus = 'Error';
        saveStore(store);
        return res.status(502).json({
          error:
            err instanceof Error
              ? `No se pudo conectar con CONFIA360_API_URL: ${err.message}`
              : 'Error de red sincronizando con Confia360.',
        });
      }
    }

    project.clientMaster.confiaSync = {
      ...project.clientMaster.confiaSync,
      syncStatus: 'Sincronizado',
      lastSyncedAt: stamp,
      lastSyncDirection: syncDir,
      priorityMode: 'Ficha Maestra Prioritaria',
    };
    propagateClientMasterToProject(project);

    project.ecosystemLinks = (project.ecosystemLinks || []).map((link) => ({
      ...link,
      status: 'Conectado',
      lastSyncAt: stamp,
      syncedRecords: link.syncedRecords + 1,
    }));

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: stamp,
      actor: `API Sync Confia360 (${store.activeRole})`,
      role: store.activeRole,
      module: 'Integración Confia360',
      action: `Sincronización ${syncDir} completada`,
      detail: `Ficha Maestra (${project.clientMaster.confiaCode}) y ${project.enabledModules.length} módulos sincronizados vía ${remoteSyncMode}.`,
    });
    saveStore(store);
    res.json(store);
  });

  // Contrato API oficial para que la app externa Confia360 descubra y consuma los nuevos módulos
  app.get('/api/v1/confia360/modules-manifest', (_req, res) => {
    res.json({
      ecosystem: 'Confia360',
      provider: 'AxesIA',
      version: '2.4.0',
      prioritySourceOfTruth: 'clientMaster',
      modules: [
        {
          id: 'client_master',
          name: 'Ficha Única de Cliente y Cuadro de Control',
          route: '/?section=client',
          capabilities: [
            'Identificación fiscal',
            'Suscripciones y pagos pendientes',
            'Propagación prioritaria',
            'Sincronización API bidireccional',
          ],
        },
        {
          id: 'reputacion_local',
          name: 'Confia360 ReputaciónLocal + KPIs D3 + Escucha Social',
          route: '/?section=reputation',
          capabilities: [
            'KPIs D3 frente a competidores',
            'Buzón omnicanal unificado',
            'Incidencias SLA',
            'Add-on Meta, TikTok y YouTube protegido por PIN',
          ],
        },
        {
          id: 'seo_geo',
          name: 'Confia360 SEO-GEO & Geo-Grid',
          route: '/?section=geo-ai',
          capabilities: ['Mapa Geo-Grid', 'Monitor citas IAs', 'Contenido con aprobación humana', 'SEO Técnico'],
        },
        {
          id: 'campanas',
          name: 'Confia360 Campañas y Estacionalidad',
          route: '/?section=campaigns',
          capabilities: ['Calendario estratégico', 'Alertas proactivas clima/stock', 'Meta/TikTok/YouTube Ads'],
        },
        {
          id: 'release_notes_tutor',
          name: 'Novedades por Módulo y Tutor Contextual con Voz (Gemini)',
          route: '/?section=onboarding',
          capabilities: ['Notas informativas por módulo', 'Guía contextual por pantalla', 'Voz y micrófono Gemini'],
        },
      ],
    });
  });

  app.get('/api/v1/confia360/clients/:projectId', (req, res) => {
    const webhookSecret = process.env.CONFIA360_WEBHOOK_SECRET?.trim();
    const providedSecret = req.headers['x-confia360-secret'];
    const adminSession = getValidAdminSession(req);
    if (webhookSecret && providedSecret !== webhookSecret && !adminSession) {
      return res.status(401).json({ error: 'No autorizado para consultar la ficha Confia360.' });
    }
    const store = ensureStore();
    const project = store.projects.find(
      (p) => p.id === req.params.projectId || p.clientMaster?.confiaCode === req.params.projectId
    );
    if (!project) return res.status(404).json({ error: 'Cliente Confia360 no encontrado.' });
    res.json({
      projectId: project.id,
      enabledModules: project.enabledModules,
      socialListeningAddonEnabled: project.socialListeningAddonEnabled,
      enabledReputationSources: project.enabledReputationSources,
      clientMaster: project.clientMaster,
      profile: project.profile,
    });
  });

  app.post('/api/v1/confia360/clients/webhook', (req, res) => {
    const webhookSecret = process.env.CONFIA360_WEBHOOK_SECRET?.trim();
    const providedSecret = req.headers['x-confia360-secret'];
    const adminSession = getValidAdminSession(req);
    if (webhookSecret && providedSecret !== webhookSecret && !adminSession) {
      return res.status(401).json({ error: 'Firma/secreto Confia360 inválido.' });
    }
    const store = ensureStore();
    const { projectId, clientMaster: incomingCm } = req.body as {
      projectId?: string;
      clientMaster?: Partial<ClientMasterRecord>;
    };
    const project =
      store.projects.find((p) => p.id === projectId || p.clientMaster?.confiaCode === projectId) ||
      store.projects[0];
    if (!project || !project.clientMaster) {
      return res.status(404).json({ error: 'Cliente Confia360 no encontrado.' });
    }
    if (incomingCm) {
      project.clientMaster = {
        ...project.clientMaster,
        ...incomingCm,
        confiaSync: {
          ...project.clientMaster.confiaSync,
          syncStatus: 'Sincronizado',
          lastSyncedAt: nowStamp(),
          lastSyncDirection: 'Pull desde Confia360',
        },
        updatedAt: nowStamp(),
      };
      propagateClientMasterToProject(project);
      saveStore(store);
    }
    res.json({ ok: true, confiaCode: project.clientMaster.confiaCode, syncedAt: nowStamp() });
  });

  // =========================================================================
  // Notas Informativas de Novedades por Módulo (Admin -> Módulos)
  // =========================================================================

  app.post('/api/release-notes', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const { version, title, summary, details, modules, category, active } = req.body as {
      version?: string;
      title: string;
      summary: string;
      details?: string;
      modules: ReleaseNoteModuleTarget[];
      category?: ModuleReleaseNote['category'];
      active?: boolean;
    };

    if (!title?.trim() || !summary?.trim() || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({
        error: 'Indica título, resumen usable y al menos un módulo destinatario.',
      });
    }

    const note: ModuleReleaseNote = {
      id: `rn-${Date.now()}`,
      version: version?.trim() || 'v2.4',
      title: title.trim(),
      summary: summary.trim(),
      details: details?.trim() || summary.trim(),
      modules,
      category: category || 'Nueva función',
      publishedAt: nowStamp().split(' ')[0],
      publishedBy: `Admin ${session.username}`,
      active: active !== false,
    };

    store.releaseNotes = [note, ...(store.releaseNotes || [])];
    const activeProject =
      store.projects.find((p) => p.id === store.activeProjectId) || store.projects[0];
    if (activeProject) {
      activeProject.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: `Admin ${session.username}`,
        role: store.activeRole,
        module: 'Novedades por Módulo',
        action: `Nota publicada: ${note.title}`,
        detail: `Módulos destino: ${note.modules.join(', ')} (${note.version}).`,
      });
    }
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/release-notes/:noteId', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const note = (store.releaseNotes || []).find((n) => n.id === req.params.noteId);
    if (!note) return res.status(404).json({ error: 'Nota informativa no encontrada.' });

    const updates = req.body as Partial<ModuleReleaseNote>;
    Object.assign(note, {
      ...updates,
      publishedAt: updates.publishedAt || nowStamp().split(' ')[0],
    });
    saveStore(store);
    res.json(store);
  });

  app.delete('/api/release-notes/:noteId', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const exists = (store.releaseNotes || []).some((n) => n.id === req.params.noteId);
    if (!exists) return res.status(404).json({ error: 'Nota informativa no encontrada.' });

    store.releaseNotes = (store.releaseNotes || []).filter((n) => n.id !== req.params.noteId);
    saveStore(store);
    res.json(store);
  });

  app.post('/api/release-notes/dismiss', (req, res) => {
    const store = ensureStore();
    const { noteId, reset } = req.body as { noteId?: string; reset?: boolean };
    const roleKey = store.activeRole || 'Agencia';
    if (!store.dismissedReleaseNotesByRole) store.dismissedReleaseNotesByRole = {};
    const current = store.dismissedReleaseNotesByRole[roleKey] || [];
    if (reset) {
      store.dismissedReleaseNotesByRole[roleKey] = noteId
        ? current.filter((id) => id !== noteId)
        : [];
    } else if (noteId && !current.includes(noteId)) {
      store.dismissedReleaseNotesByRole[roleKey] = [...current, noteId];
    }
    saveStore(store);
    res.json(store);
  });

  // =========================================================================
  // Tutor Contextual por Pantalla con Voz y Micrófono (Gemini API)
  // =========================================================================

  app.post('/api/assistant/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return res.status(400).json({ error: 'No se recibió audio para transcribir.' });
      }
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe exactamente en español la pregunta o frase del usuario sin añadir explicaciones ni comillas.',
            },
          ],
        },
      });
      res.json({ text: (response.text || '').trim() });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error transcribiendo la voz con Gemini.';
      console.error('Error /api/assistant/transcribe:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/assistant/contextual-ask', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, section, subTab, question, history } = req.body as {
        projectId?: string;
        section: string;
        subTab?: string;
        question: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      };
      if (!question?.trim()) {
        return res.status(400).json({ error: 'Escribe o dicta una pregunta para el tutor.' });
      }
      const project =
        store.projects.find((p) => p.id === (projectId || store.activeProjectId)) ||
        store.projects[0];

      const cm = project?.clientMaster;
      const pendingPayments = (cm?.payments || []).filter((p) => p.status !== 'Pagado');
      const activeSubs = (cm?.subscriptions || []).filter((s) => s.status === 'Activa');

      const contextPayload = {
        pantallaActual: section,
        subPestaña: subTab || 'principal',
        rolUsuario: store.activeRole,
        negocioActivo: project?.profile.companyName,
        ciudad: project?.profile.primaryCity,
        sector: project?.profile.sector,
        plan: project?.plan,
        modulosActivos: project?.enabledModules || [],
        escuchaSocialActiva: Boolean(project?.socialListeningAddonEnabled),
        fuentesReputacionActivas: project?.enabledReputationSources || [],
        estadoCuentaCliente: cm?.accountStatus || 'Activo',
        codigoConfia360: cm?.confiaCode,
        proximaRenovacion: cm?.renewalDate,
        suscripcionesActivas: activeSubs.map((s) => `${s.planName} (${s.amountEur} €/${s.billingCycle})`),
        pagosPendientes: pendingPayments.map((p) => `${p.concept}: ${p.amountEur} € vence ${p.dueDate} (${p.status})`),
        incidenciasAbiertas: (project?.reviewIncidents || []).filter((i) => i.status !== 'Resuelta' && i.status !== 'Cerrada').length,
      };

      const historyText = (history || [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Cliente' : 'Tutor'}: ${m.text}`)
        .join('\n');

      const ai = getGeminiClient();
      const promptText = `Eres el Tutor Contextual Oficial de Confia360 Suite (AxesIA). Responde en español de España de forma muy clara, práctica, cercana y concisa (ideal para ser leída y escuchada por voz, máximo 120 palabras salvo que pidan pasos detallados).

Reglas:
- Explica exactamente dónde hacer clic dentro de la pantalla actual "${section}" (${subTab || 'vista principal'}) y cómo funciona la plataforma.
- Usa ÚNICAMENTE los datos reales del cliente proporcionados abajo (nunca inventes importes, fechas ni claves PIN). Por seguridad nunca reveles contraseñas o PINs.
- Si preguntan por pagos, suscripciones, módulos activos o fuentes de reseñas, responde con las cifras reales del contexto.

Contexto en vivo de pantalla y Ficha Única del Cliente:
${JSON.stringify(contextPayload, null, 2)}

${historyText ? `Conversación previa:\n${historyText}\n` : ''}
Pregunta del cliente: "${question.trim()}"`;

      let answerText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: promptText,
        });
        answerText = (response.text || '').trim();
      } catch (primaryErr) {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptText,
        });
        answerText = (fallbackResponse.text || '').trim();
        if (!answerText) throw primaryErr;
      }

      res.json({ answer: answerText });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error consultando al tutor contextual Gemini.';
      console.error('Error /api/assistant/contextual-ask:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/assistant/speak', async (req, res) => {
    try {
      const { text, voiceName } = req.body as { text?: string; voiceName?: string };
      const cleanText = typeof text === 'string' ? text.trim().slice(0, 1500) : '';
      if (!cleanText) {
        return res.status(400).json({ error: 'Indica el texto a locutar.' });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(500).json({ error: 'GEMINI_API_KEY no configurada.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        apiVersion: 'v1beta',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
      const chosenVoice = allowedVoices.includes(voiceName || '') ? voiceName! : 'Kore';

      const attempts: Array<() => Promise<{ inlineData?: { data?: string; mimeType?: string } }>> = [
        async () => {
          const r = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [{ text: cleanText }],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: chosenVoice } },
              },
            },
          });
          return r.candidates?.[0]?.content?.parts?.[0] || {};
        },
        async () => {
          const r = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [
              {
                role: 'user',
                parts: [{ text: `Lee en español de España con tono amable y claro: ${cleanText}` }],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: chosenVoice } },
              },
            },
          });
          return r.candidates?.[0]?.content?.parts?.[0] || {};
        },
        async () => {
          const r = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: cleanText,
            config: { responseModalities: ['AUDIO'] },
          });
          return r.candidates?.[0]?.content?.parts?.[0] || {};
        },
      ];

      let part: { inlineData?: { data?: string; mimeType?: string } } = {};
      let lastErr: unknown = null;
      for (const runAttempt of attempts) {
        try {
          part = await runAttempt();
          if (part.inlineData?.data) break;
        } catch (attemptErr) {
          lastErr = attemptErr;
        }
      }

      let base64Audio = part.inlineData?.data;
      let mimeType = part.inlineData?.mimeType || 'audio/wav';
      if (!base64Audio) {
        if (lastErr) throw lastErr;
        return res.status(502).json({ error: 'Gemini TTS no devolvió audio.' });
      }

      // Si el modelo devuelve PCM L16 sin cabecera RIFF, añadimos cabecera WAV estándar 24kHz mono 16-bit
      if (/audio\/(l16|pcm)/i.test(mimeType)) {
        const pcmBuf = Buffer.from(base64Audio, 'base64');
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + pcmBuf.length, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16);
        wavHeader.writeUInt16LE(1, 20);
        wavHeader.writeUInt16LE(1, 22);
        wavHeader.writeUInt32LE(24000, 24);
        wavHeader.writeUInt32LE(48000, 28);
        wavHeader.writeUInt16LE(2, 32);
        wavHeader.writeUInt16LE(16, 34);
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(pcmBuf.length, 40);
        base64Audio = Buffer.concat([wavHeader, pcmBuf]).toString('base64');
        mimeType = 'audio/wav';
      }

      res.json({ audioBase64: base64Audio, mimeType });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error generando locución de voz con Gemini.';
      console.error('Error /api/assistant/speak:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/content/generate', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, topic, intentType, clusterId } = req.body as {
        projectId: string;
        topic: string;
        intentType: EditorialArticle['intentType'];
        clusterId?: string;
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      if (!topic) return res.status(400).json({ error: 'Indica el tema o consulta objetivo.' });

      const ai = getGeminiClient();
      const profile = project.profile;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Redacta un borrador editorial SEO + GEO en español para "${profile.companyName}" (${profile.domain}), ubicado en ${profile.primaryCity}.
Tema: "${topic}".
Tipo de intención: "${intentType}".
Propuesta de valor verificada: "${profile.valueProposition}".
Servicios reales: ${profile.services.join(', ')}.
Experiencia: ${profile.yearsExperience} años. Certificaciones: ${profile.certifications.join(', ')}.
Precios declarados: ${profile.priceRange}. Garantías: ${profile.guarantees}.
Tono de marca: ${profile.brandTone}.
AFIRMACIONES PROHIBIDAS (nunca las uses): ${profile.forbiddenClaims.join(' | ')}.

Reglas estrictas:
- No inventes certificaciones, estadísticas ni precios fuera de los declarados arriba.
- Incluye estructura clara H2/H3, 2 preguntas frecuentes (FAQ) útiles para buscadores IA, llamada a la acción comercial real y sugerencia de JSON-LD.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              metaTitle: { type: Type.STRING },
              metaDescription: { type: Type.STRING },
              slug: { type: Type.STRING },
              sensitiveClaimFlag: { type: Type.BOOLEAN },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heading: { type: Type.STRING },
                    level: { type: Type.STRING },
                    body: { type: Type.STRING },
                  },
                },
              },
              faq: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING },
                  },
                },
              },
              ctaText: { type: Type.STRING },
              jsonLdType: { type: Type.STRING },
              internalLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
              sources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                },
              },
              imageAltText: { type: Type.STRING },
              imageDescription: { type: Type.STRING },
            },
          },
        },
      });

      const generated = JSON.parse(response.text || '{}');
      const slug = (generated.slug || 'guia-local').replace(/^\/+/, '');
      const jsonLdType =
        generated.jsonLdType === 'FAQPage' ||
        generated.jsonLdType === 'LocalBusiness' ||
        generated.jsonLdType === 'Service'
          ? generated.jsonLdType
          : 'Article';

      const jsonLdObj = {
        '@context': 'https://schema.org',
        '@type': jsonLdType,
        headline: generated.title || topic,
        publisher: {
          '@type': 'Organization',
          name: profile.companyName,
          url: profile.domain,
        },
        areaServed: profile.primaryCity,
      };

      const newArticle: EditorialArticle = {
        id: `art-${Date.now()}`,
        clusterId: clusterId || project.clusters[0]?.id || 'cl-gen',
        title: generated.title || topic,
        metaTitle: generated.metaTitle || `${topic} | ${profile.companyName}`,
        metaDescription:
          generated.metaDescription || `Guía verificada sobre ${topic} en ${profile.primaryCity}.`,
        slug,
        url: `${profile.domain.replace(/\/$/, '')}/guias/${slug}`,
        intentType,
        status: 'Pendiente Aprobación',
        authorHuman: 'Borrador asistido · Pendiente editor',
        aiModel: 'gemini-4-hydrogen',
        promptSummary: `Tema "${topic}" generado con BrandProfile verificado y bloqueo de afirmaciones prohibidas.`,
        originalityScore: 96,
        sensitiveClaimFlag: Boolean(generated.sensitiveClaimFlag),
        complianceChecked: true,
        sections: (generated.sections || []).map((s: { heading: string; level: string; body: string }) => ({
          heading: s.heading,
          level: s.level === 'H3' ? 'H3' : 'H2',
          body: s.body,
        })),
        faq: generated.faq || [],
        ctaText: generated.ctaText || `Solicita asesoramiento con ${profile.companyName}`,
        jsonLdType,
        jsonLdCode: JSON.stringify(jsonLdObj, null, 2),
        internalLinks: generated.internalLinks || ['/servicios', '/contacto'],
        sources: (generated.sources || []).map((src: { title: string; url: string }) => ({
          title: src.title || 'Fuente oficial',
          url: src.url || profile.domain,
          verified: true,
        })),
        imageSuggestion: {
          altText: generated.imageAltText || `${topic} en ${profile.primaryCity}`,
          description: generated.imageDescription || 'Ilustración editorial profesional del servicio.',
        },
        estimatedLeadsMonth: 14,
      };

      project.articles.unshift(newArticle);
      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: 'IA Gemini 4 Hydrogen',
        role: store.activeRole,
        module: 'Estudio Editorial',
        action: 'Generación de borrador para aprobación',
        detail: `Creado borrador "${newArticle.title}". Bloqueado hasta revisión humana.`,
      });
      saveStore(store);
      res.json({ store, article: newArticle });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generando el borrador editorial.';
      console.error('Error /api/content/generate:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/content/:articleId/transition', (req, res) => {
    const store = ensureStore();
    const { projectId, nextStatus, reviewerName, scheduledFor } = req.body as {
      projectId: string;
      nextStatus: EditorialArticle['status'];
      reviewerName?: string;
      scheduledFor?: string;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const article = project.articles.find((a) => a.id === req.params.articleId);
    if (!article) return res.status(404).json({ error: 'Artículo no encontrado.' });

    article.status = nextStatus;
    article.reviewedBy = reviewerName || `Responsable (${store.activeRole})`;
    article.reviewedAt = nowStamp();
    if (scheduledFor) article.scheduledFor = scheduledFor;

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: article.reviewedBy,
      role: store.activeRole,
      module: 'Control Editorial',
      action: `Estado cambiado a ${nextStatus}`,
      detail: `Artículo "${article.title}" actualizado tras revisión humana.`,
    });

    saveStore(store);
    res.json(store);
  });

  app.post('/api/geo/live-check', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, queryId, customQuery } = req.body as {
        projectId: string;
        queryId?: string;
        customQuery?: string;
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

      const existing = queryId ? project.aiQueries.find((q) => q.id === queryId) : undefined;
      const queryText = customQuery?.trim() || existing?.query;
      if (!queryText) return res.status(400).json({ error: 'Consulta GEO requerida.' });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Responde en español como un motor de búsqueda con IA a esta consulta de un usuario:
"${queryText}"

Menciona opciones y fuentes reales relevantes. Al final, incluye una breve línea de evaluación objetiva indicando si "${project.profile.companyName}" (${project.profile.domain}) o competidores (${project.profile.competitors.join(', ')}) aparecen respaldados en fuentes públicas actuales y qué contenido falta para mejorar su citabilidad.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const answerText = response.text || '';
      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((c) => ({
            title: c.web?.title || 'Fuente citada',
            uri: c.web?.uri || '',
          }))
          .filter((c) => c.uri) || [];

      const brandLower = project.profile.companyName.toLowerCase();
      const domainHost = project.profile.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
      const mentionedInAnswer =
        answerText.toLowerCase().includes(brandLower) ||
        chunks.some((c) => c.uri.toLowerCase().includes(domainHost));

      const matchedCompetitors = project.profile.competitors.filter((comp) =>
        answerText.toLowerCase().includes(comp.toLowerCase())
      );

      if (existing) {
        existing.liveSummary = answerText;
        existing.liveSources = chunks;
        existing.lastCheckedAt = nowStamp();
        const geminiEngine = existing.engines.find((e) => e.engine === 'Gemini');
        if (geminiEngine) {
          geminiEngine.mentioned = mentionedInAnswer;
          geminiEngine.sentiment = mentionedInAnswer ? 'Positivo' : 'Ausente';
          geminiEngine.citedUrls = chunks.slice(0, 3).map((c) => c.uri);
        }
        existing.brandAppears = existing.engines.some((e) => e.mentioned);
        if (matchedCompetitors.length > 0) {
          existing.competitorsMentioned = Array.from(
            new Set([...existing.competitorsMentioned, ...matchedCompetitors])
          );
        }
      } else {
        project.aiQueries.unshift({
          id: `geoq-${Date.now()}`,
          query: queryText,
          category: 'Recomendación',
          brandAppears: mentionedInAnswer,
          shareOfVoicePct: mentionedInAnswer ? 35 : 0,
          competitorsMentioned: matchedCompetitors,
          engines: [
            { engine: 'Gemini', mentioned: mentionedInAnswer, position: mentionedInAnswer ? 2 : null, sentiment: mentionedInAnswer ? 'Positivo' : 'Ausente', citedUrls: chunks.slice(0, 2).map((c) => c.uri) },
            { engine: 'ChatGPT', mentioned: false, position: null, sentiment: 'Ausente', citedUrls: [] },
            { engine: 'Perplexity', mentioned: mentionedInAnswer, position: mentionedInAnswer ? 3 : null, sentiment: mentionedInAnswer ? 'Neutral' : 'Ausente', citedUrls: [] },
            { engine: 'Claude', mentioned: false, position: null, sentiment: 'Ausente', citedUrls: [] },
          ],
          missingContentOpportunity: mentionedInAnswer
            ? 'Reforzar datos estructurados FAQPage y casos verificados para consolidar el Top 1.'
            : 'Publicar página comparativa y guía con cifras verificables para entrar en citas IA.',
          lastCheckedAt: nowStamp(),
          liveSummary: answerText,
          liveSources: chunks,
        });
      }

      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: 'Monitor GEO Live',
        role: store.activeRole,
        module: 'Monitorización GEO',
        action: 'Consulta en vivo con Google Search Grounding',
        detail: `Verificada consulta "${queryText}". Fuentes recuperadas: ${chunks.length}.`,
      });

      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error ejecutando verificación GEO en vivo.';
      console.error('Error /api/geo/live-check:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/geo/trend-analyze', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId } = req.body as { projectId: string };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

      const ai = getGeminiClient();
      const queryContext = project.aiQueries.map((q) => ({
        id: q.id,
        query: q.query,
        category: q.category,
        brandAppears: q.brandAppears,
        shareOfVoicePct: q.shareOfVoicePct,
        competitorsMentioned: q.competitorsMentioned,
        trendHistory: q.trendHistory || [],
        missingContentOpportunity: q.missingContentOpportunity,
      }));
      const catalogPaths = project.catalog.map((c) => ({
        name: c.name,
        path: c.linkedWebPath,
        priceEur: c.priceEur,
        seasonality: c.seasonality,
      }));
      const upcomingEvents = project.calendarEvents.slice(0, 4).map((e) => ({
        date: e.date,
        title: e.title,
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analiza la tendencia histórica y estacionalidad para "${project.profile.companyName}" (${project.profile.domain}) en ${project.profile.primaryCity}, sector "${project.profile.sector}".
Consultas GEO monitorizadas: ${JSON.stringify(queryContext)}
Landing pages y catálogo real: ${JSON.stringify(catalogPaths)}
Próximos eventos comerciales: ${JSON.stringify(upcomingEvents)}
Afirmaciones prohibidas (NUNCA proponer): ${project.profile.forbiddenClaims.join(' | ')}.

Para cada consulta evalúa su previsión de caída o crecimiento de demanda/citabilidad en los próximos 30 días ("forecastedDropPct" negativo si hay riesgo de caída, ej. -16.5, positivo si crece, ej. 5.5) y la razón concreta ("forecastReason").
Además genera entre 2 y 3 optimizaciones SEO proactivas concretas ("suggestions") enfocadas en actualizar landing pages reales existentes (usa las rutas de catalogPaths o rutas reales del sitio) antes de que ocurra la caída prevista.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              queryForecasts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    queryId: { type: Type.STRING },
                    forecastedDropPct: { type: Type.NUMBER },
                    forecastReason: { type: Type.STRING },
                  },
                },
              },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    queryId: { type: Type.STRING },
                    targetPageUrl: { type: Type.STRING },
                    targetPageTitle: { type: Type.STRING },
                    optimizationType: { type: Type.STRING },
                    forecastedDropPct: { type: Type.NUMBER },
                    urgency: { type: Type.STRING },
                    title: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    actionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    estimatedRecoveryPct: { type: Type.NUMBER },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}') as {
        queryForecasts?: Array<{
          queryId: string;
          forecastedDropPct: number;
          forecastReason: string;
        }>;
        suggestions?: Array<{
          queryId: string;
          targetPageUrl: string;
          targetPageTitle: string;
          optimizationType: string;
          forecastedDropPct: number;
          urgency: string;
          title: string;
          rationale: string;
          actionSteps: string[];
          estimatedRecoveryPct: number;
        }>;
      };

      for (const f of parsed.queryForecasts || []) {
        const target = project.aiQueries.find((q) => q.id === f.queryId);
        if (target) {
          target.forecastedDropPct = Number(Number(f.forecastedDropPct).toFixed(1));
          if (f.forecastReason) target.forecastReason = f.forecastReason;
        }
      }

      const validTypes: ProactiveSeoSuggestion['optimizationType'][] = [
        'Actualizar Landing Page',
        'Añadir Schema JSON-LD',
        'Reforzar FAQ Conversacional',
        'Comparativa y Precios',
      ];
      const preserved = (project.proactiveSeoSuggestions || []).filter(
        (s) => s.status === 'Aplicada' || s.status === 'En curso'
      );
      const stampDay = nowStamp().split(' ')[0];
      const generatedSuggestions: ProactiveSeoSuggestion[] = (parsed.suggestions || []).map(
        (s, idx) => ({
          id: `seo-opt-${Date.now()}-${idx}`,
          queryId: s.queryId || project.aiQueries[0]?.id || '',
          targetPageUrl: s.targetPageUrl || project.catalog[0]?.linkedWebPath || '/servicios',
          targetPageTitle: s.targetPageTitle || project.profile.services[0] || 'Landing principal',
          optimizationType: validTypes.includes(
            s.optimizationType as ProactiveSeoSuggestion['optimizationType']
          )
            ? (s.optimizationType as ProactiveSeoSuggestion['optimizationType'])
            : 'Actualizar Landing Page',
          forecastedDropPct: Number(Number(s.forecastedDropPct ?? -12).toFixed(1)),
          urgency: s.urgency === 'Media' ? 'Media' : 'Alta',
          title: s.title,
          rationale: s.rationale,
          actionSteps: Array.isArray(s.actionSteps) ? s.actionSteps.slice(0, 4) : [],
          estimatedRecoveryPct: Math.max(5, Math.round(Number(s.estimatedRecoveryPct) || 14)),
          status: 'Pendiente',
          createdAt: stampDay,
        })
      );

      project.proactiveSeoSuggestions = [...generatedSuggestions, ...preserved].slice(0, 10);

      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: 'IA Gemini 4 Hydrogen',
        role: store.activeRole,
        module: 'Tendencias GEO y SEO Proactivo',
        action: 'Análisis predictivo de caídas de búsqueda',
        detail: `Evaluadas ${project.aiQueries.length} consultas; generadas ${generatedSuggestions.length} optimizaciones preventivas de landing.`,
      });

      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error analizando tendencias y previsiones SEO.';
      console.error('Error /api/geo/trend-analyze:', err);
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/geo/optimizations/:suggestionId', (req, res) => {
    const store = ensureStore();
    const { projectId, status } = req.body as {
      projectId: string;
      status: ProactiveSeoSuggestion['status'];
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const item = (project.proactiveSeoSuggestions || []).find(
      (s) => s.id === req.params.suggestionId
    );
    if (!item) return res.status(404).json({ error: 'Optimización no encontrada.' });

    item.status = status;
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Responsable (${store.activeRole})`,
      role: store.activeRole,
      module: 'Tendencias GEO y SEO Proactivo',
      action: `Optimización marcada como ${status}`,
      detail: `${item.targetPageUrl} · ${item.title}.`,
    });

    saveStore(store);
    res.json(store);
  });

  app.patch('/api/technical/:issueId', (req, res) => {
    const store = ensureStore();
    const { projectId, status } = req.body as {
      projectId: string;
      status: 'Pendiente' | 'En curso' | 'Resuelto';
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const issue = project.technicalIssues.find((t) => t.id === req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Incidencia no encontrada.' });

    issue.status = status;
    const resolvedCount = project.technicalIssues.filter((t) => t.status === 'Resuelto').length;
    project.kpis.technicalHealthPct = Math.min(
      99,
      74 + Math.round((resolvedCount / Math.max(1, project.technicalIssues.length)) * 24)
    );
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Responsable (${store.activeRole})`,
      role: store.activeRole,
      module: 'SEO Técnico',
      action: `Incidencia marcada como ${status}`,
      detail: `${issue.title} (${issue.url}).`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/backlinks/:prospectId/outreach', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, action, nextStatus } = req.body as {
        projectId: string;
        action: 'generate' | 'status';
        nextStatus?: ProjectWorkspace['backlinks'][number]['status'];
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      const prospect = project.backlinks.find((b) => b.id === req.params.prospectId);
      if (!prospect) return res.status(404).json({ error: 'Prospecto no encontrado.' });

      if (action === 'generate') {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Redacta un correo breve, ético y personalizado de Digital PR (máximo 140 palabras) en español para proponer una colaboración editorial a "${prospect.domain}" (${prospect.category}).
Remitente: ${project.profile.companyName} (${project.profile.domain}), ${project.profile.primaryCity}.
Contexto editorial justificado: ${prospect.editorialJustification}.
Regla: nada de intercambio de enlaces pagados ni spam; ofrece datos propios o entrevista de valor para sus lectores.`,
        });
        prospect.outreachDraft = (response.text || '').trim();
        project.auditLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: nowStamp(),
          actor: 'IA Gemini 4 Hydrogen',
          role: store.activeRole,
          module: 'Backlinks Éticos',
          action: 'Borrador de outreach generado',
          detail: `Propuesta editorial creada para ${prospect.domain} (revisión humana antes de envío).`,
        });
      } else if (nextStatus) {
        prospect.status = nextStatus;
        project.auditLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: nowStamp(),
          actor: `Responsable (${store.activeRole})`,
          role: store.activeRole,
          module: 'Backlinks Éticos',
          action: `Estado actualizado a ${nextStatus}`,
          detail: `Dominio ${prospect.domain}.`,
        });
      }

      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generando outreach ético.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/reputation/reviews/:reviewId/reply', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, action, replyText } = req.body as {
        projectId: string;
        action: 'regenerate' | 'approve' | 'publish';
        replyText?: string;
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      const review = project.reviews.find((r) => r.id === req.params.reviewId);
      if (!review) return res.status(404).json({ error: 'Reseña no encontrada.' });

      if (action === 'regenerate') {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Redacta una respuesta empática, natural y sin spam de palabras clave para una reseña de ${review.rating}/5 estrellas en Google Business Profile de "${project.profile.companyName}" (${review.sede}).
Comentario del cliente (${review.author}): "${review.comment}".
Tono: ${project.profile.brandTone}.`,
        });
        review.suggestedReply = (response.text || '').trim();
        review.replyStatus = 'Pendiente Aprobación';
      } else if (action === 'approve' || action === 'publish') {
        if (replyText !== undefined) review.suggestedReply = replyText;
        review.replyStatus = action === 'publish' ? 'Publicada' : 'Aprobada';
        project.auditLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: nowStamp(),
          actor: `Responsable (${store.activeRole})`,
          role: store.activeRole,
          module: 'GBP y Reputación',
          action: `Respuesta a reseña ${review.replyStatus}`,
          detail: `Reseña de ${review.author} en ${review.sede}.`,
        });
      }

      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error procesando respuesta a reseña.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/reputation/social/:postId/approve', (req, res) => {
    const store = ensureStore();
    const { projectId, status } = req.body as {
      projectId: string;
      status: 'Aprobada' | 'Publicada';
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const post = project.socialPosts.find((s) => s.id === req.params.postId);
    if (!post) return res.status(404).json({ error: 'Publicación no encontrada.' });

    post.status = status;
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Responsable (${store.activeRole})`,
      role: store.activeRole,
      module: 'Redes Sociales',
      action: `Publicación ${status} (${post.channel})`,
      detail: `Formato ${post.format} validado con aprobación humana previa.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/ecosystem/sync', (req, res) => {
    const store = ensureStore();
    const { projectId, bridgeId, toggleOnly } = req.body as {
      projectId: string;
      bridgeId: EcosystemBridgeItem['id'];
      toggleOnly?: boolean;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const bridge = project.ecosystemLinks.find((b) => b.id === bridgeId);
    if (!bridge) return res.status(404).json({ error: 'Conector no encontrado.' });

    if (toggleOnly) {
      bridge.status = bridge.status === 'Conectado' ? 'Pendiente' : 'Conectado';
    } else {
      bridge.status = 'Conectado';
      bridge.lastSyncAt = nowStamp();
      if (bridge.id === 'crm-leads') {
        bridge.syncedRecords = project.kpis.leadsMonth;
      } else if (bridge.id === 'kit-digital') {
        bridge.syncedRecords =
          project.articles.filter((a) => a.status !== 'Borrador IA').length +
          project.technicalIssues.filter((t) => t.status === 'Resuelto').length +
          project.geoKeywords.length;
      } else {
        bridge.syncedRecords += 1;
      }
    }

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Conector AxesIA (${store.activeRole})`,
      role: store.activeRole,
      module: 'Ecosistema Confia360',
      action: toggleOnly
        ? `${bridge.ecosystemSuite}: ${bridge.status}`
        : `Sincronización con ${bridge.ecosystemSuite}`,
      detail: `Módulo Confia360 SEO-GEO sincronizado (${bridge.syncedRecords} registros verificados vía ${bridge.endpointPath}).`,
    });

    saveStore(store);
    res.json(store);
  });

  // Helper interno para recalcular avisos proactivos por clima, stock y calendario
  function rebuildProactiveAlerts(project: ProjectWorkspace) {
    const preserved = project.proactiveAlerts.filter((a) => a.status !== 'Activa');
    const active: ProactiveAlert[] = [];
    const stamp = nowStamp();

    // 1. Reglas de Stock
    for (const item of project.catalog) {
      if (item.stockUnits <= item.minThreshold) {
        active.push({
          id: `alt-stock-low-${item.id}`,
          triggerType: 'Stock',
          severity: 'Crítica',
          title: `Stock crítico en "${item.name}" (${item.stockUnits} uds)`,
          detail: `Por debajo del mínimo (${item.minThreshold} uds). Se recomienda pausar anuncios activos de este servicio y priorizar referencias con disponibilidad.`,
          recommendedChannel: 'Google Business Profile',
          suggestedTopic: `Disponibilidad limitada en ${item.name}`,
          relatedCatalogId: item.id,
          status: 'Activa',
          createdAt: stamp,
        });
      } else if (item.stockUnits >= item.surplusThreshold) {
        active.push({
          id: `alt-stock-high-${item.id}`,
          triggerType: 'Stock',
          severity: 'Oportunidad',
          title: `Excedente disponible en "${item.name}" (${item.stockUnits} uds)`,
          detail: `Supera el umbral de excedente (${item.surplusThreshold} uds). Oportunidad directa para lanzar campaña geolocalizada en códigos postales con ranking >3.`,
          recommendedChannel: 'TikTok',
          suggestedTopic: `Campaña de rotación y oferta para ${item.name} en ${project.weather.city}`,
          relatedCatalogId: item.id,
          status: 'Activa',
          createdAt: stamp,
        });
      }
    }

    // 2. Reglas Meteorológicas (Clima real o simulado)
    const w = project.weather;
    if (w.precipitationProbPct >= 60 || w.precipitationMm >= 2.0 || w.scenarioMode === 'rain') {
      const seasonalItem =
        project.catalog.find((c) => c.seasonality === 'Lluvia / Frío') || project.catalog[0];
      active.push({
        id: `alt-weather-rain-${Date.now()}`,
        triggerType: 'Clima',
        severity: 'Oportunidad',
        title: `Previsión de lluvia en ${w.city} (${w.precipitationProbPct}% prob.)`,
        detail: `Condición "${w.conditionLabel}" (${w.temperatureC} °C). Momento óptimo para impulsar contratación online/remota y anuncios de proximidad para "${seasonalItem.name}".`,
        recommendedChannel: 'Meta Ads',
        suggestedTopic: `Servicio rápido bajo lluvia / teleatención: ${seasonalItem.name} en ${w.city}`,
        relatedCatalogId: seasonalItem.id,
        status: 'Activa',
        createdAt: stamp,
      });
    } else if (w.temperatureC >= 28 || w.scenarioMode === 'heat') {
      active.push({
        id: `alt-weather-heat-${Date.now()}`,
        triggerType: 'Clima',
        severity: 'Preventiva',
        title: `Episodio de calor en ${w.city} (${w.temperatureC} °C)`,
        detail: `Ajusta horarios de citas en Google Business Profile y destaca atención climatizada o servicio digital sin desplazamientos en YouTube Shorts y Meta.`,
        recommendedChannel: 'YouTube',
        suggestedTopic: `Ventajas de gestión sin desplazamientos en ${w.city}`,
        status: 'Activa',
        createdAt: stamp,
      });
    } else if (w.temperatureC <= 8 || w.scenarioMode === 'cold') {
      active.push({
        id: `alt-weather-cold-${Date.now()}`,
        triggerType: 'Clima',
        severity: 'Oportunidad',
        title: `Descenso térmico en ${w.city} (${w.temperatureC} °C)`,
        detail: `Refuerza llamadas y WhatsApp locales para clientes que buscan solución inmediata en su distrito.`,
        recommendedChannel: 'Meta Ads',
        suggestedTopic: `Atención inmediata en ${w.city} ante bajada de temperaturas`,
        status: 'Activa',
        createdAt: stamp,
      });
    }

    // 3. Reglas de Calendario (próximos 30 días desde la fecha actual del workspace)
    for (const ev of project.calendarEvents) {
      if (ev.commercialPriority === 'Alta') {
        active.push({
          id: `alt-cal-${ev.id}`,
          triggerType: 'Calendario',
          severity: 'Oportunidad',
          title: `Fecha clave próxima: ${ev.title} (${ev.date})`,
          detail: ev.recommendedAction,
          recommendedChannel: 'YouTube',
          suggestedTopic: `${ev.title} · ${project.profile.companyName} en ${w.city}`,
          relatedCatalogId: ev.linkedCatalogIds[0],
          status: 'Activa',
          createdAt: stamp,
        });
      }
    }

    project.proactiveAlerts = [...active, ...preserved].slice(0, 12);
  }

  app.post('/api/proactive/evaluate', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, scenario } = req.body as {
        projectId: string;
        scenario?: 'real' | 'rain' | 'heat' | 'cold';
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

      const targetScenario = scenario || project.weather.scenarioMode || 'real';
      const centerNode = project.geoKeywords[0]?.nodes[0];
      const lat = project.weather?.lat || centerNode?.lat || 40.4168;
      const lng = project.weather?.lng || centerNode?.lng || -3.7038;

      if (targetScenario === 'real') {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
        const wxRes = await fetch(url);
        if (!wxRes.ok) {
          throw new Error(`Open-Meteo devolvió estado ${wxRes.status}`);
        }
        const wxData = (await wxRes.json()) as {
          current?: { temperature_2m?: number; precipitation?: number; weather_code?: number };
          daily?: { precipitation_probability_max?: number[] };
        };
        const temp = Number(wxData.current?.temperature_2m ?? 14);
        const precip = Number(wxData.current?.precipitation ?? 0);
        const prob = Number(wxData.daily?.precipitation_probability_max?.[0] ?? 15);
        const code = Number(wxData.current?.weather_code ?? 0);
        const conditionLabel =
          code >= 61
            ? 'Lluvia activa'
            : code >= 51
              ? 'Llovizna'
              : code >= 3
                ? 'Cielo cubierto'
                : code >= 1
                  ? 'Parcialmente nublado'
                  : 'Cielo despejado';

        project.weather = {
          city: project.profile.primaryCity,
          lat,
          lng,
          temperatureC: temp,
          precipitationMm: precip,
          precipitationProbPct: prob,
          conditionLabel,
          scenarioMode: 'real',
          sourceLabel: 'Open-Meteo en vivo (coordenadas sede)',
          updatedAt: nowStamp(),
        };
      } else {
        const presets = {
          rain: {
            temperatureC: 11.4,
            precipitationMm: 6.8,
            precipitationProbPct: 88,
            conditionLabel: 'Lluvia intensa simulada',
          },
          heat: {
            temperatureC: 33.5,
            precipitationMm: 0,
            precipitationProbPct: 5,
            conditionLabel: 'Ola de calor simulada',
          },
          cold: {
            temperatureC: 5.2,
            precipitationMm: 0.2,
            precipitationProbPct: 25,
            conditionLabel: 'Ola de frío simulada',
          },
        }[targetScenario];

        project.weather = {
          city: project.profile.primaryCity,
          lat,
          lng,
          ...presets,
          scenarioMode: targetScenario,
          sourceLabel: 'Simulador de reglas meteorológicas',
          updatedAt: nowStamp(),
        };
      }

      rebuildProactiveAlerts(project);
      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: `Motor Proactivo (${store.activeRole})`,
        role: store.activeRole,
        module: 'Avisos Proactivos',
        action: `Evaluación ${project.weather.scenarioMode === 'real' ? 'clima en vivo' : 'escenario simulado'} + stock + calendario`,
        detail: `${project.weather.city}: ${project.weather.temperatureC}°C (${project.weather.conditionLabel}). Alertas activas: ${project.proactiveAlerts.filter((a) => a.status === 'Activa').length}.`,
      });
      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error consultando meteorología real.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/catalog/:itemId', (req, res) => {
    const store = ensureStore();
    const { projectId, stockUnits } = req.body as { projectId: string; stockUnits: number };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const item = project.catalog.find((c) => c.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Producto/servicio no encontrado.' });

    item.stockUnits = Math.max(0, Math.round(Number(stockUnits) || 0));
    rebuildProactiveAlerts(project);
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Gestor Catálogo (${store.activeRole})`,
      role: store.activeRole,
      module: 'Catálogo y Stock',
      action: `Stock actualizado (${item.sku})`,
      detail: `${item.name} actualizado a ${item.stockUnits} unidades; reglas proactivas reevaluadas.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/catalog', (req, res) => {
    const store = ensureStore();
    const { projectId, name, category, priceEur, stockUnits, seasonality } = req.body as {
      projectId: string;
      name: string;
      category: string;
      priceEur: number;
      stockUnits: number;
      seasonality: ProjectWorkspace['catalog'][number]['seasonality'];
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido.' });

    project.catalog.unshift({
      id: `cat-${Date.now()}`,
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      category: category?.trim() || project.profile.sector,
      priceEur: Math.max(0, Number(priceEur) || 100),
      stockUnits: Math.max(0, Math.round(Number(stockUnits) || 10)),
      minThreshold: 4,
      surplusThreshold: 15,
      seasonality: seasonality || 'Todo el año',
      linkedWebPath: '/servicios',
    });
    rebuildProactiveAlerts(project);
    saveStore(store);
    res.json(store);
  });

  app.post('/api/proactive/alerts/:alertId', (req, res) => {
    const store = ensureStore();
    const { projectId, status } = req.body as {
      projectId: string;
      status: ProactiveAlert['status'];
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const alert = project.proactiveAlerts.find((a) => a.id === req.params.alertId);
    if (!alert) return res.status(404).json({ error: 'Aviso no encontrado.' });

    alert.status = status;
    saveStore(store);
    res.json(store);
  });

  app.post('/api/campaigns/generate', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, channel, topic, budgetEurMonth, objective, alertId } = req.body as {
        projectId: string;
        channel: MediaCampaign['channel'];
        topic: string;
        budgetEurMonth: number;
        objective: MediaCampaign['objective'];
        alertId?: string;
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      if (!topic?.trim()) return res.status(400).json({ error: 'Indica el tema o producto de campaña.' });

      const weakPostalCodes = project.postalMetrics
        .slice()
        .sort((a, b) => b.avgPosition - a.avgPosition)
        .slice(0, 3)
        .map((z) => z.postalCode);

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Crea una campaña publicitaria y de vídeo corto geolocalizada en español para "${project.profile.companyName}" en ${project.profile.primaryCity}.
Canal: "${channel}" (adapta formato a Meta Ads, TikTok o YouTube Shorts/Video).
Tema / Oferta: "${topic}".
Objetivo: "${objective}".
Presupuesto mensual: ${budgetEurMonth} €.
Códigos postales prioritarios del Geo-Grid: ${weakPostalCodes.join(', ') || '28013'}.
Datos reales verificados: ${project.profile.valueProposition}. Precios: ${project.profile.priceRange}. Garantías: ${project.profile.guarantees}.
Afirmaciones prohibidas (NUNCA usar): ${project.profile.forbiddenClaims.join(' | ')}.
Clima actual en sede: ${project.weather.temperatureC}°C (${project.weather.conditionLabel}).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              hook3s: { type: Type.STRING },
              videoScript: { type: Type.STRING },
              adCopyPrimary: { type: Type.STRING },
              adHeadline: { type: Type.STRING },
              ctaLabel: { type: Type.STRING },
              estimatedLeads: { type: Type.NUMBER },
            },
          },
        },
      });

      const gen = JSON.parse(response.text || '{}');
      const budget = Math.max(100, Number(budgetEurMonth) || 400);
      const estLeads = Math.max(5, Math.round(Number(gen.estimatedLeads) || budget / 19));

      const campaign: MediaCampaign = {
        id: `camp-${Date.now()}`,
        channel,
        title: gen.title || topic,
        objective,
        status: 'Borrador',
        budgetEurMonth: budget,
        targetPostalCodes: weakPostalCodes.length ? weakPostalCodes : ['28013'],
        calendarOrAlertRef: topic,
        hook3s: gen.hook3s || `¿Buscas ${project.profile.sector} en ${project.profile.primaryCity}?`,
        videoScript: gen.videoScript || 'Guion corto estructurado de 30s.',
        adCopyPrimary: gen.adCopyPrimary || project.profile.valueProposition,
        adHeadline: gen.adHeadline || `${project.profile.companyName} · ${project.profile.primaryCity}`,
        ctaLabel: gen.ctaLabel || 'Solicitar información',
        estimatedLeads: estLeads,
        estimatedCplEur: Number((budget / estLeads).toFixed(1)),
        createdAt: nowStamp().split(' ')[0],
      };

      project.campaigns.unshift(campaign);
      if (alertId) {
        const linkedAlert = project.proactiveAlerts.find((a) => a.id === alertId);
        if (linkedAlert) linkedAlert.status = 'Convertida en campaña';
      }
      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: 'IA Gemini 4 Hydrogen',
        role: store.activeRole,
        module: `Campañas ${channel}`,
        action: 'Borrador de campaña generado',
        detail: `"${campaign.title}" (${budget} €/mes) pendiente de aprobación humana.`,
      });
      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generando campaña multicanal.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/campaigns/:campaignId/status', (req, res) => {
    const store = ensureStore();
    const { projectId, status } = req.body as {
      projectId: string;
      status: MediaCampaign['status'];
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const camp = project.campaigns.find((c) => c.id === req.params.campaignId);
    if (!camp) return res.status(404).json({ error: 'Campaña no encontrada.' });

    camp.status = status;
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Responsable (${store.activeRole})`,
      role: store.activeRole,
      module: `Campañas ${camp.channel}`,
      action: `Estado cambiado a ${status}`,
      detail: `Campaña "${camp.title}" actualizada.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/policy', (req, res) => {
    const store = ensureStore();
    const { projectId, mode, minAutoStars } = req.body as {
      projectId: string;
      mode: ReviewAutomationPolicy['mode'];
      minAutoStars?: 4 | 5;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    project.reviewPolicy = {
      mode,
      minAutoStars: minAutoStars || project.reviewPolicy?.minAutoStars || 4,
      lastUpdatedAt: nowStamp(),
    };
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Responsable (${store.activeRole})`,
      role: store.activeRole,
      module: 'GBP y Reputación',
      action: `Política de reseñas: ${mode}`,
      detail: `Configurado umbral de autopublicación desde ${project.reviewPolicy.minAutoStars} estrellas.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.get('/api/admin/status', (req, res) => {
    const record = ensureAdminAuth();
    const session = getValidAdminSession(req);
    const envManaged = Boolean(process.env.CONFIA_ADMIN_PIN?.trim());
    res.json({
      unlocked: Boolean(session),
      username: record.username,
      isDefaultPin: record.isDefaultPin && !envManaged,
      updatedAt: record.updatedAt,
      envManaged,
    });
  });

  app.post('/api/admin/unlock', (req, res) => {
    const clientKey = req.ip || 'local';
    const now = Date.now();
    const attempt = adminFailedAttempts.get(clientKey);
    if (attempt && attempt.lockedUntil > now) {
      const waitSecs = Math.ceil((attempt.lockedUntil - now) / 1000);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Espera ${waitSecs} s antes de reintentar.`,
      });
    }

    const { username, pin } = req.body as { username?: string; pin?: string };
    const record = ensureAdminAuth();
    const cleanUser = typeof username === 'string' ? username.trim() : '';
    const cleanPin = typeof pin === 'string' ? pin.trim() : '';

    if (!cleanUser || !cleanPin) {
      return res.status(400).json({ error: 'Introduce usuario y clave PIN.' });
    }

    const validUser = cleanUser.toLowerCase() === record.username.toLowerCase();
    const validPin = verifyAdminPin(cleanPin, record);

    if (!validUser || !validPin) {
      const nextCount = (attempt?.count || 0) + 1;
      adminFailedAttempts.set(clientKey, {
        count: nextCount,
        lockedUntil: nextCount >= 5 ? now + 30_000 : 0,
      });
      return res.status(401).json({ error: 'Usuario o PIN incorrecto.' });
    }

    adminFailedAttempts.delete(clientKey);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + 2 * 60 * 60 * 1000;
    adminSessions.set(token, { username: record.username, expiresAt });
    const envManaged = Boolean(process.env.CONFIA_ADMIN_PIN?.trim());

    res.json({
      token,
      status: {
        unlocked: true,
        username: record.username,
        isDefaultPin: record.isDefaultPin && !envManaged,
        updatedAt: record.updatedAt,
        envManaged,
      },
    });
  });

  app.post('/api/admin/lock', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      adminSessions.delete(token);
    }
    const record = ensureAdminAuth();
    const envManaged = Boolean(process.env.CONFIA_ADMIN_PIN?.trim());
    res.json({
      unlocked: false,
      username: record.username,
      isDefaultPin: record.isDefaultPin && !envManaged,
      updatedAt: record.updatedAt,
      envManaged,
    });
  });

  app.post('/api/admin/change-pin', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    if (process.env.CONFIA_ADMIN_PIN?.trim()) {
      return res.status(400).json({
        error: 'El PIN está gestionado por la variable de entorno del servidor CONFIA_ADMIN_PIN.',
      });
    }

    const { currentPin, newPin } = req.body as {
      currentPin?: string;
      newPin?: string;
    };
    const cleanCurrent = typeof currentPin === 'string' ? currentPin.trim() : '';
    const cleanNew = typeof newPin === 'string' ? newPin.trim() : '';

    if (!/^\d{4,12}$/.test(cleanNew)) {
      return res.status(400).json({
        error: 'El nuevo PIN debe contener entre 4 y 12 dígitos numéricos.',
      });
    }

    const record = ensureAdminAuth();
    if (!cleanCurrent || !verifyAdminPin(cleanCurrent, record)) {
      return res.status(401).json({ error: 'El PIN actual no es correcto.' });
    }

    const { salt, hash } = hashPinWithSalt(cleanNew);
    const updatedRecord: AdminAuthRecord = {
      username: record.username,
      pinSalt: salt,
      pinHash: hash,
      isDefaultPin: false,
      updatedAt: nowStamp(),
    };
    saveAdminAuth(updatedRecord);

    adminSessions.clear();
    const freshToken = crypto.randomBytes(32).toString('hex');
    adminSessions.set(freshToken, {
      username: updatedRecord.username,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });

    const store = ensureStore();
    const activeProject =
      store.projects.find((p) => p.id === store.activeProjectId) || store.projects[0];
    if (activeProject) {
      activeProject.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: `Admin ${updatedRecord.username}`,
        role: store.activeRole,
        module: 'Seguridad y Acceso Confia360',
        action: 'PIN de administración modificado',
        detail: 'Clave PIN actualizada y almacenada mediante hash criptográfico en servidor.',
      });
      saveStore(store);
    }

    res.json({
      token: freshToken,
      status: {
        unlocked: true,
        username: updatedRecord.username,
        isDefaultPin: false,
        updatedAt: updatedRecord.updatedAt,
        envManaged: false,
      },
    });
  });

  app.post('/api/reputation/sources', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const { projectId, enabledSources } = req.body as {
      projectId: string;
      enabledSources: ReputationSourcePlatform[];
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const catalog =
      project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
        ? project.reputationSourcesCatalog
        : DEFAULT_REPUTATION_SOURCE_CATALOG.map((item) => ({ ...item }));
    project.reputationSourcesCatalog = catalog;

    const allowedNames = new Set([
      ...ALL_REPUTATION_SOURCES,
      ...catalog.map((c) => c.name),
    ]);

    const validSources = Array.from(
      new Set(
        (Array.isArray(enabledSources) ? enabledSources : []).filter(
          (src): src is ReputationSourcePlatform =>
            typeof src === 'string' && allowedNames.has(src)
        )
      )
    );

    if (validSources.length === 0) {
      return res.status(400).json({
        error: 'Selecciona al menos una fuente activa de reseñas o comentarios.',
      });
    }

    const socialSourceNames = new Set([
      ...SOCIAL_REPUTATION_SOURCES,
      ...catalog.filter((c) => c.category === 'social').map((c) => c.name),
    ]);

    const socialEnabled = validSources.some((src) => socialSourceNames.has(src));

    project.enabledReputationSources = validSources;
    project.socialListeningAddonEnabled = socialEnabled;
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Admin ${session.username}`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Cobertura Omnicanal',
      action: 'Fuentes de reseñas y críticas actualizadas',
      detail: `Fuentes activas (${validSources.length}): ${validSources.join(', ')}.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/sources/catalog', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const { projectId, name, label, detail, category, profileUrl, activateNow } = req.body as {
      projectId: string;
      name: string;
      label?: string;
      detail?: string;
      category?: ReputationSourceCategory;
      profileUrl?: string;
      activateNow?: boolean;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanLabel = (typeof label === 'string' ? label.trim() : '') || cleanName;
    const cleanDetail =
      (typeof detail === 'string' ? detail.trim() : '') ||
      'Fuente personalizada monitorizada en el buzón unificado.';
    const validCategory: ReputationSourceCategory =
      category === 'base' || category === 'sectorial' || category === 'social'
        ? category
        : 'sectorial';
    const cleanUrl = typeof profileUrl === 'string' ? profileUrl.trim() : '';

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({
        error: 'Indica un nombre válido para la nueva fuente (mínimo 2 caracteres).',
      });
    }
    if (cleanUrl && !/^https?:\/\/|^@/i.test(cleanUrl)) {
      return res.status(400).json({
        error: 'La URL o identificador debe comenzar por http://, https:// o @usuario.',
      });
    }

    const catalog =
      project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
        ? project.reputationSourcesCatalog
        : DEFAULT_REPUTATION_SOURCE_CATALOG.map((item) => ({ ...item }));

    const duplicate = catalog.some(
      (item) =>
        item.name.toLowerCase() === cleanName.toLowerCase() ||
        item.label.toLowerCase() === cleanLabel.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({
        error: `Ya existe una fuente registrada con el nombre "${cleanName}".`,
      });
    }

    const newSource: ReputationSourceDefinition = {
      id: `src-${Date.now()}`,
      name: cleanName,
      label: cleanLabel,
      detail: cleanDetail,
      category: validCategory,
      profileUrl: cleanUrl || undefined,
      isDefault: false,
    };

    project.reputationSourcesCatalog = [...catalog, newSource];
    if (activateNow !== false) {
      const currentEnabled = project.enabledReputationSources || [...CORE_REPUTATION_SOURCES];
      if (!currentEnabled.includes(newSource.name)) {
        project.enabledReputationSources = [...currentEnabled, newSource.name];
      }
      if (validCategory === 'social') {
        project.socialListeningAddonEnabled = true;
      }
    }

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Admin ${session.username}`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Gestión de Fuentes',
      action: `Nueva fuente añadida: ${newSource.label}`,
      detail: `Categoría: ${validCategory}. ${activateNow !== false ? 'Activada inmediatamente en el buzón unificado.' : 'Añadida al catálogo.'}`,
    });
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/reputation/sources/catalog/:sourceId', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const { projectId, name, label, detail, category, profileUrl } = req.body as {
      projectId: string;
      name?: string;
      label?: string;
      detail?: string;
      category?: ReputationSourceCategory;
      profileUrl?: string;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const catalog =
      project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
        ? project.reputationSourcesCatalog
        : DEFAULT_REPUTATION_SOURCE_CATALOG.map((item) => ({ ...item }));
    project.reputationSourcesCatalog = catalog;

    const target = catalog.find((item) => item.id === req.params.sourceId);
    if (!target) return res.status(404).json({ error: 'Fuente no encontrada.' });

    const nextLabel = typeof label === 'string' ? label.trim() : target.label;
    const nextDetail = typeof detail === 'string' ? detail.trim() : target.detail;
    const nextCategory: ReputationSourceCategory =
      category === 'base' || category === 'sectorial' || category === 'social'
        ? category
        : target.category;
    const nextUrl =
      typeof profileUrl === 'string' ? profileUrl.trim() : target.profileUrl || '';

    if (!nextLabel || nextLabel.length < 2) {
      return res.status(400).json({ error: 'El nombre visible debe tener al menos 2 caracteres.' });
    }
    if (nextUrl && !/^https?:\/\/|^@/i.test(nextUrl)) {
      return res.status(400).json({
        error: 'La URL o identificador debe comenzar por http://, https:// o @usuario.',
      });
    }

    const oldName = target.name;
    const nextName =
      !target.isDefault && typeof name === 'string' && name.trim().length >= 2
        ? name.trim()
        : target.name;

    if (
      nextName.toLowerCase() !== oldName.toLowerCase() &&
      catalog.some((c) => c.id !== target.id && c.name.toLowerCase() === nextName.toLowerCase())
    ) {
      return res.status(409).json({
        error: `Ya existe otra fuente llamada "${nextName}".`,
      });
    }

    target.name = nextName;
    target.label = nextLabel;
    target.detail = nextDetail || target.detail;
    target.category = nextCategory;
    target.profileUrl = nextUrl || undefined;

    if (nextName !== oldName) {
      project.enabledReputationSources = (project.enabledReputationSources || []).map((src) =>
        src === oldName ? nextName : src
      );
      project.reviews = (project.reviews || []).map((rev) =>
        rev.platform === oldName ? { ...rev, platform: nextName } : rev
      );
    }

    const socialNames = new Set(
      catalog.filter((c) => c.category === 'social').map((c) => c.name)
    );
    project.socialListeningAddonEnabled = (project.enabledReputationSources || []).some((src) =>
      socialNames.has(src)
    );

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Admin ${session.username}`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Gestión de Fuentes',
      action: `Fuente modificada: ${target.label}`,
      detail: `Actualizada configuración (${target.category}) en catálogo omnicanal.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.delete('/api/reputation/sources/catalog/:sourceId', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const projectId =
      (req.body as { projectId?: string } | undefined)?.projectId ||
      (typeof req.query.projectId === 'string' ? req.query.projectId : '');
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const catalog =
      project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
        ? project.reputationSourcesCatalog
        : DEFAULT_REPUTATION_SOURCE_CATALOG.map((item) => ({ ...item }));
    const target = catalog.find((item) => item.id === req.params.sourceId);
    if (!target) return res.status(404).json({ error: 'Fuente no encontrada.' });
    if (target.isDefault) {
      return res.status(400).json({
        error: 'Las fuentes base del sistema no se eliminan; puedes desactivarlas en el selector múltiple o editar sus detalles.',
      });
    }

    project.reputationSourcesCatalog = catalog.filter((item) => item.id !== target.id);
    const remainingEnabled = (project.enabledReputationSources || []).filter(
      (src) => src !== target.name
    );
    project.enabledReputationSources =
      remainingEnabled.length > 0 ? remainingEnabled : ['Google Business Profile'];

    const socialNames = new Set(
      project.reputationSourcesCatalog.filter((c) => c.category === 'social').map((c) => c.name)
    );
    project.socialListeningAddonEnabled = project.enabledReputationSources.some((src) =>
      socialNames.has(src)
    );

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Admin ${session.username}`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Gestión de Fuentes',
      action: `Fuente personalizada eliminada: ${target.label}`,
      detail: 'Retirada del catálogo y de los selectores activos.',
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/social-addon', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const { projectId, enabled } = req.body as { projectId: string; enabled: boolean };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const catalog =
      project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
        ? project.reputationSourcesCatalog
        : DEFAULT_REPUTATION_SOURCE_CATALOG.map((item) => ({ ...item }));
    const socialSources = Array.from(
      new Set([
        ...SOCIAL_REPUTATION_SOURCES,
        ...catalog.filter((c) => c.category === 'social').map((c) => c.name),
      ])
    );

    const isEnabled = Boolean(enabled);
    const currentNonSocial = (
      project.enabledReputationSources || [...CORE_REPUTATION_SOURCES]
    ).filter((src) => !socialSources.includes(src));

    project.socialListeningAddonEnabled = isEnabled;
    project.enabledReputationSources = isEnabled
      ? Array.from(new Set([...currentNonSocial, ...socialSources]))
      : currentNonSocial.length > 0
        ? currentNonSocial
        : ['Google Business Profile'];

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Admin ${session.username}`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Add-on Social',
      action: isEnabled
        ? 'Add-on Escucha Social activado (Meta, TikTok, YouTube)'
        : 'Add-on Escucha Social desactivado',
      detail: isEnabled
        ? 'Los comentarios negativos en Meta, TikTok y YouTube alimentan el buzón omnicanal e Incidencias de Reseñas.'
        : 'Monitorización limitada a las fuentes base y portales sectoriales activos.',
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/reviews/simulate', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, author, rating, comment, platform } = req.body as {
        projectId: string;
        author: string;
        rating: number;
        comment: string;
        platform?: ReputationSourcePlatform;
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      if (!comment?.trim()) return res.status(400).json({ error: 'Escribe el texto de la reseña o comentario.' });

      const catalog =
        project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
          ? project.reputationSourcesCatalog
          : DEFAULT_REPUTATION_SOURCE_CATALOG;
      const targetPlatform: ReputationSourcePlatform = platform || 'Google Business Profile';
      const catalogEntry = catalog.find((c) => c.name === targetPlatform);
      const isSocial =
        catalogEntry?.category === 'social' ||
        targetPlatform === 'Meta (Instagram/Facebook)' ||
        targetPlatform === 'TikTok' ||
        targetPlatform === 'YouTube';
      const isSectorial =
        catalogEntry?.category === 'sectorial' ||
        targetPlatform === 'TripAdvisor' ||
        targetPlatform === 'Doctoralia' ||
        targetPlatform === 'Habitissimo' ||
        targetPlatform === 'Trustpilot';

      const activeSources =
        project.enabledReputationSources ||
        (project.socialListeningAddonEnabled
          ? [...ALL_REPUTATION_SOURCES]
          : [...CORE_REPUTATION_SOURCES]);

      if (!activeSources.includes(targetPlatform) || (isSocial && !project.socialListeningAddonEnabled)) {
        return res.status(400).json({
          error: `La fuente "${targetPlatform}" no está activada. Habilítala en Configuración y Fuentes con tu PIN de administrador.`,
        });
      }

      const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Redacta una respuesta empática, natural y sin spam de palabras clave para una ${
          isSocial ? 'mención/comentario en red social' : 'reseña'
        } en "${targetPlatform}" con valoración equivalente de ${cleanRating}/5 estrellas para "${project.profile.companyName}" (${project.profile.primaryCity}).
Autor: ${author || 'Cliente local'}.
Comentario: "${comment}".
Tono: ${project.profile.brandTone}.
Regla: no expongas datos personales privados en la respuesta pública; si es una crítica, invita a resolverlo por vía directa. Prohibido usar: ${project.profile.forbiddenClaims.join(', ')}.`,
      });
      const suggestedReply = (response.text || '').trim();
      const policy = project.reviewPolicy || { mode: 'Mixto', minAutoStars: 4 };

      const autoPublish =
        policy.mode === 'Automático' ||
        (policy.mode === 'Mixto' && cleanRating >= policy.minAutoStars);

      const sentiment =
        cleanRating >= 4 ? 'Positivo' : cleanRating === 3 ? 'Neutro' : 'Crítico';
      const channelKind: 'Reseña Local' | 'Portal Sectorial' | 'Comentario Social' = isSocial
        ? 'Comentario Social'
        : isSectorial
          ? 'Portal Sectorial'
          : 'Reseña Local';

      const revId = `rev-${Date.now()}`;
      project.reviews.unshift({
        id: revId,
        author: author?.trim() || 'Cliente verificado',
        sede: isSocial
          ? `${targetPlatform} · Comentario`
          : isSectorial
            ? `${targetPlatform} · Ficha Sectorial`
            : `Sede ${project.profile.primaryCity}`,
        platform: targetPlatform,
        channelKind,
        rating: cleanRating,
        date: nowStamp().split(' ')[0],
        comment: comment.trim(),
        sentiment,
        suggestedReply,
        replyStatus: autoPublish ? 'Publicada' : 'Pendiente Aprobación',
      });

      if (project.reputationKpisTimeline?.length) {
        const latest = project.reputationKpisTimeline[project.reputationKpisTimeline.length - 1];
        latest.reviewsCount += 1;
        latest.avgRating = Number(
          ((latest.avgRating * 10 + cleanRating) / 11).toFixed(1)
        );
        const replied = project.reviews.filter((r) => r.replyStatus === 'Publicada').length;
        latest.responseRatePct = Math.min(
          100,
          Math.max(latest.responseRatePct, Math.round((replied / Math.max(1, project.reviews.length)) * 100))
        );
      }

      if (cleanRating <= 3) {
        const lower = comment.toLowerCase();
        const category: ReviewIncidentCase['category'] =
          lower.includes('precio') || lower.includes('caro') || lower.includes('ocult')
            ? 'Precio'
            : lower.includes('factur') || lower.includes('cobro')
              ? 'Facturación'
              : lower.includes('tard') || lower.includes('espera') || lower.includes('retras')
                ? 'Espera / Retraso'
                : lower.includes('trato') || lower.includes('atenci')
                  ? 'Trato'
                  : 'Calidad';
        project.reviewIncidents = project.reviewIncidents || [];
        project.reviewIncidents.unshift({
          id: `inc-${Date.now()}`,
          source: isSocial ? 'Comentario Social' : isSectorial ? 'Portal Sectorial' : 'Reseña GBP',
          reviewId: revId,
          customerName: author?.trim() || 'Cliente verificado',
          rating: cleanRating,
          platform: targetPlatform,
          category,
          severity: cleanRating <= 2 ? 'Alta' : 'Media',
          summary: comment.trim(),
          status: 'Abierta',
          owner: 'Lucía Serrano',
          slaDueAt: '24 h desde detección',
          suggestedAction: isSocial
            ? `Responder brevemente en ${targetPlatform} sin entrar en conflicto público y derivar a mensaje directo o soporte privado hoy.`
            : `Responder en ${targetPlatform} con tono profesional y contactar por vía privada para resolver la incidencia sin exponer datos personales.`,
          resolutionNotes: '',
          createdAt: nowStamp(),
        });
      }

      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: autoPublish ? 'Regla Automática Omnicanal' : 'Cortafuegos Humano Reputación',
        role: store.activeRole,
        module: `ReputaciónLocal · ${targetPlatform}`,
        action: autoPublish
          ? `Respuesta auto-publicada (${cleanRating}★)`
          : `Retenida para aprobación humana (${cleanRating}★)`,
        detail: `Canal: ${targetPlatform}. Política activa: ${policy.mode}.${
          cleanRating <= 3 ? ' Abierta incidencia automática con SLA 24 h.' : ''
        }`,
      });

      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error evaluando reseña entrante.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/calendar/events', (req, res) => {
    const store = ensureStore();
    const {
      projectId,
      date,
      title,
      scope,
      commercialPriority,
      linkedCatalogIds,
      recommendedAction,
    } = req.body as {
      projectId: string;
      date: string;
      title: string;
      scope: CalendarEvent['scope'];
      commercialPriority: CalendarEvent['commercialPriority'];
      linkedCatalogIds?: string[];
      recommendedAction?: string;
    };

    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!title?.trim() || !date?.trim()) {
      return res.status(400).json({ error: 'Indica fecha y título del evento comercial.' });
    }

    const newEvent: CalendarEvent = {
      id: `cal-${Date.now()}`,
      date: date.trim(),
      title: title.trim(),
      scope: scope || 'Sectorial',
      commercialPriority: commercialPriority || 'Alta',
      linkedCatalogIds: linkedCatalogIds || [],
      recommendedAction:
        recommendedAction?.trim() ||
        `Activar contenidos locales y campaña orientada a ${title.trim()} en ${project.profile.primaryCity}.`,
    };

    project.calendarEvents.push(newEvent);
    project.calendarEvents.sort((a, b) => a.date.localeCompare(b.date));
    rebuildProactiveAlerts(project);
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Planificación (${store.activeRole})`,
      role: store.activeRole,
      module: 'Calendario Estratégico',
      action: 'Fecha comercial añadida',
      detail: `${newEvent.date} · ${newEvent.title} (${newEvent.scope}).`,
    });

    saveStore(store);
    res.json(store);
  });

  app.post('/api/calendar/actions', (req, res) => {
    const store = ensureStore();
    const {
      projectId,
      title,
      scheduledDate,
      seasonalityTag,
      actionType,
      channel,
      linkedEventId,
      linkedAlertId,
      linkedCatalogId,
      notes,
      owner,
    } = req.body as {
      projectId: string;
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
    };

    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!title?.trim() || !scheduledDate?.trim()) {
      return res.status(400).json({ error: 'Indica título y fecha programada de la acción.' });
    }

    const newAction: SeasonalAction = {
      id: `sea-${Date.now()}`,
      title: title.trim(),
      scheduledDate: scheduledDate.trim(),
      seasonalityTag: seasonalityTag || 'Campaña Comercial / Festivo',
      actionType: actionType || 'Artículo SEO/GEO',
      channel: channel || 'Blog / Web',
      linkedEventId: linkedEventId || undefined,
      linkedAlertId: linkedAlertId || undefined,
      linkedCatalogId: linkedCatalogId || undefined,
      notes: notes?.trim() || '',
      owner: owner?.trim() || `Responsable (${store.activeRole})`,
      status: 'Programada',
    };

    if (!project.seasonalActions) project.seasonalActions = [];
    project.seasonalActions.unshift(newAction);

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: newAction.owner,
      role: store.activeRole,
      module: 'Calendario Estratégico',
      action: 'Acción estacional programada',
      detail: `${newAction.scheduledDate} · "${newAction.title}" (${newAction.actionType} · ${newAction.channel}).`,
    });

    saveStore(store);
    res.json(store);
  });

  app.patch('/api/calendar/actions/:actionId', (req, res) => {
    const store = ensureStore();
    const { projectId, status, scheduledDate } = req.body as {
      projectId: string;
      status?: SeasonalAction['status'];
      scheduledDate?: string;
    };

    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const action = (project.seasonalActions || []).find((a) => a.id === req.params.actionId);
    if (!action) return res.status(404).json({ error: 'Acción estacional no encontrada.' });

    if (status) action.status = status;
    if (scheduledDate?.trim()) action.scheduledDate = scheduledDate.trim();

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Planificación (${store.activeRole})`,
      role: store.activeRole,
      module: 'Calendario Estratégico',
      action: `Acción actualizada (${action.status})`,
      detail: `${action.scheduledDate} · "${action.title}".`,
    });

    saveStore(store);
    res.json(store);
  });

  app.delete('/api/calendar/actions/:actionId', (req, res) => {
    const store = ensureStore();
    const projectId = (req.body as { projectId?: string })?.projectId || (req.query.projectId as string);
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const target = (project.seasonalActions || []).find((a) => a.id === req.params.actionId);
    if (!target) return res.status(404).json({ error: 'Acción estacional no encontrada.' });

    project.seasonalActions = project.seasonalActions.filter((a) => a.id !== req.params.actionId);
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Planificación (${store.activeRole})`,
      role: store.activeRole,
      module: 'Calendario Estratégico',
      action: 'Acción estacional eliminada',
      detail: `Eliminada acción "${target.title}" (${target.scheduledDate}).`,
    });

    saveStore(store);
    res.json(store);
  });

  app.post('/api/ecosystem/modules', (req, res) => {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const store = ensureStore();
    const { projectId, enabledModules } = req.body as {
      projectId: string;
      enabledModules: ConfiaModuleId[];
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const valid = (enabledModules || []).filter((m): m is ConfiaModuleId =>
      ['reputacion_local', 'seo_geo', 'campanas'].includes(m)
    );
    if (valid.length === 0) {
      return res.status(400).json({ error: 'Debe permanecer al menos 1 módulo activo en Confia360.' });
    }
    project.enabledModules = Array.from(new Set(valid));
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Admin ${session.username}`,
      role: store.activeRole,
      module: 'Ecosistema Confia360',
      action: 'Módulos comerciales actualizados',
      detail: `Módulos activos: ${project.enabledModules.join(', ')}.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/reputation/gbp/checklist/:itemId', (req, res) => {
    const store = ensureStore();
    const { projectId, status } = req.body as {
      projectId: string;
      status: 'Pendiente' | 'Completado';
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const item = project.gbpAudit.checklist.find((c) => c.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Elemento del checklist no encontrado.' });

    item.status = status;
    const total = project.gbpAudit.checklist.length || 1;
    const done = project.gbpAudit.checklist.filter((c) => c.status === 'Completado').length;
    project.gbpAudit.completenessScore = Math.min(100, Math.round(68 + (done / total) * 32));
    project.gbpAudit.lastAuditedAt = nowStamp();

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Optimización GBP (${store.activeRole})`,
      role: store.activeRole,
      module: 'ReputaciónLocal · GBP',
      action: `Checklist: ${item.status}`,
      detail: `"${item.title}" marcado como ${item.status}. Completitud actual: ${project.gbpAudit.completenessScore}%.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/gbp/dismiss-alert', (req, res) => {
    const store = ensureStore();
    const { projectId, acceptChange } = req.body as { projectId: string; acceptChange?: boolean };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const prev = project.gbpAudit.thirdPartyChangeAlert;
    project.gbpAudit.thirdPartyChangeAlert = null;
    project.gbpAudit.lastAuditedAt = nowStamp();
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Control GBP (${store.activeRole})`,
      role: store.activeRole,
      module: 'ReputaciónLocal · GBP',
      action: acceptChange ? 'Cambio de terceros validado' : 'Cambio de terceros rechazado y bloqueado',
      detail: prev || 'Alerta de modificación de ficha resuelta.',
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/gbp/optimize', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId } = req.body as { projectId: string };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Optimiza la ficha de Google Business Profile de "${project.profile.companyName}" (${project.profile.sector} en ${project.profile.primaryCity}).
Servicios: ${project.profile.services.join(', ')}.
Propuesta de valor: ${project.profile.valueProposition}.
Prohibido usar: ${project.profile.forbiddenClaims.join(', ')}.
Genera en JSON:
- optimizedDescription (máximo 650 caracteres, natural, local y veraz)
- suggestedSecondaryCategories (2 categorías secundarias de Google Maps)
- newQaQuestion y newQaAnswer (una pregunta frecuente real de cliente local y respuesta clara)
- localPostType ('Novedad' | 'Oferta'), localPostTitle, localPostBody, localPostCta.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              optimizedDescription: { type: Type.STRING },
              suggestedSecondaryCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
              newQaQuestion: { type: Type.STRING },
              newQaAnswer: { type: Type.STRING },
              localPostType: { type: Type.STRING },
              localPostTitle: { type: Type.STRING },
              localPostBody: { type: Type.STRING },
              localPostCta: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse(extractJsonBlock(response.text || '{}')) as {
        optimizedDescription?: string;
        suggestedSecondaryCategories?: string[];
        newQaQuestion?: string;
        newQaAnswer?: string;
        localPostType?: string;
        localPostTitle?: string;
        localPostBody?: string;
        localPostCta?: string;
      };

      if (parsed.optimizedDescription) {
        project.gbpAudit.optimizedDescription = parsed.optimizedDescription;
      }
      if (parsed.suggestedSecondaryCategories?.length) {
        project.gbpAudit.secondaryCategories = Array.from(
          new Set([...project.gbpAudit.secondaryCategories, ...parsed.suggestedSecondaryCategories])
        ).slice(0, 5);
      }
      if (parsed.newQaQuestion && parsed.newQaAnswer) {
        project.gbpAudit.qas.unshift({
          id: `qa-${Date.now()}`,
          question: parsed.newQaQuestion,
          answer: parsed.newQaAnswer,
          source: 'Sugerida IA',
          status: 'Pendiente',
        });
      }
      if (parsed.localPostTitle && parsed.localPostBody) {
        const postType: GbpLocalPost['type'] =
          parsed.localPostType === 'Oferta' || parsed.localPostType === 'Evento'
            ? parsed.localPostType
            : 'Novedad';
        project.gbpAudit.localPosts.unshift({
          id: `post-gbp-${Date.now()}`,
          type: postType,
          title: parsed.localPostTitle,
          body: parsed.localPostBody,
          ctaText: parsed.localPostCta || 'Más información',
          scheduledDate: nowStamp().split(' ')[0],
          status: 'Borrador IA',
        });
      }
      project.gbpAudit.lastAuditedAt = nowStamp();
      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: 'Optimizador IA GBP',
        role: store.activeRole,
        module: 'ReputaciónLocal · GBP',
        action: 'Optimización IA de ficha generada',
        detail: 'Actualizada descripción optimizada, Q&A sugerida y borrador de publicación local.',
      });
      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error optimizando ficha GBP.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/reputation/gbp/qa/:qaId', (req, res) => {
    const store = ensureStore();
    const { projectId, answer, status } = req.body as {
      projectId: string;
      answer?: string;
      status?: 'Pendiente' | 'Publicada';
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const qa = project.gbpAudit.qas.find((q) => q.id === req.params.qaId);
    if (!qa) return res.status(404).json({ error: 'Pregunta Q&A no encontrada.' });
    if (answer !== undefined) qa.answer = answer;
    if (status) qa.status = status;
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/gbp/posts', (req, res) => {
    const store = ensureStore();
    const { projectId, type, title, body, ctaText, scheduledDate } = req.body as {
      projectId: string;
      type: GbpLocalPost['type'];
      title: string;
      body: string;
      ctaText?: string;
      scheduledDate?: string;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Título y contenido obligatorios.' });
    }
    project.gbpAudit.localPosts.unshift({
      id: `post-gbp-${Date.now()}`,
      type: type || 'Novedad',
      title: title.trim(),
      body: body.trim(),
      ctaText: ctaText?.trim() || 'Más información',
      scheduledDate: scheduledDate || nowStamp().split(' ')[0],
      status: 'Aprobada',
    });
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/reputation/gbp/posts/:postId', (req, res) => {
    const store = ensureStore();
    const { projectId, status } = req.body as {
      projectId: string;
      status: GbpLocalPost['status'];
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const post = project.gbpAudit.localPosts.find((p) => p.id === req.params.postId);
    if (!post) return res.status(404).json({ error: 'Publicación local no encontrada.' });
    post.status = status;
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Editor (${store.activeRole})`,
      role: store.activeRole,
      module: 'ReputaciónLocal · GBP',
      action: `Publicación local: ${status}`,
      detail: `Post GBP "${post.title}" pasado a ${status}.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/reputation/invitations/config', (req, res) => {
    const store = ensureStore();
    const { projectId, ...updates } = req.body as {
      projectId: string;
    } & Partial<InvitationWebhookConfig>;
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    project.invitationConfig = { ...project.invitationConfig, ...updates };
    saveStore(store);
    res.json(store);
  });

  function dispatchInvitation(
    project: ProjectWorkspace,
    payload: {
      customerName: string;
      contact: string;
      serviceName: string;
      channel?: ReviewInvitationChannel;
      consentVerified?: boolean;
      viaWebhook?: boolean;
    },
    role: UserRole
  ): ReviewInvitation {
    const optedOut = project.reviewInvitations.some(
      (i) => i.contact.toLowerCase() === payload.contact.trim().toLowerCase() && i.status === 'Baja RGPD'
    );
    if (optedOut) {
      throw new Error('Este contacto solicitó Baja RGPD anteriormente. Envío bloqueado por cumplimiento.');
    }
    const invitation: ReviewInvitation = {
      id: `inv-${Date.now()}`,
      customerName: payload.customerName.trim(),
      contact: payload.contact.trim(),
      serviceName: payload.serviceName.trim() || project.profile.services[0] || 'Servicio local',
      channel: payload.channel || project.invitationConfig.defaultChannel || 'WhatsApp',
      status: 'Enviada',
      sentAt: nowStamp(),
      remindersSent: 0,
      maxReminders: project.invitationConfig.maxReminders || 2,
      consentVerified: payload.consentVerified !== false,
      publicLinkUsed: project.invitationConfig.publicReviewUrl,
      privateSupportTriggered: false,
    };
    project.reviewInvitations.unshift(invitation);
    if (payload.viaWebhook) {
      project.invitationConfig.lastTriggeredAt = nowStamp();
    }
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: payload.viaWebhook ? 'Webhook CRM/TPV' : `Motor Invitaciones (${role})`,
      role,
      module: 'ReputaciónLocal · Invitaciones',
      action: `Invitación neutra enviada (${invitation.channel})`,
      detail: `${invitation.customerName} · Enlace público universal + canal privado paralelo (sin gating).`,
    });
    return invitation;
  }

  app.post('/api/reputation/invitations/send', (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, customerName, contact, serviceName, channel, consentVerified } = req.body as {
        projectId: string;
        customerName: string;
        contact: string;
        serviceName: string;
        channel: ReviewInvitationChannel;
        consentVerified: boolean;
      };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      if (!customerName?.trim() || !contact?.trim()) {
        return res.status(400).json({ error: 'Nombre y contacto (teléfono o email) son obligatorios.' });
      }
      if (!consentVerified) {
        return res.status(400).json({ error: 'Es obligatorio confirmar el consentimiento RGPD antes de enviar.' });
      }
      dispatchInvitation(
        project,
        { customerName, contact, serviceName, channel, consentVerified, viaWebhook: false },
        store.activeRole
      );
      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error enviando invitación.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/reputation/webhooks/review-trigger', (req, res) => {
    try {
      const store = ensureStore();
      const { projectId, customerName, contact, serviceName, channel } = req.body as {
        projectId?: string;
        customerName: string;
        contact: string;
        serviceName?: string;
        channel?: ReviewInvitationChannel;
      };
      const targetId = projectId || store.activeProjectId;
      const project = store.projects.find((p) => p.id === targetId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      if (!project.invitationConfig.enabled) {
        return res.status(400).json({ error: 'El webhook automático está desactivado en este proyecto.' });
      }
      if (!customerName?.trim() || !contact?.trim()) {
        return res.status(400).json({ error: 'Payload webhook incompleto: faltan customerName o contact.' });
      }
      const invitation = dispatchInvitation(
        project,
        {
          customerName,
          contact,
          serviceName: serviceName || project.profile.services[0] || 'Servicio completado',
          channel,
          consentVerified: true,
          viaWebhook: true,
        },
        store.activeRole
      );
      saveStore(store);
      res.json({ ok: true, invitationId: invitation.id, store });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error procesando webhook.';
      res.status(400).json({ error: message });
    }
  });

  app.patch('/api/reputation/invitations/:invitationId', (req, res) => {
    const store = ensureStore();
    const { projectId, action, privateFeedback } = req.body as {
      projectId: string;
      action: 'remind' | 'click_public' | 'published' | 'private_incident' | 'opt_out';
      privateFeedback?: string;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const inv = project.reviewInvitations.find((i) => i.id === req.params.invitationId);
    if (!inv) return res.status(404).json({ error: 'Invitación no encontrada.' });

    const statusMap: Record<typeof action, ReviewInvitationStatus> = {
      remind: 'Recordatorio Enviado',
      click_public: 'Clic Enlace Público',
      published: 'Reseña Publicada',
      private_incident: 'Incidencia Privada',
      opt_out: 'Baja RGPD',
    };

    if (action === 'remind') {
      if (inv.status === 'Baja RGPD') {
        return res.status(400).json({ error: 'Contacto dado de baja RGPD.' });
      }
      if (inv.remindersSent >= inv.maxReminders) {
        return res.status(400).json({
          error: `Límite alcanzado (${inv.maxReminders} recordatorios). No se envía para evitar spam.`,
        });
      }
      inv.remindersSent += 1;
    }

    inv.status = statusMap[action];
    if (action === 'private_incident') {
      inv.privateSupportTriggered = true;
      project.reviewIncidents.unshift({
        id: `inc-${Date.now()}`,
        source: 'Canal Privado Paralelo',
        customerName: inv.customerName,
        platform: 'Soporte Directo Confia360',
        category: 'Otro',
        severity: 'Alta',
        summary:
          privateFeedback?.trim() ||
          `Incidencia reportada desde canal paralelo tras servicio "${inv.serviceName}".`,
        status: 'Abierta',
        owner: 'Lucía Serrano',
        slaDueAt: 'Hoy (< 4 h)',
        suggestedAction:
          'Llamar al cliente antes de 4 horas para resolver el problema manteniendo el enlace público de reseña accesible sin presión.',
        resolutionNotes: '',
        createdAt: nowStamp(),
      });
    }

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Motor Invitaciones (${store.activeRole})`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Invitaciones',
      action: `Estado invitación: ${inv.status}`,
      detail: `${inv.customerName} (${inv.channel}) actualizado a ${inv.status}.`,
    });

    saveStore(store);
    res.json(store);
  });

  app.patch('/api/reputation/incidents/:incidentId', (req, res) => {
    const store = ensureStore();
    const { projectId, status, owner, resolutionNotes, suggestedAction } = req.body as {
      projectId: string;
      status?: ReviewIncidentCase['status'];
      owner?: string;
      resolutionNotes?: string;
      suggestedAction?: string;
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const inc = project.reviewIncidents.find((c) => c.id === req.params.incidentId);
    if (!inc) return res.status(404).json({ error: 'Incidencia no encontrada.' });

    if (status) inc.status = status;
    if (owner?.trim()) inc.owner = owner.trim();
    if (resolutionNotes !== undefined) inc.resolutionNotes = resolutionNotes;
    if (suggestedAction?.trim()) inc.suggestedAction = suggestedAction.trim();

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: inc.owner,
      role: store.activeRole,
      module: 'ReputaciónLocal · Incidencias',
      action: `Incidencia actualizada: ${inc.status}`,
      detail: `Caso de ${inc.customerName} (${inc.category}) en estado ${inc.status}.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.post('/api/reputation/incidents/analyze', async (req, res) => {
    try {
      const store = ensureStore();
      const { projectId } = req.body as { projectId: string };
      const project = store.projects.find((p) => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analiza las reseñas e incidencias de "${project.profile.companyName}" (${project.profile.sector}, ${project.profile.primaryCity}) para detectar patrones operativos recurrentes.
Reseñas: ${JSON.stringify(project.reviews.map((r) => ({ rating: r.rating, comment: r.comment })))}
Incidencias: ${JSON.stringify(project.reviewIncidents.map((i) => ({ category: i.category, summary: i.summary, status: i.status })))}
Devuelve JSON con hasta 3 patrones concretos: { topPatterns: [{ theme, count, recommendation }] }.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topPatterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theme: { type: Type.STRING },
                    count: { type: Type.INTEGER },
                    recommendation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(extractJsonBlock(response.text || '{}')) as {
        topPatterns?: { theme: string; count: number; recommendation: string }[];
      };
      project.incidentPatternSummary = {
        topPatterns: (parsed.topPatterns || []).slice(0, 3),
        analyzedAt: nowStamp(),
      };
      project.auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowStamp(),
        actor: 'Analizador de Patrones IA',
        role: store.activeRole,
        module: 'ReputaciónLocal · Incidencias',
        action: 'Patrones de queja detectados',
        detail: `Identificados ${project.incidentPatternSummary.topPatterns.length} focos de mejora operativa.`,
      });
      saveStore(store);
      res.json(store);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error analizando patrones de incidencias.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/reputation/directories/audit', (req, res) => {
    const store = ensureStore();
    const { projectId } = req.body as { projectId: string };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const stamp = nowStamp();
    project.directoryListings = project.directoryListings.map((d) => ({
      ...d,
      lastCheckedAt: stamp,
    }));
    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: stamp,
      actor: `Auditor NAP (${store.activeRole})`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Directorios',
      action: 'Auditoría NAP multi-directorio completada',
      detail: `Revisados ${project.directoryListings.length} directorios frente a ficha maestra de ${project.profile.companyName}.`,
    });
    saveStore(store);
    res.json(store);
  });

  app.patch('/api/reputation/directories/:directoryId', (req, res) => {
    const store = ensureStore();
    const { projectId, action } = req.body as {
      projectId: string;
      action: 'sync_nap' | 'resolve_duplicate' | 'claim';
    };
    const project = store.projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const dir = project.directoryListings.find((d) => d.id === req.params.directoryId);
    if (!dir) return res.status(404).json({ error: 'Directorio no encontrado.' });

    const masterGbp = project.directoryListings.find((d) => d.directoryName === 'Google Business Profile');
    dir.detectedName = project.profile.companyName;
    if (masterGbp) {
      dir.detectedAddress = masterGbp.detectedAddress;
      dir.detectedPhone = masterGbp.detectedPhone;
      dir.detectedHours = masterGbp.detectedHours;
    }
    dir.duplicateCount = 0;
    dir.discrepancies = [];
    dir.status = 'Sincronizado';
    dir.lastCheckedAt = nowStamp();

    project.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowStamp(),
      actor: `Sincronizador NAP (${store.activeRole})`,
      role: store.activeRole,
      module: 'ReputaciónLocal · Directorios',
      action:
        action === 'resolve_duplicate'
          ? 'Duplicado fusionado y eliminado'
          : action === 'claim'
            ? 'Ficha reclamada y sincronizada'
            : 'NAP alineado con ficha maestra',
      detail: `${dir.directoryName} sincronizado con ${project.profile.companyName}.`,
    });
    saveStore(store);
    res.json(store);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
    data: {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
const BaseElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};
export class ErrorOverlay extends BaseElement {}
`);
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`confia360 seo-geo running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
