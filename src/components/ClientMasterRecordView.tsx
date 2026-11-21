import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import type {
  AdminLockStatus,
  BrandProfile,
  ClientAccountStatus,
  ClientMasterRecord,
  ClientPaymentRecord,
  ClientSubscriptionItem,
  ConfiaModuleId,
  InvitationWebhookConfig,
  ProjectWorkspace,
  ReviewAutomationPolicy,
  ReviewInvitationChannel,
} from '../types';

interface Props {
  project: ProjectWorkspace;
  adminStatus: AdminLockStatus;
  onSaveClientMaster: (payload: {
    clientMaster?: Partial<ClientMasterRecord>;
    profileUpdates?: Partial<BrandProfile>;
    reviewPolicyUpdates?: Partial<ReviewAutomationPolicy>;
    invitationConfigUpdates?: Partial<InvitationWebhookConfig>;
  }) => Promise<void>;
  onAddSubscription: (payload: Partial<ClientSubscriptionItem>) => Promise<void>;
  onUpdateSubscription: (
    subId: string,
    updates: Partial<ClientSubscriptionItem>
  ) => Promise<void>;
  onAddPayment: (payload: Partial<ClientPaymentRecord>) => Promise<void>;
  onUpdatePayment: (
    paymentId: string,
    updates: Partial<ClientPaymentRecord>
  ) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onSyncConfia360: (direction?: 'push' | 'pull' | 'bidirectional') => Promise<void>;
  onNavigateToAdmin: () => void;
}

const MODULE_LABELS: Record<ConfiaModuleId, string> = {
  reputacion_local: 'ReputaciónLocal & GBP',
  seo_geo: 'SEO-GEO & Geo-Grid',
  campanas: 'Campañas y Estacionalidad',
};

const STATUS_TEXT_COLOR: Record<ClientAccountStatus, string> = {
  Activo: 'text-emerald-700',
  'En Onboarding': 'text-blue-700',
  Pausado: 'text-amber-700',
  'Riesgo de Impago': 'text-rose-700',
};

