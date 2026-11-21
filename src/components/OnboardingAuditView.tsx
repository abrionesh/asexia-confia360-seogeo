import React, { useEffect, useState } from 'react';
import {
  Check,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Unlock,
} from 'lucide-react';
import {
  AdminReleaseNotesPanel,
} from './AdminReleaseNotesPanel';
import {
  ReputationSourcesAdminPanel,
  type CreateReputationSourcePayload,
  type UpdateReputationSourcePayload,
} from './ReputationSourcesAdminPanel';
import type {
  AdminLockStatus,
  BrandProfile,
  ClientAccountStatus,
  ConfiaModuleId,
  EcosystemBridgeItem,
  ModuleReleaseNote,
  ProjectWorkspace,
  ReleaseNoteModuleTarget,
  ReputationSourcePlatform,
} from '../types';

interface OnboardingAnalysis {
  valueProposition: string;
  targetAudience: string;
  detectedServices: string[];
  suggestedQuestionsToVerify: string[];
  competitorGaps: string[];
  initialClusters: Array<{
    pillarTitle: string;
    intentScope: 'Google SEO' | 'GEO IA' | 'Mixto SEO + GEO';
    commercialGoal: 'Leads' | 'Autoridad' | 'Menciones IA' | 'Tráfico Local';
    difficulty: number;
    estimatedVolume: number;
    leadPotential: 'Alto' | 'Medio' | 'Exploratorio';
  }>;
  initialTechnicalHints: Array<{
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
}

interface ClientOnboardingIdentification {
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
}

interface Props {
  project: ProjectWorkspace;
  initialTab?: 'onboarding' | 'profile' | 'audit' | 'plans' | 'ecosystem';
  adminStatus: AdminLockStatus;
  releaseNotes: ModuleReleaseNote[];
  onAdminUnlock: (username: string, pin: string) => Promise<string>;
  onAdminLock: () => Promise<void>;
  onAdminChangePin: (currentPin: string, newPin: string) => Promise<void>;
  onSaveProfile: (updates: Partial<BrandProfile>) => Promise<void>;
  onCreateProject: (payload: {
    profile: BrandProfile;
    clusters?: OnboardingAnalysis['initialClusters'];
    technicalHints?: OnboardingAnalysis['initialTechnicalHints'];
    clientIdentification?: ClientOnboardingIdentification;
  }) => Promise<void>;
  onSyncEcosystem: (bridgeId: EcosystemBridgeItem['id'], toggleOnly?: boolean) => Promise<void>;
  onToggleModules: (enabledModules: ConfiaModuleId[]) => Promise<void>;
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
  onCreateReleaseNote: (payload: {
    version: string;
    title: string;
    summary: string;
    details: string;
    modules: ReleaseNoteModuleTarget[];
    category: ModuleReleaseNote['category'];
  }) => Promise<void>;
  onUpdateReleaseNote: (
    noteId: string,
    updates: Partial<ModuleReleaseNote>
  ) => Promise<void>;
  onDeleteReleaseNote: (noteId: string) => Promise<void>;
  onNavigateToClientMaster?: () => void;
}

export const OnboardingAuditView: React.FC<Props> = ({
  project,
  initialTab = 'profile',
  adminStatus,
  releaseNotes,
  onAdminUnlock,
  onAdminLock,
  onAdminChangePin,
  onSaveProfile,
  onCreateProject,
  onSyncEcosystem,
  onToggleModules,
  onUpdateReputationSources,
  onCreateReputationSource,
  onUpdateReputationSourceItem,
  onDeleteReputationSourceItem,
  onCreateReleaseNote,
  onUpdateReleaseNote,
  onDeleteReleaseNote,
  onNavigateToClientMaster,
}) => {
  const [subTab, setSubTab] = useState<
    'onboarding' | 'profile' | 'audit' | 'plans' | 'ecosystem'
  >(initialTab);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Acceso administrativo protegido por PIN
  const [pinUsername, setPinUsername] = useState(adminStatus.username || 'Asexia');
  const [pinInput, setPinInput] = useState('');
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  // Estado formulario Onboarding Inteligente
  const [domain, setDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [city, setCity] = useState('');
  const [competitorsInput, setCompetitorsInput] = useState('');
  const [servicesInput, setServicesInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<OnboardingAnalysis | null>(null);
  const [analysisSources, setAnalysisSources] = useState<{ title: string; uri: string }[]>([]);

  // Campos verificables que la IA nunca debe inventar
  const [yearsExp, setYearsExp] = useState('8');
  const [certifications, setCertifications] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [guarantees, setGuarantees] = useState('');
  const [commercialPolicy, setCommercialPolicy] = useState(
    'Cumplimiento estricto RGPD. Propiedad íntegra del cliente sobre contenidos y dominio.'
  );
  // Campos de identificación y facturación para dar de alta al cliente en Ficha Única Confia360
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactRole, setPrimaryContactRole] = useState('Dirección / Gerencia');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [fiscalAddress, setFiscalAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [onboardingPlan, setOnboardingPlan] = useState<'Starter' | 'Growth' | 'Agency' | 'Enterprise'>('Growth');
  const [billingCycle, setBillingCycle] = useState<'Mensual' | 'Trimestral' | 'Anual'>('Mensual');
  const [monthlyFeeEur, setMonthlyFeeEur] = useState('129');
  const [nextPaymentDueDate, setNextPaymentDueDate] = useState('2026-12-05');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Edición de BrandProfile activo
  const [editProfile, setEditProfile] = useState<BrandProfile>(project.profile);
  useEffect(() => {
    setEditProfile(project.profile);
  }, [project.id, project.profile]);

  const handleAnalyzeDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/onboarding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          companyName: companyName.trim(),
          sector: sector.trim(),
          city: city.trim(),
          language: 'es-ES',
          competitors: competitorsInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          knownServices: servicesInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error analizando la web.');
      setAnalysis(data.analysis);
      setAnalysisSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en análisis de onboarding.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFinalizeProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const profile: BrandProfile = {
        companyName: companyName.trim(),
        domain: domain.trim().startsWith('http') ? domain.trim() : `https://${domain.trim()}`,
        sector: sector.trim(),
        country: 'España',
        primaryCity: city.trim(),
        language: 'es-ES',
        valueProposition:
          analysis?.valueProposition ||
          `Servicios especializados de ${sector.trim()} en ${city.trim()}.`,
        targetAudience: analysis?.targetAudience || `Clientes y pymes en ${city.trim()}.`,
        services:
          analysis?.detectedServices?.length
            ? analysis.detectedServices
            : servicesInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        competitors: competitorsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        yearsExperience: Number(yearsExp) || 5,
        certifications: certifications
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        priceRange: priceRange.trim() || 'Bajo presupuesto cerrado tras diagnóstico',
        guarantees: guarantees.trim() || 'Revisión transparente sin permanencia oculta',
        commercialPolicy: commercialPolicy.trim(),
        forbiddenClaims: ['Posicionamiento #1 garantizado en Google', 'Resultados inmediatos garantizados'],
        brandTone: 'Profesional, claro y orientado a resultados medibles.',
        gdprCompliant: true,
        lastAuditedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };
      await onCreateProject({
        profile,
        clusters: analysis?.initialClusters,
        technicalHints: analysis?.initialTechnicalHints,
        clientIdentification: {
          legalName: legalName.trim() || `${companyName.trim()} S.L.`,
          taxId: taxId.trim().toUpperCase(),
          primaryContactName: primaryContactName.trim(),
          primaryContactRole: primaryContactRole.trim(),
          email: clientEmail.trim(),
          phone: clientPhone.trim(),
          fiscalAddress: fiscalAddress.trim(),
          postalCode: postalCode.trim(),
          accountStatus: 'En Onboarding',
          plan: onboardingPlan,
          billingCycle,
          monthlyFeeEur: Number(monthlyFeeEur) || 129,
          nextPaymentDueDate,
        },
      });
      setSubTab('profile');
      setSavedNotice('Nuevo cliente y proyecto creados con su Ficha Única Confia360 activa.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el proyecto.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCurrentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);
    try {
      await onSaveProfile(editProfile);
      setSavedNotice('Perfil de negocio y reglas RGPD actualizados correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando el perfil.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Datos verificables del negocio · Trazabilidad de IA · Cumplimiento RGPD y Propiedad Intelectual
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Onboarding Inteligente, Perfil y Auditoría
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {[
            { id: 'ecosystem', label: 'Módulos y Escucha Social' },
            { id: 'onboarding', label: 'Nuevo proyecto (IA)' },
            { id: 'profile', label: 'Perfil de negocio' },
            { id: 'audit', label: `Auditoría (${project.auditLogs.length})` },
            { id: 'plans', label: 'Planes y roles' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as typeof subTab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                subTab === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}
      {savedNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          {savedNotice}
        </div>
      )}

      {subTab === 'onboarding' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAnalyzeDomain}
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-6"
          >
            <h2 className="text-base font-semibold text-slate-900">
              1. Diagnóstico Web Inicial con IA
            </h2>
            <p className="text-xs text-slate-500">
              La plataforma rastrea el contexto público de tu dominio para detectar servicios, propuesta de valor y huecos frente a competidores.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nombre de la empresa
                </label>
                <input
                  required
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej. Asesoría Confía Bilbao"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sitio web / Dominio
                </label>
                <input
                  required
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="https://tudominio.es"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sector principal
                </label>
                <input
                  required
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ej. Asesoría fiscal y laboral"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ciudad / Área principal
                </label>
                <input
                  required
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej. Bilbao"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Servicios clave (separados por comas)
              </label>
              <input
                type="text"
                value={servicesInput}
                onChange={(e) => setServicesInput(e.target.value)}
                placeholder="Alta de autónomos, Contabilidad pyme, Gestión laboral"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Competidores locales (separados por comas)
              </label>
              <input
                type="text"
                value={competitorsInput}
                onChange={(e) => setCompetitorsInput(e.target.value)}
                placeholder="Competidor A, Competidor B"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Analizando dominio y competencia...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Analizar web y proponer mapa</span>
                </>
              )}
            </button>

            {analysis && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
                <p className="font-semibold text-slate-900">Resultado del diagnóstico inicial:</p>
                <p className="text-slate-700">{analysis.valueProposition}</p>
                <div>
                  <span className="font-semibold text-slate-800">Huecos competitivos: </span>
                  <span className="text-slate-600">{analysis.competitorGaps.join(' · ')}</span>
                </div>
                {analysisSources.length > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Fuentes consultadas: {analysisSources.map((s) => s.title).join(', ')}
                  </p>
                )}
              </div>
            )}
          </form>

          {/* Paso 2: Datos que la IA no puede inventar */}
          <form
            onSubmit={handleFinalizeProject}
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 lg:col-span-6"
          >
            <h2 className="text-base font-semibold text-slate-900">
              2. Datos Verificables (Control Antialucinación)
            </h2>
            <p className="text-xs text-slate-500">
              Completa la información que la IA nunca debe inventar para proteger la veracidad legal y comercial de tus borradores.
            </p>

            {analysis?.suggestedQuestionsToVerify?.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 space-y-1">
                <p className="font-semibold">Puntos detectados para confirmar manualmente:</p>
                {analysis.suggestedQuestionsToVerify.map((q, i) => (
                  <p key={i}>• {q}</p>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Años de experiencia real
                </label>
                <input
                  type="number"
                  value={yearsExp}
                  onChange={(e) => setYearsExp(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Rango de precios declarado
                </label>
                <input
                  type="text"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="Ej. Desde 180 €/mes"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Certificaciones o colegiaciones verificadas (separadas por comas)
              </label>
              <input
                type="text"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Ej. ISO 9001, Agente Digitalizador Red.es"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Garantías y política comercial
              </label>
              <textarea
                rows={2}
                value={guarantees}
                onChange={(e) => setGuarantees(e.target.value)}
                placeholder="Ej. Presupuesto cerrado sin permanencia, primera auditoría en 48 h"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Política RGPD y titularidad del contenido
              </label>
              <input
                type="text"
                value={commercialPolicy}
                onChange={(e) => setCommercialPolicy(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  3. Identificación y Alta en Ficha Única de Cliente Confia360
                </h3>
                <p className="text-[11px] text-slate-600">
                  Estos datos alimentan la Ficha Única con prioridad global en todos los módulos y la sincronización API con Confia360.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Razón social
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Ej. Asesoría Confía Bilbao S.L."
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    CIF / NIF
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="B95123456"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Contacto responsable
                  </label>
                  <input
                    type="text"
                    value={primaryContactName}
                    onChange={(e) => setPrimaryContactName(e.target.value)}
                    placeholder="Nombre y apellidos"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Email corporativo / facturación
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="direccion@empresa.es"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Teléfono directo
                  </label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+34 944 000 000"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Dirección fiscal y CP
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={fiscalAddress}
                      onChange={(e) => setFiscalAddress(e.target.value)}
                      placeholder="Calle y número"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    />
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="CP"
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Plan contratado y ciclo
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={onboardingPlan}
                      onChange={(e) => {
                        const p = e.target.value as typeof onboardingPlan;
                        setOnboardingPlan(p);
                        if (p === 'Starter') setMonthlyFeeEur('49');
                        else if (p === 'Growth') setMonthlyFeeEur('129');
                        else if (p === 'Agency') setMonthlyFeeEur('299');
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                    >
                      <option value="Starter">Starter</option>
                      <option value="Growth">Growth</option>
                      <option value="Agency">Agency</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as typeof billingCycle)}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                    >
                      <option value="Mensual">Mensual</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Cuota €/mes y próximo cobro
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={monthlyFeeEur}
                      onChange={(e) => setMonthlyFeeEur(e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-900"
                    />
                    <input
                      type="date"
                      value={nextPaymentDueDate}
                      onChange={(e) => setNextPaymentDueDate(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !companyName.trim() || !domain.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? 'Creando espacio y ficha única...' : 'Dar de alta cliente y activar seguimiento'}
            </button>
          </form>
        </div>
      )}

      {subTab === 'profile' && (
        <form
          onSubmit={handleSaveCurrentProfile}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Perfil de Negocio Verificado ({project.profile.companyName})
              </h2>
              <p className="text-xs text-slate-500">
                Sincronizado con prioridad desde la Ficha Única de Cliente Confia360; alimenta redacción, esquemas JSON-LD y GBP.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {onNavigateToClientMaster && (
                <button
                  type="button"
                  onClick={onNavigateToClientMaster}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  Editar en Ficha Única Confia360 →
                </button>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                <Shield className="h-4 w-4" /> RGPD Activo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Propuesta de valor</label>
              <textarea
                rows={3}
                value={editProfile.valueProposition}
                onChange={(e) =>
                  setEditProfile({ ...editProfile, valueProposition: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 p-3 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Garantías declaradas</label>
              <textarea
                rows={3}
                value={editProfile.guarantees}
                onChange={(e) => setEditProfile({ ...editProfile, guarantees: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-3 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Rango de precios</label>
              <input
                type="text"
                value={editProfile.priceRange}
                onChange={(e) => setEditProfile({ ...editProfile, priceRange: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tono de marca</label>
              <input
                type="text"
                value={editProfile.brandTone}
                onChange={(e) => setEditProfile({ ...editProfile, brandTone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5">
            <p className="font-semibold text-slate-800">
              Afirmaciones prohibidas (bloqueadas automáticamente en redacción IA):
            </p>
            <p className="text-slate-600">{editProfile.forbiddenClaims.join(' · ')}</p>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
          >
            Guardar cambios verificados
          </button>
        </form>
      )}

      {subTab === 'audit' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Registro de Auditoría Inmutable y Trazabilidad GDPR
            </h2>
            <p className="text-xs text-slate-500">
              Cada borrador de IA, revisión humana, publicación y verificación GEO queda registrado con fecha y responsable.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Fecha y hora</th>
                  <th className="px-4 py-3 font-medium">Responsable / Rol</th>
                  <th className="px-4 py-3 font-medium">Módulo</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-6 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                      {log.actor} · {log.role}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{log.module}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'plans' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              name: 'Starter',
              audience: 'Para autónomos y microempresas',
              price: '49 €/mes',
              limits: '1 web · 4 artículos/mes con aprobación · Auditoría técnica · Search Console',
            },
            {
              name: 'Growth',
              audience: 'Para pymes en expansión local',
              price: '129 €/mes',
              limits: '3 sedes Geo-Grid · 12 artículos/mes · Monitor GEO IA · GBP y enlaces guiados',
            },
            {
              name: 'Agency',
              audience: 'Para consultores y red confia360',
              price: '299 €/mes',
              limits: 'Multi-cliente ilimitado · Roles editoriales · Marca blanca · Informes ROI',
            },
            {
              name: 'Enterprise',
              audience: 'Para grandes cuentas y franquicias',
              price: 'A medida',
              limits: 'SSO corporativo · SLA dedicado · API completa · Auditoría legal avanzada',
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border bg-white p-5 flex flex-col justify-between ${
                project.plan === p.name ? 'border-blue-600' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  {project.plan === p.name && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                      <Check className="h-3.5 w-3.5" /> Activo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{p.audience}</p>
                <p className="mt-4 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {p.price}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{p.limits}</p>
              </div>
              <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                Propiedad 100% del contenido y cumplimiento RGPD incluidos
              </p>
            </div>
          ))}
        </div>
      )}

      {subTab === 'ecosystem' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-medium text-blue-700">
                  Arquitectura Modular Comercial · AxesIA · Suite Confia360
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Módulos Contratables e Interconexión Automática
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Comercializa cada módulo por separado según la necesidad de la pyme o actívalos juntos para compartir alertas, campañas y calendario en tiempo real.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Layers className="h-4 w-4 text-blue-700" />
                <span className="font-mono tabular-nums">
                  {(project.enabledModules || ['reputacion_local', 'seo_geo', 'campanas']).length}/3 módulos activos
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
                {error}
              </div>
            )}
            {savedNotice && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
                {savedNotice}
              </div>
            )}

            {/* Puerta de seguridad por PIN de Administrador */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              {!adminStatus.unlocked ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    setSavedNotice(null);
                    setSyncingId('admin-unlock');
                    try {
                      await onAdminUnlock(pinUsername, pinInput);
                      setPinInput('');
                      setSavedNotice(
                        `Acceso de administración desbloqueado para ${pinUsername}.`
                      );
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : 'No se pudo validar el PIN.'
                      );
                    } finally {
                      setSyncingId(null);
                    }
                  }}
                  className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <Lock className="h-4 w-4 text-blue-700" />
                      <span>Configuración protegida por clave PIN de acceso</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Introduce las credenciales de administrador para activar módulos de Confia360 y seleccionar las fuentes de reseñas y críticas.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Usuario
                      </label>
                      <input
                        type="text"
                        required
                        value={pinUsername}
                        onChange={(e) => setPinUsername(e.target.value)}
                        placeholder="Asexia"
                        className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Clave PIN
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="current-password"
                        required
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={syncingId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      {syncingId === 'admin-unlock' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                      <span>Desbloquear acceso</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5 text-xs">
                      <p className="flex items-center gap-2 font-semibold text-emerald-800">
                        <Unlock className="h-4 w-4 text-emerald-700" />
                        <span>
                          Sesión de administración activa · Usuario: {adminStatus.username}
                        </span>
                      </p>
                      <p className="text-slate-600">
                        Credencial verificada en servidor mediante hash seguro
                        {adminStatus.updatedAt ? ` · Actualizada: ${adminStatus.updatedAt}` : ''}
                        {adminStatus.isDefaultPin
                          ? ' · Recomendado personalizar el PIN inicial'
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!adminStatus.envManaged && (
                        <button
                          type="button"
                          onClick={() => setShowChangePin((v) => !v)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-blue-700" />
                          <span>{showChangePin ? 'Cerrar cambio de PIN' : 'Cambiar PIN'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={syncingId !== null}
                        onClick={async () => {
                          setError(null);
                          setSavedNotice(null);
                          setSyncingId('admin-lock');
                          try {
                            await onAdminLock();
                            setShowChangePin(false);
                            setSavedNotice('Panel de administración bloqueado.');
                          } finally {
                            setSyncingId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Bloquear panel</span>
                      </button>
                    </div>
                  </div>

                  {showChangePin && !adminStatus.envManaged && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setError(null);
                        setSavedNotice(null);
                        if (!/^\d{4,12}$/.test(newPinInput.trim())) {
                          setError('El nuevo PIN debe tener entre 4 y 12 dígitos numéricos.');
                          return;
                        }
                        if (newPinInput.trim() !== confirmPinInput.trim()) {
                          setError('La confirmación del nuevo PIN no coincide.');
                          return;
                        }
                        setSyncingId('change-pin');
                        try {
                          await onAdminChangePin(currentPinInput.trim(), newPinInput.trim());
                          setCurrentPinInput('');
                          setNewPinInput('');
                          setConfirmPinInput('');
                          setShowChangePin(false);
                          setSavedNotice(
                            'PIN de acceso actualizado y guardado de forma segura en el servidor.'
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'No se pudo cambiar el PIN.'
                          );
                        } finally {
                          setSyncingId(null);
                        }
                      }}
                      className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-4 sm:items-end"
                    >
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          PIN actual
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          required
                          value={currentPinInput}
                          onChange={(e) => setCurrentPinInput(e.target.value)}
                          placeholder="••••"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Nuevo PIN (4–12 dígitos)
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          required
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value)}
                          placeholder="Nuevo PIN"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">
                          Confirmar nuevo PIN
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          required
                          value={confirmPinInput}
                          onChange={(e) => setConfirmPinInput(e.target.value)}
                          placeholder="Repetir PIN"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={syncingId !== null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                      >
                        {syncingId === 'change-pin' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                        <span>Guardar nuevo PIN</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {(
                [
                  {
                    id: 'reputacion_local' as ConfiaModuleId,
                    name: 'Confia360 ReputaciónLocal',
                    sku: 'Módulo 01 · Visibilidad & Reseñas',
                    pitch:
                      'Ficha Google Business Profile, checklist de completitud, motor ético de invitaciones multicanal sin review gating, incidencias SLA y auditoría NAP en directorios.',
                    synergy:
                      'Si se combina con Campañas y SEO-GEO, convierte reseñas 5★ en creatividades sociales y actualiza landings locales.',
                  },
                  {
                    id: 'seo_geo' as ConfiaModuleId,
                    name: 'Confia360 SEO-GEO',
                    sku: 'Módulo 02 · Maps & Respuestas IA',
                    pitch:
                      'Malla Geo-Grid por código postal, monitor de citas en ChatGPT/Gemini/Perplexity, previsiones SEO proactivas, auditoría técnica y backlinks éticos.',
                    synergy:
                      'Conecta caídas previstas en IAs directamente con el Calendario Estratégico y refuerza páginas en zonas débiles del Geo-Grid.',
                  },
                  {
                    id: 'campanas' as ConfiaModuleId,
                    name: 'Confia360 Campañas y Estacionalidad',
                    sku: 'Módulo 03 · Demanda & Media',
                    pitch:
                      'Calendario comercial español, avisos proactivos por clima y stock en vivo, y generador multiformato para Meta Ads, TikTok y YouTube Shorts.',
                    synergy:
                      'Sincroniza eventos estacionales con publicaciones locales en GBP y promociones cuando hay excedente de catálogo.',
                  },
                ] as const
              ).map((mod) => {
                const currentModules = project.enabledModules || [
                  'reputacion_local',
                  'seo_geo',
                  'campanas',
                ];
                const isActive = currentModules.includes(mod.id);
                const isLastActive = isActive && currentModules.length <= 1;
                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-colors ${
                      isActive ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[11px] font-medium text-slate-500">
                          {mod.sku}
                        </span>
                        <span
                          className={`font-semibold ${
                            isActive ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {isActive ? 'Activo' : 'Desactivado'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{mod.name}</h3>
                      <p className="text-xs leading-relaxed text-slate-600">{mod.pitch}</p>
                      <p className="border-t border-slate-200/70 pt-2 text-[11px] leading-relaxed text-slate-500">
                        Sinergia automática: {mod.synergy}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!adminStatus.unlocked || syncingId !== null || isLastActive}
                      onClick={async () => {
                        setError(null);
                        setSavedNotice(null);
                        setSyncingId(`mod-${mod.id}`);
                        try {
                          const next = isActive
                            ? currentModules.filter((m) => m !== mod.id)
                            : [...currentModules, mod.id];
                          await onToggleModules(next);
                          setSavedNotice(
                            `${mod.name} ${isActive ? 'desactivado' : 'activado'} en la barra lateral.`
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Error actualizando módulos.'
                          );
                        } finally {
                          setSyncingId(null);
                        }
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                        isActive
                          ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          : 'bg-blue-700 text-white hover:bg-blue-800'
                      }`}
                    >
                      {syncingId === `mod-${mod.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : !adminStatus.unlocked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {!adminStatus.unlocked
                          ? 'Requiere PIN para modificar'
                          : isLastActive
                            ? 'Módulo base mínimo'
                            : isActive
                              ? 'Desactivar módulo'
                              : 'Activar módulo'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
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
                showTopPinGate={false}
                socialAddonFirst
              />
            </div>

            <div className="mt-5">
              <AdminReleaseNotesPanel
                releaseNotes={releaseNotes}
                adminStatus={adminStatus}
                onCreateNote={onCreateReleaseNote}
                onUpdateNote={onUpdateReleaseNote}
                onDeleteNote={onDeleteReleaseNote}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-slate-500">Módulos añadidos en Confia360</span>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Ficha Única · Escucha Social · Tutor Voz · Novedades
                </p>
                <p className="mt-1 text-slate-600">
                  Todos los nuevos módulos están incluidos en el manifiesto compartido con la app Confia360.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-slate-500">Manifiesto de Integración Confia360</span>
                <p className="mt-1 font-mono text-xs font-semibold text-slate-900">
                  GET /api/v1/confia360/modules-manifest
                </p>
                <p className="mt-1 text-slate-600">
                  Expone catálogo modular, Ficha Maestra y estado de Escucha Social hacia la aplicación principal Confia360.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="text-slate-500">Sincronización Ficha Única</span>
                <p className="mt-1 font-mono text-xs font-semibold text-blue-800">
                  GET/POST /api/v1/confia360/clients
                </p>
                <p className="mt-1 text-slate-600">
                  Prioridad única bidireccional de datos identificativos, suscripciones y pagos pendientes.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(project.ecosystemLinks || []).map((bridge) => (
              <div
                key={bridge.id}
                className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{bridge.ecosystemSuite}</span>
                    <span
                      className={
                        bridge.status === 'Conectado'
                          ? 'font-medium text-emerald-700'
                          : 'font-medium text-amber-700'
                      }
                    >
                      {bridge.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{bridge.moduleName}</h3>
                  <p className="text-xs leading-relaxed text-slate-600">{bridge.description}</p>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Registros sincronizados</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {bridge.syncedRecords}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Última sincronización</span>
                    <span className="font-mono tabular-nums">{bridge.lastSyncAt}</span>
                  </div>
                  <p className="truncate font-mono text-[11px] text-slate-400">
                    {bridge.endpointPath}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={syncingId !== null}
                      onClick={async () => {
                        setError(null);
                        setSavedNotice(null);
                        setSyncingId(bridge.id);
                        try {
                          await onSyncEcosystem(bridge.id, false);
                          setSavedNotice(`Sincronizado con ${bridge.ecosystemSuite}.`);
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Error sincronizando módulo.'
                          );
                        } finally {
                          setSyncingId(null);
                        }
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                    >
                      {syncingId === bridge.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span>Sincronizar ahora</span>
                    </button>
                    <button
                      type="button"
                      disabled={syncingId !== null}
                      onClick={() => onSyncEcosystem(bridge.id, true)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      {bridge.status === 'Conectado' ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