export const ClientMasterRecordView: React.FC<Props> = ({
  project,
  adminStatus,
  onSaveClientMaster,
  onAddSubscription,
  onUpdateSubscription,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onSyncConfia360,
  onNavigateToAdmin,
}) => {
  const cm = project.clientMaster;
  const [subTab, setSubTab] = useState<'overview' | 'billing' | 'config'>('overview');

  const [formCm, setFormCm] = useState<ClientMasterRecord | undefined>(cm);
  const [locationsText, setLocationsText] = useState((cm?.locations || []).join(', '));
  const [profileForm, setProfileForm] = useState<BrandProfile>(project.profile);
  const [forbiddenClaimsText, setForbiddenClaimsText] = useState(
    project.profile.forbiddenClaims.join(' | ')
  );
  const [policyForm, setPolicyForm] = useState<ReviewAutomationPolicy>(project.reviewPolicy);
  const [invConfigForm, setInvConfigForm] = useState<InvitationWebhookConfig>(
    project.invitationConfig
  );

  // Estado alta rápida suscripción
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSubPlan, setNewSubPlan] = useState('');
  const [newSubCycle, setNewSubCycle] =
    useState<ClientSubscriptionItem['billingCycle']>('Mensual');
  const [newSubAmount, setNewSubAmount] = useState('99');
  const [newSubNextDate, setNewSubNextDate] = useState('2026-12-01');

  // Estado alta rápida pago / vencimiento
  const [showAddPay, setShowAddPay] = useState(false);
  const [payFilter, setPayFilter] = useState<'Todos' | 'Pendiente' | 'Vencido' | 'Pagado'>('Todos');
  const [newPayConcept, setNewPayConcept] = useState('');
  const [newPayInvoice, setNewPayInvoice] = useState('');
  const [newPayAmount, setNewPayAmount] = useState('168');
  const [newPayDueDate, setNewPayDueDate] = useState('2026-12-10');
  const [newPayMethod, setNewPayMethod] =
    useState<ClientPaymentRecord['paymentMethod']>('Domiciliación SEPA');
  const [newPayStatus, setNewPayStatus] =
    useState<ClientPaymentRecord['status']>('Pendiente');

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setFormCm(project.clientMaster);
    setLocationsText((project.clientMaster?.locations || []).join(', '));
    setProfileForm(project.profile);
    setForbiddenClaimsText(project.profile.forbiddenClaims.join(' | '));
    setPolicyForm(project.reviewPolicy);
    setInvConfigForm(project.invitationConfig);
  }, [project]);

  if (!formCm) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-600">
        Inicializando Ficha Única de Cliente Confia360...
      </div>
    );
  }

  const subscriptions = formCm.subscriptions || [];
  const payments = formCm.payments || [];

  const activeMrrEur = subscriptions
    .filter((s) => s.status === 'Activa')
    .reduce((acc, s) => {
      if (s.billingCycle === 'Anual') return acc + s.amountEur / 12;
      if (s.billingCycle === 'Trimestral') return acc + s.amountEur / 3;
      return acc + s.amountEur;
    }, 0);

  const paidTotalEur = payments
    .filter((p) => p.status === 'Pagado')
    .reduce((acc, p) => acc + p.amountEur, 0);
  const pendingPayments = payments.filter((p) => p.status === 'Pendiente');
  const overduePayments = payments.filter((p) => p.status === 'Vencido');
  const pendingTotalEur = [...pendingPayments, ...overduePayments].reduce(
    (acc, p) => acc + p.amountEur,
    0
  );
  const totalBilledEur = Math.max(1, paidTotalEur + pendingTotalEur);
  const paidSharePct = Math.round((paidTotalEur / totalBilledEur) * 100);
  const nextPendingDue = [...overduePayments, ...pendingPayments].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  )[0];

  const enabledModules = project.enabledModules || ['reputacion_local', 'seo_geo', 'campanas'];
  const activeSources = project.enabledReputationSources || [];
  const filteredPayments = payments.filter((p) =>
    payFilter === 'Todos' ? true : p.status === payFilter
  );

  const handleSaveMaster = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setNotice(null);
    setBusyKey('save-master');
    try {
      const cleanLocations = locationsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const cleanForbidden = forbiddenClaimsText
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      await onSaveClientMaster({
        clientMaster: {
          ...formCm,
          locations: cleanLocations.length ? cleanLocations : [`${formCm.city} · Sede Principal`],
        },
        profileUpdates: {
          ...profileForm,
          companyName: formCm.commercialName,
          domain: formCm.website,
          sector: formCm.sector,
          primaryCity: formCm.city,
          country: formCm.country,
          language: formCm.preferredLanguage,
          forbiddenClaims: cleanForbidden.length
            ? cleanForbidden
            : project.profile.forbiddenClaims,
        },
        reviewPolicyUpdates: {
          mode: policyForm.mode,
          minAutoStars: policyForm.minAutoStars,
        },
        invitationConfigUpdates: {
          enabled: invConfigForm.enabled,
          defaultChannel: invConfigForm.defaultChannel,
          publicReviewUrl: invConfigForm.publicReviewUrl,
          maxReminders: invConfigForm.maxReminders,
        },
      });
      setNotice(
        'Ficha Única guardada y propagada con prioridad máxima hacia Resumen, ReputaciónLocal, SEO-GEO, Campañas y conectores Confia360.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando la ficha del cliente.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-blue-700">
            Fuente Única de Verdad Confia360 · Código {formCm.confiaCode} · NIF/CIF{' '}
            <span className="font-mono">{formCm.taxId}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Ficha Única de Cliente y Cuadro de Control
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Visualiza y edita identificación, módulos activos, fechas, suscripciones, pagos pendientes y configuración global propagada al ecosistema Confia360.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={async () => {
              setError(null);
              setNotice(null);
              setBusyKey('sync-confia');
              try {
                await onSyncConfia360('bidirectional');
                setNotice(
                  `Sincronización API Confia360 completada para ${formCm.commercialName} (${formCm.confiaCode}).`
                );
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Error sincronizando con Confia360.'
                );
              } finally {
                setBusyKey(null);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {busyKey === 'sync-confia' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-700" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-blue-700" />
            )}
            <span>Sincronizar API Confia360</span>
          </button>
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() => handleSaveMaster()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {busyKey === 'save-master' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Guardar y propagar ficha</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
          {notice}
        </div>
      )}

      {/* CUADRO DE CONTROL VISUAL DENTRO DE LA FICHA */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Cuadro de Control Visual del Cliente ({formCm.commercialName})
            </h2>
            <p className="text-xs text-slate-500">
              Situación contractual, salud financiera de cobros pendientes, vigencia de suscripciones y cobertura en módulos Confia360.
            </p>
          </div>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
            Última actualización: {formCm.updatedAt}
          </span>
        </div>

        {/* 4 métricas visuales clave */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Situación Contractual</span>
              <ShieldCheck className="h-4 w-4 text-slate-400" />
            </div>
            <p className={`text-lg font-bold ${STATUS_TEXT_COLOR[formCm.accountStatus]}`}>
              {formCm.accountStatus}
            </p>
            <p className="font-mono text-[11px] text-slate-600 tabular-nums">
              Alta: {formCm.onboardingDate} · Renovación: {formCm.renewalDate}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Módulos y Fuentes Activas</span>
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
            <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
              {enabledModules.length}/3 módulos · {activeSources.length} fuentes
            </p>
            <p className="text-[11px] text-slate-600">
              {project.socialListeningAddonEnabled
                ? 'Add-on Escucha Social activo (Meta/TikTok/YT)'
                : 'Solo Maps, Trustpilot y Portales'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Suscripciones en Curso (MRR)</span>
              <CreditCard className="h-4 w-4 text-slate-400" />
            </div>
            <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
              {activeMrrEur.toFixed(2)} € / mes
            </p>
            <p className="text-[11px] text-slate-600 tabular-nums">
              {subscriptions.filter((s) => s.status === 'Activa').length} suscripciones activas · Plan{' '}
              {project.plan}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Pagos Pendientes / Vencidos</span>
              <CalendarClock
                className={`h-4 w-4 ${
                  overduePayments.length > 0
                    ? 'text-rose-600'
                    : pendingPayments.length > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              />
            </div>
            <p
              className={`font-mono text-lg font-bold tabular-nums ${
                overduePayments.length > 0
                  ? 'text-rose-700'
                  : pendingTotalEur > 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              {pendingTotalEur.toFixed(2)} €
            </p>
            <p className="font-mono text-[11px] text-slate-600 tabular-nums">
              {nextPendingDue
                ? `Próx. vto: ${nextPendingDue.dueDate} (${nextPendingDue.status})`
                : 'Al corriente de pagos'}
            </p>
          </div>
        </div>

        {/* Barra visual de salud de cobros + matriz de módulos Confia360 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-lg border border-slate-200 p-4 lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">
                Control Visual de Cobros y Vencimientos
              </span>
              <span className="font-mono font-semibold text-slate-700 tabular-nums">
                {paidSharePct}% cobrado ({paidTotalEur.toFixed(0)} € /{' '}
                {(paidTotalEur + pendingTotalEur).toFixed(0)} €)
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded bg-slate-100">
              <div
                className="bg-emerald-600 transition-all"
                style={{ width: `${paidSharePct}%` }}
                title={`Cobrado: ${paidTotalEur.toFixed(2)} €`}
              />
              {overduePayments.length > 0 && (
                <div
                  className="bg-rose-600 transition-all"
                  style={{
                    width: `${Math.round(
                      (overduePayments.reduce((a, b) => a + b.amountEur, 0) / totalBilledEur) * 100
                    )}%`,
                  }}
                  title="Pagos vencidos"
                />
              )}
              {pendingPayments.length > 0 && (
                <div
                  className="bg-amber-500 transition-all"
                  style={{
                    width: `${Math.max(
                      0,
                      100 -
                        paidSharePct -
                        Math.round(
                          (overduePayments.reduce((a, b) => a + b.amountEur, 0) / totalBilledEur) *
                            100
                        )
                    )}%`,
                  }}
                  title="Pagos pendientes"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                Pagado: {paidTotalEur.toFixed(2)} € ({payments.filter((p) => p.status === 'Pagado').length})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
                Pendiente: {pendingPayments.reduce((a, b) => a + b.amountEur, 0).toFixed(2)} € (
                {pendingPayments.length})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" />
                Vencido: {overduePayments.reduce((a, b) => a + b.amountEur, 0).toFixed(2)} € (
                {overduePayments.length})
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 lg:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">
                Cobertura de Módulos y Sincronización Confia360
              </span>
              <span className="font-medium text-blue-700">{formCm.confiaSync.syncStatus}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
              {(['reputacion_local', 'seo_geo', 'campanas'] as ConfiaModuleId[]).map((m) => {
                const active = enabledModules.includes(m);
                return (
                  <div
                    key={m}
                    className={`rounded border px-2.5 py-2 ${
                      active
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <p className="font-semibold truncate">{MODULE_LABELS[m]}</p>
                    <p className="mt-0.5">{active ? 'Activo y propagado' : 'No contratado'}</p>
                  </div>
                );
              })}
              <div
                className={`rounded border px-2.5 py-2 ${
                  project.socialListeningAddonEnabled
                    ? 'border-blue-200 bg-blue-50/50 text-blue-900'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <p className="font-semibold truncate">Escucha Social</p>
                <p className="mt-0.5">
                  {project.socialListeningAddonEnabled ? 'Meta/TikTok/YT ON' : 'Desactivado'}
                </p>
              </div>
              <div className="rounded border border-blue-200 bg-blue-50/50 px-2.5 py-2 text-blue-900">
                <p className="font-semibold truncate">API Confia360</p>
                <p className="mt-0.5 font-mono truncate tabular-nums">
                  {formCm.confiaSync.lastSyncedAt}
                </p>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50/50 px-2.5 py-2 text-emerald-900">
                <p className="font-semibold truncate">Prioridad Maestra</p>
                <p className="mt-0.5 truncate">Fuente única activa</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subnavegación de la Ficha */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {[
          { id: 'overview', label: 'Identificación, Sedes y Fechas' },
          {
            id: 'billing',
            label: `Suscripciones y Pagos (${pendingPayments.length + overduePayments.length} pend.)`,
          },
          { id: 'config', label: 'Configuración Global y API Confia360' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as typeof subTab)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              subTab === t.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: IDENTIFICACIÓN, SEDES, SITUACIÓN Y FECHAS */}
      {subTab === 'overview' && (
        <form
          onSubmit={handleSaveMaster}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Identificación Legal, Contacto, Sedes y Situación Contractual
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Prioridad de datos únicos en todo Confia360
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Razón Social *</label>
              <input
                required
                type="text"
                value={formCm.legalName}
                onChange={(e) => setFormCm({ ...formCm, legalName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Nombre Comercial *</label>
              <input
                required
                type="text"
                value={formCm.commercialName}
                onChange={(e) => setFormCm({ ...formCm, commercialName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">CIF / NIF *</label>
              <input
                required
                type="text"
                value={formCm.taxId}
                onChange={(e) => setFormCm({ ...formCm, taxId: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Código Confia360</label>
              <input
                type="text"
                value={formCm.confiaCode}
                onChange={(e) => setFormCm({ ...formCm, confiaCode: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Sector principal *</label>
              <input
                required
                type="text"
                value={formCm.sector}
                onChange={(e) => setFormCm({ ...formCm, sector: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Dominio web *</label>
              <input
                required
                type="text"
                value={formCm.website}
                onChange={(e) => setFormCm({ ...formCm, website: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Dirección fiscal</label>
              <input
                type="text"
                value={formCm.fiscalAddress}
                onChange={(e) => setFormCm({ ...formCm, fiscalAddress: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-medium text-slate-700">CP</label>
                <input
                  type="text"
                  value={formCm.postalCode}
                  onChange={(e) => setFormCm({ ...formCm, postalCode: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Ciudad *</label>
                <input
                  required
                  type="text"
                  value={formCm.city}
                  onChange={(e) => setFormCm({ ...formCm, city: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Contacto principal</label>
              <input
                type="text"
                value={formCm.primaryContactName}
                onChange={(e) => setFormCm({ ...formCm, primaryContactName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Cargo contacto</label>
              <input
                type="text"
                value={formCm.primaryContactRole}
                onChange={(e) => setFormCm({ ...formCm, primaryContactRole: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Teléfono</label>
              <input
                type="text"
                value={formCm.phone}
                onChange={(e) => setFormCm({ ...formCm, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Email principal</label>
              <input
                type="email"
                value={formCm.email}
                onChange={(e) => setFormCm({ ...formCm, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Email facturación</label>
              <input
                type="email"
                value={formCm.billingEmail}
                onChange={(e) => setFormCm({ ...formCm, billingEmail: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Email alertas</label>
              <input
                type="email"
                value={formCm.notificationEmail}
                onChange={(e) => setFormCm({ ...formCm, notificationEmail: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-3 text-xs">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Situación de cuenta</label>
              <select
                value={formCm.accountStatus}
                onChange={(e) =>
                  setFormCm({ ...formCm, accountStatus: e.target.value as ClientAccountStatus })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="Activo">Activo</option>
                <option value="En Onboarding">En Onboarding</option>
                <option value="Pausado">Pausado</option>
                <option value="Riesgo de Impago">Riesgo de Impago</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Responsable de cuenta</label>
              <input
                type="text"
                value={formCm.accountManager}
                onChange={(e) => setFormCm({ ...formCm, accountManager: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Sedes activas (separadas por comas)
              </label>
              <input
                type="text"
                value={locationsText}
                onChange={(e) => setLocationsText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700">Fecha de alta</label>
              <input
                type="date"
                value={formCm.onboardingDate}
                onChange={(e) => setFormCm({ ...formCm, onboardingDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Fecha de renovación</label>
              <input
                type="date"
                value={formCm.renewalDate}
                onChange={(e) => setFormCm({ ...formCm, renewalDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Próxima revisión</label>
              <input
                type="date"
                value={formCm.nextReviewDate}
                onChange={(e) => setFormCm({ ...formCm, nextReviewDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="mb-1 block font-medium text-slate-700">
              Notas de seguimiento y acuerdos del cliente
            </label>
            <textarea
              rows={2}
              value={formCm.notes}
              onChange={(e) => setFormCm({ ...formCm, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-3 text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busyKey !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Guardar identificación y propagar</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SUSCRIPCIONES EN CURSO Y PAGOS PENDIENTES */}
      {subTab === 'billing' && (
        <div className="space-y-6">
          {/* Suscripciones en curso */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Suscripciones y Módulos Contratados en Curso
                </h2>
                <p className="text-xs text-slate-500">
                  Planes y add-ons activos vinculados al cliente con fecha de próximo cargo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSub((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{showAddSub ? 'Cerrar formulario' : 'Añadir suscripción'}</span>
              </button>
            </div>

            {showAddSub && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setBusyKey('add-sub');
                  try {
                    await onAddSubscription({
                      planName: newSubPlan.trim(),
                      billingCycle: newSubCycle,
                      amountEur: Number(newSubAmount) || 0,
                      nextBillingDate: newSubNextDate,
                      status: 'Activa',
                      modulesIncluded: enabledModules,
                    });
                    setNewSubPlan('');
                    setShowAddSub(false);
                    setNotice('Suscripción añadida a la Ficha Única.');
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : 'No se pudo añadir la suscripción.'
                    );
                  } finally {
                    setBusyKey(null);
                  }
                }}
                className="grid grid-cols-1 gap-3 rounded-lg border border-blue-200 bg-blue-50/40 p-4 sm:grid-cols-5 sm:items-end text-xs"
              >
                <div className="sm:col-span-2">
                  <label className="mb-1 block font-medium text-slate-700">
                    Nombre de suscripción / add-on *
                  </label>
                  <input
                    required
                    type="text"
                    value={newSubPlan}
                    onChange={(e) => setNewSubPlan(e.target.value)}
                    placeholder="Ej. Add-on Pack Multisede Valencia"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Periodicidad</label>
                  <select
                    value={newSubCycle}
                    onChange={(e) =>
                      setNewSubCycle(e.target.value as ClientSubscriptionItem['billingCycle'])
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900"
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Importe (€)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSubAmount}
                    onChange={(e) => setNewSubAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newSubNextDate}
                    onChange={(e) => setNewSubNextDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={busyKey !== null}
                    className="rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{sub.planName}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Módulos: {sub.modulesIncluded.map((m) => MODULE_LABELS[m] || m).join(' · ')}
                      </p>
                    </div>
                    <span
                      className={`font-semibold shrink-0 ${
                        sub.status === 'Activa'
                          ? 'text-emerald-700'
                          : sub.status === 'Pausada'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5">
                    <div className="font-mono text-slate-700 tabular-nums">
                      <span className="font-bold text-slate-900">{sub.amountEur.toFixed(2)} €</span>{' '}
                      / {sub.billingCycle} · Próx. cobro: {sub.nextBillingDate}
                    </div>
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() =>
                        onUpdateSubscription(sub.id, {
                          status: sub.status === 'Activa' ? 'Pausada' : 'Activa',
                        })
                      }
                      className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                    >
                      {sub.status === 'Activa' ? 'Pausar' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagos realizados y fechas de pagos pendientes */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Pagos, Facturas y Fechas de Pagos Pendientes
                </h2>
                <p className="text-xs text-slate-500">
                  Seguimiento de vencimientos pendientes, cobros realizados y registro manual de cuotas.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['Todos', 'Pendiente', 'Vencido', 'Pagado'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPayFilter(f)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
                      payFilter === f
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAddPay((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Registrar pago / vencimiento</span>
                </button>
              </div>
            </div>

            {showAddPay && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setBusyKey('add-pay');
                  try {
                    await onAddPayment({
                      concept: newPayConcept.trim(),
                      invoiceNumber: newPayInvoice.trim() || undefined,
                      amountEur: Number(newPayAmount) || 0,
                      dueDate: newPayDueDate,
                      paymentMethod: newPayMethod,
                      status: newPayStatus,
                    });
                    setNewPayConcept('');
                    setNewPayInvoice('');
                    setShowAddPay(false);
                    setNotice('Movimiento de cobro añadido correctamente.');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Error registrando pago.');
                  } finally {
                    setBusyKey(null);
                  }
                }}
                className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:grid-cols-6 sm:items-end text-xs"
              >
                <div className="sm:col-span-2">
                  <label className="mb-1 block font-medium text-slate-700">Concepto *</label>
                  <input
                    required
                    type="text"
                    value={newPayConcept}
                    onChange={(e) => setNewPayConcept(e.target.value)}
                    placeholder="Ej. Cuota Enero 2027 · Plan Agency"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Nº Factura</label>
                  <input
                    type="text"
                    value={newPayInvoice}
                    onChange={(e) => setNewPayInvoice(e.target.value)}
                    placeholder="FAC-2027-01"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Importe (€) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPayAmount}
                    onChange={(e) => setNewPayAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">Fecha vencimiento *</label>
                  <input
                    required
                    type="date"
                    value={newPayDueDate}
                    onChange={(e) => setNewPayDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-slate-900"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newPayStatus}
                    onChange={(e) => setNewPayStatus(e.target.value as ClientPaymentRecord['status'])}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-900"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Pagado">Pagado</option>
                  </select>
                  <button
                    type="submit"
                    disabled={busyKey !== null}
                    className="rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    Añadir
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Factura</th>
                    <th className="px-4 py-3 font-medium">Concepto</th>
                    <th className="px-4 py-3 font-medium">Método</th>
                    <th className="px-4 py-3 font-medium">Vencimiento</th>
                    <th className="px-4 py-3 font-medium text-right">Importe</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-6 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        No hay registros de pago en este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3 font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          {pay.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          <p className="font-medium">{pay.concept}</p>
                          {pay.paidAt && (
                            <p className="font-mono text-[10px] text-emerald-700 tabular-nums">
                              Cobrado el {pay.paidAt}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {pay.paymentMethod}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {pay.dueDate}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {pay.amountEur.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              pay.status === 'Pagado'
                                ? 'text-emerald-700'
                                : pay.status === 'Vencido'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {pay.status === 'Pagado' ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {pay.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {pay.status !== 'Pagado' && (
                              <button
                                type="button"
                                onClick={() => onUpdatePayment(pay.id, { status: 'Pagado' })}
                                className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                              >
                                Marcar pagado
                              </button>
                            )}
                            {pay.status === 'Pendiente' && (
                              <button
                                type="button"
                                onClick={() => onUpdatePayment(pay.id, { status: 'Vencido' })}
                                className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                              >
                                Vencido
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeletePayment(pay.id)}
                              className="rounded border border-slate-200 bg-white p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-700"
                              aria-label="Eliminar movimiento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TODAS LAS OPCIONES DE CONFIGURACIÓN EDITABLES + API CONFIA360 */}
      {subTab === 'config' && (
        <form onSubmit={handleSaveMaster} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-blue-700" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Configuración Operativa Global del Cliente (Propagación Prioritaria)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Edita aquí reglas de marca, automatización de reseñas, webhook de invitaciones y cumplimiento RGPD enlazados en todos los módulos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToAdmin}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <Lock className="h-3.5 w-3.5 text-blue-700" />
                <span>
                  {adminStatus.unlocked
                    ? 'Administrar Módulos y Fuentes (PIN activo)'
                    : 'Módulos, Fuentes y Escucha Social (PIN)'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Propuesta de valor (uso en SEO, GEO y GBP)
                </label>
                <textarea
                  rows={2}
                  value={profileForm.valueProposition}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, valueProposition: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Garantías verificadas (control antialucinación)
                </label>
                <textarea
                  rows={2}
                  value={profileForm.guarantees}
                  onChange={(e) => setProfileForm({ ...profileForm, guarantees: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Rango de precios</label>
                <input
                  type="text"
                  value={profileForm.priceRange}
                  onChange={(e) => setProfileForm({ ...profileForm, priceRange: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Tono de comunicación</label>
                <input
                  type="text"
                  value={profileForm.brandTone}
                  onChange={(e) => setProfileForm({ ...profileForm, brandTone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block font-medium text-slate-700">
                  Afirmaciones prohibidas (separadas por | )
                </label>
                <input
                  type="text"
                  value={forbiddenClaimsText}
                  onChange={(e) => setForbiddenClaimsText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Modo de respuesta a reseñas
                </label>
                <select
                  value={policyForm.mode}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      mode: e.target.value as ReviewAutomationPolicy['mode'],
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                >
                  <option value="Mixto">Mixto (Auto 4-5★, Humano ≤3★)</option>
                  <option value="Semiautomático">Semiautomático (Todo con aprobación)</option>
                  <option value="Automático">Automático</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Canal por defecto invitaciones
                </label>
                <select
                  value={invConfigForm.defaultChannel}
                  onChange={(e) =>
                    setInvConfigForm({
                      ...invConfigForm,
                      defaultChannel: e.target.value as ReviewInvitationChannel,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Enlace público reseñas Google
                </label>
                <input
                  type="text"
                  value={invConfigForm.publicReviewUrl}
                  onChange={(e) =>
                    setInvConfigForm({ ...invConfigForm, publicReviewUrl: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
              <div className="flex flex-wrap items-center gap-5">
                <label className="inline-flex items-center gap-2 text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.gdprCompliant}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, gdprCompliant: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-700"
                  />
                  <span>Cumplimiento RGPD activo</span>
                </label>
                <label className="inline-flex items-center gap-2 text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invConfigForm.enabled}
                    onChange={(e) =>
                      setInvConfigForm({ ...invConfigForm, enabled: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-700"
                  />
                  <span>Webhook automático de invitaciones CRM activo</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={busyKey !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Guardar configuración global</span>
              </button>
            </div>
          </div>

          {/* Puente API Bidireccional Confia360 */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Sincronización API Confia360 & Manifiesto de Módulos
                </h3>
                <p className="text-xs text-slate-500">
                  Esta Ficha Maestra mantiene la prioridad de datos únicos y expone el contrato API para CRM, Kit Digital, Portal Cliente y la app principal Confia360.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-700">
                {formCm.confiaSync.priorityMode}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-slate-500">ID Cliente en Confia360</p>
                <p className="mt-1 font-mono font-semibold text-slate-900">
                  {formCm.confiaSync.confiaClientId}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-slate-500">Última sincronización API</p>
                <p className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                  {formCm.confiaSync.lastSyncedAt} ({formCm.confiaSync.lastSyncDirection})
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-slate-500">Manifiesto de módulos Confia360</p>
                <p className="mt-1 font-mono text-[11px] text-blue-700 truncate">
                  GET /api/v1/confia360/modules-manifest
                </p>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
