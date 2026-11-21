import React, { useEffect, useState } from 'react';
import {
  Check,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import {
  CORE_REPUTATION_SOURCES,
  DEFAULT_REPUTATION_SOURCE_CATALOG,
} from '../data/seedData';
import type {
  AdminLockStatus,
  ProjectWorkspace,
  ReputationSourceCategory,
  ReputationSourceDefinition,
  ReputationSourcePlatform,
} from '../types';

const CATEGORY_META: Record<
  ReputationSourceCategory,
  { title: string; subtitle: string }
> = {
  base: {
    title: 'Buscadores y Reseñas Base',
    subtitle: 'Centraliza reseñas públicas y verificadas en tiempo real',
  },
  sectorial: {
    title: 'Portales Sectoriales y Propios',
    subtitle: 'Directorios clave y fuentes personalizadas según actividad',
  },
  social: {
    title: 'Add-on Escucha Social (Comentarios Negativos)',
    subtitle: 'Captura críticas en redes sin mezclar aquí campañas de pago',
  },
};

export interface CreateReputationSourcePayload {
  name: string;
  label: string;
  detail: string;
  category: ReputationSourceCategory;
  profileUrl?: string;
  activateNow: boolean;
}

export interface UpdateReputationSourcePayload {
  name?: string;
  label: string;
  detail: string;
  category: ReputationSourceCategory;
  profileUrl?: string;
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
  showTopPinGate?: boolean;
  socialAddonFirst?: boolean;
}

export const ReputationSourcesAdminPanel: React.FC<Props> = ({
  project,
  adminStatus,
  onAdminUnlock,
  onAdminLock,
  onAdminChangePin,
  onUpdateReputationSources,
  onCreateReputationSource,
  onUpdateReputationSourceItem,
  onDeleteReputationSourceItem,
  showTopPinGate = true,
  socialAddonFirst = false,
}) => {
  const catalog: ReputationSourceDefinition[] =
    project.reputationSourcesCatalog && project.reputationSourcesCatalog.length > 0
      ? project.reputationSourcesCatalog
      : DEFAULT_REPUTATION_SOURCE_CATALOG;

  const allCatalogNames = catalog.map((item) => item.name);
  const coreCatalogNames = catalog
    .filter((item) => item.category !== 'social')
    .map((item) => item.name);
  const socialCatalogItems = catalog.filter((item) => item.category === 'social');
  const socialCatalogNames = socialCatalogItems.map((item) => item.name);

  const savedSources: ReputationSourcePlatform[] =
    project.enabledReputationSources ||
    (project.socialListeningAddonEnabled ? allCatalogNames : coreCatalogNames);

  const [selectedSources, setSelectedSources] =
    useState<ReputationSourcePlatform[]>(savedSources);

  useEffect(() => {
    const nextSources: ReputationSourcePlatform[] =
      project.enabledReputationSources ||
      (project.socialListeningAddonEnabled ? allCatalogNames : coreCatalogNames);
    setSelectedSources(nextSources);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project.id,
    project.enabledReputationSources,
    project.socialListeningAddonEnabled,
    project.reputationSourcesCatalog,
  ]);

  const [pinUsername, setPinUsername] = useState(adminStatus.username || 'Asexia');
  const [pinInput, setPinInput] = useState('');
  const [socialPinUsername, setSocialPinUsername] = useState(
    adminStatus.username || 'Asexia'
  );
  const [socialPinInput, setSocialPinInput] = useState('');
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // Formulario para añadir nueva fuente
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSrcName, setNewSrcName] = useState('');
  const [newSrcLabel, setNewSrcLabel] = useState('');
  const [newSrcCategory, setNewSrcCategory] =
    useState<ReputationSourceCategory>('sectorial');
  const [newSrcDetail, setNewSrcDetail] = useState('');
  const [newSrcUrl, setNewSrcUrl] = useState('');
  const [newSrcActivateNow, setNewSrcActivateNow] = useState(true);

  // Formulario inline para modificar una fuente existente
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editSrcName, setEditSrcName] = useState('');
  const [editSrcLabel, setEditSrcLabel] = useState('');
  const [editSrcCategory, setEditSrcCategory] =
    useState<ReputationSourceCategory>('sectorial');
  const [editSrcDetail, setEditSrcDetail] = useState('');
  const [editSrcUrl, setEditSrcUrl] = useState('');

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeSocialChannels = socialCatalogNames.filter((s) =>
    savedSources.includes(s)
  );
  const selectedSocialChannels = socialCatalogNames.filter((s) =>
    selectedSources.includes(s)
  );
  const isSocialAddonActive = activeSocialChannels.length > 0;
  const allSocialActive =
    socialCatalogNames.length > 0 &&
    activeSocialChannels.length === socialCatalogNames.length;

  const hasPendingSourceChanges =
    selectedSources.length !== savedSources.length ||
    selectedSources.some((src) => !savedSources.includes(src));

  const toggleSource = (sourceId: ReputationSourcePlatform) => {
    if (!adminStatus.unlocked || busyKey !== null) return;
    setSelectedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((item) => item !== sourceId)
        : [...prev, sourceId]
    );
  };

  const startEditingSource = (item: ReputationSourceDefinition) => {
    if (!adminStatus.unlocked) {
      setError('Desbloquea la gestión con el PIN de Asexia para modificar fuentes.');
      return;
    }
    setError(null);
    setNotice(null);
    setEditingSourceId(item.id);
    setEditSrcName(item.name);
    setEditSrcLabel(item.label);
    setEditSrcCategory(item.category);
    setEditSrcDetail(item.detail);
    setEditSrcUrl(item.profileUrl || '');
  };

  const hasSocialSelectionDiff =
    selectedSocialChannels.length !== activeSocialChannels.length ||
    selectedSocialChannels.some((s) => !activeSocialChannels.includes(s));

  const renderSourcesCatalogSection = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-blue-700" />
              <span>
                Selectores Múltiples de Fuentes · Gestión Omnicanal de Reseñas
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Activa fuentes mediante selectores múltiples, añade nuevos canales o modifica los existentes para{' '}
              <strong className="font-medium text-slate-800">
                {project.profile.companyName}
              </strong>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!adminStatus.unlocked || busyKey !== null}
              onClick={() => setSelectedSources([...coreCatalogNames])}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Solo Maps, Trustpilot y Portales
            </button>
            <button
              type="button"
              disabled={!adminStatus.unlocked || busyKey !== null}
              onClick={() => setSelectedSources([...allCatalogNames])}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0 tabular-nums"
            >
              Seleccionar todas ({allCatalogNames.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (!adminStatus.unlocked) {
                  setError(
                    'Introduce primero el PIN de administrador de Asexia para añadir nuevas fuentes.'
                  );
                  return;
                }
                setError(null);
                setShowAddSource((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                showAddSource
                  ? 'border border-slate-300 bg-slate-100 text-slate-900'
                  : adminStatus.unlocked
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {showAddSource ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span>Cerrar nueva fuente</span>
                </>
              ) : (
                <>
                  {!adminStatus.unlocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Añadir fuente</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Formulario del administrador para añadir una nueva fuente */}
        {showAddSource && adminStatus.unlocked && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setNotice(null);
              setBusyKey('create-source');
              try {
                const cleanName = newSrcName.trim();
                const cleanLabel = newSrcLabel.trim() || cleanName;
                await onCreateReputationSource({
                  name: cleanName,
                  label: cleanLabel,
                  detail:
                    newSrcDetail.trim() ||
                    'Fuente personalizada añadida por el administrador.',
                  category: newSrcCategory,
                  profileUrl: newSrcUrl.trim() || undefined,
                  activateNow: newSrcActivateNow,
                });
                setNewSrcName('');
                setNewSrcLabel('');
                setNewSrcDetail('');
                setNewSrcUrl('');
                setNewSrcCategory('sectorial');
                setNewSrcActivateNow(true);
                setShowAddSource(false);
                setNotice(
                  `Nueva fuente "${cleanLabel}" añadida correctamente al catálogo omnicanal.`
                );
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'No se pudo añadir la fuente.'
                );
              } finally {
                setBusyKey(null);
              }
            }}
            className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-900">
                Nueva fuente de reseñas o escucha social (Administrador: {adminStatus.username})
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Nombre de plataforma / fuente *
                </label>
                <input
                  type="text"
                  required
                  value={newSrcName}
                  onChange={(e) => setNewSrcName(e.target.value)}
                  placeholder="Ej. TopDoctors, LinkedIn, Google Play"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Etiqueta visible (opcional)
                </label>
                <input
                  type="text"
                  value={newSrcLabel}
                  onChange={(e) => setNewSrcLabel(e.target.value)}
                  placeholder="Ej. TopDoctors España"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Grupo / Categoría *
                </label>
                <select
                  value={newSrcCategory}
                  onChange={(e) =>
                    setNewSrcCategory(e.target.value as ReputationSourceCategory)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="base">Buscadores y Reseñas Base</option>
                  <option value="sectorial">Portales Sectoriales y Propios</option>
                  <option value="social">Add-on Escucha Social</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  URL o perfil monitorizado (opcional)
                </label>
                <input
                  type="text"
                  value={newSrcUrl}
                  onChange={(e) => setNewSrcUrl(e.target.value)}
                  placeholder="https://... o @cuenta"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Descripción operativa
                </label>
                <input
                  type="text"
                  value={newSrcDetail}
                  onChange={(e) => setNewSrcDetail(e.target.value)}
                  placeholder="Ej. Valoraciones de pacientes y seguimiento de citas en clínica"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={newSrcActivateNow}
                  onChange={(e) => setNewSrcActivateNow(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700"
                />
                <span>Activar inmediatamente en el buzón</span>
              </label>
              <button
                type="submit"
                disabled={busyKey !== null || !newSrcName.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {busyKey === 'create-source' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>Guardar nueva fuente</span>
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {(['base', 'sectorial', 'social'] as ReputationSourceCategory[]).map(
            (categoryKey) => {
              const groupMeta = CATEGORY_META[categoryKey];
              const groupItems = catalog.filter((item) => item.category === categoryKey);
              const groupNames = groupItems.map((i) => i.name);
              const selectedInGroup = groupNames.filter((name) =>
                selectedSources.includes(name)
              ).length;
              const allGroupSelected =
                groupNames.length > 0 && selectedInGroup === groupNames.length;

              return (
                <div
                  key={categoryKey}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">
                        {groupMeta.title}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {groupMeta.subtitle}
                      </p>
                    </div>
                    {groupNames.length > 0 && (
                      <button
                        type="button"
                        disabled={!adminStatus.unlocked || busyKey !== null}
                        onClick={() => {
                          if (!adminStatus.unlocked) return;
                          setSelectedSources((prev) =>
                            allGroupSelected
                              ? prev.filter((id) => !groupNames.includes(id))
                              : Array.from(new Set([...prev, ...groupNames]))
                          );
                        }}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0 tabular-nums"
                      >
                        {allGroupSelected
                          ? 'Quitar grupo'
                          : `Todas (${selectedInGroup}/${groupNames.length})`}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {groupItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-[11px] text-slate-500">
                        Sin fuentes en este grupo. Añade una nueva desde “Añadir fuente”.
                      </p>
                    ) : (
                      groupItems.map((item) => {
                        const checked = selectedSources.includes(item.name);
                        const isSaved = savedSources.includes(item.name);
                        const isEditing = editingSourceId === item.id;

                        if (isEditing && adminStatus.unlocked) {
                          return (
                            <form
                              key={item.id}
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setError(null);
                                setNotice(null);
                                setBusyKey(`edit-${item.id}`);
                                try {
                                  await onUpdateReputationSourceItem(item.id, {
                                    name: !item.isDefault
                                      ? editSrcName.trim()
                                      : undefined,
                                    label: editSrcLabel.trim(),
                                    detail: editSrcDetail.trim(),
                                    category: editSrcCategory,
                                    profileUrl: editSrcUrl.trim() || undefined,
                                  });
                                  setEditingSourceId(null);
                                  setNotice(
                                    `Fuente "${editSrcLabel.trim()}" modificada correctamente.`
                                  );
                                } catch (err) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : 'Error actualizando la fuente.'
                                  );
                                } finally {
                                  setBusyKey(null);
                                }
                              }}
                              className="rounded-lg border border-blue-300 bg-white p-3 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-blue-800">
                                  Modificar fuente
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingSourceId(null)}
                                  className="text-slate-400 hover:text-slate-700"
                                  aria-label="Cancelar edición"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {!item.isDefault && (
                                <input
                                  type="text"
                                  required
                                  value={editSrcName}
                                  onChange={(e) => setEditSrcName(e.target.value)}
                                  placeholder="Nombre técnico de plataforma"
                                  className="w-full rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-900"
                                />
                              )}
                              <input
                                type="text"
                                required
                                value={editSrcLabel}
                                onChange={(e) => setEditSrcLabel(e.target.value)}
                                placeholder="Etiqueta visible"
                                className="w-full rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-900"
                              />
                              <select
                                value={editSrcCategory}
                                onChange={(e) =>
                                  setEditSrcCategory(
                                    e.target.value as ReputationSourceCategory
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900"
                              >
                                <option value="base">Buscadores y Reseñas Base</option>
                                <option value="sectorial">
                                  Portales Sectoriales y Propios
                                </option>
                                <option value="social">Add-on Escucha Social</option>
                              </select>
                              <input
                                type="text"
                                value={editSrcDetail}
                                onChange={(e) => setEditSrcDetail(e.target.value)}
                                placeholder="Descripción operativa"
                                className="w-full rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-900"
                              />
                              <input
                                type="text"
                                value={editSrcUrl}
                                onChange={(e) => setEditSrcUrl(e.target.value)}
                                placeholder="URL o @cuenta (opcional)"
                                className="w-full rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-900"
                              />
                              <div className="flex items-center justify-between gap-2 pt-1">
                                {!item.isDefault ? (
                                  <button
                                    type="button"
                                    disabled={busyKey !== null}
                                    onClick={async () => {
                                      setError(null);
                                      setNotice(null);
                                      setBusyKey(`del-${item.id}`);
                                      try {
                                        await onDeleteReputationSourceItem(item.id);
                                        setEditingSourceId(null);
                                        setNotice(
                                          `Fuente "${item.label}" eliminada del catálogo.`
                                        );
                                      } catch (err) {
                                        setError(
                                          err instanceof Error
                                            ? err.message
                                            : 'No se pudo eliminar la fuente.'
                                        );
                                      } finally {
                                        setBusyKey(null);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 whitespace-nowrap"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Eliminar</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">
                                    Fuente base del sistema
                                  </span>
                                )}
                                <button
                                  type="submit"
                                  disabled={busyKey !== null}
                                  className="inline-flex items-center gap-1 rounded bg-blue-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                                >
                                  {busyKey === `edit-${item.id}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  <span>Guardar</span>
                                </button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                              checked
                                ? 'border-blue-300 bg-blue-50/40'
                                : 'border-slate-200 bg-white'
                            } ${!adminStatus.unlocked ? 'opacity-80' : ''}`}
                          >
                            <input
                              id={`src-chk-${item.id}`}
                              type="checkbox"
                              disabled={!adminStatus.unlocked || busyKey !== null}
                              checked={checked}
                              onChange={() => toggleSource(item.name)}
                              className="mt-0.5 rounded border-slate-300 text-blue-700 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <label
                                  htmlFor={`src-chk-${item.id}`}
                                  className={`font-medium text-slate-900 ${
                                    adminStatus.unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                                  }`}
                                >
                                  {item.label}
                                </label>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`text-[10px] font-medium ${
                                      isSaved ? 'text-emerald-700' : 'text-slate-400'
                                    }`}
                                  >
                                    {isSaved ? 'Activa' : 'Inactiva'}
                                  </span>
                                  {adminStatus.unlocked && (
                                    <button
                                      type="button"
                                      onClick={() => startEditingSource(item)}
                                      className="rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                      title={`Modificar ${item.label}`}
                                      aria-label={`Modificar ${item.label}`}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {item.detail}
                              </p>
                              {item.profileUrl && (
                                <p className="mt-0.5 truncate font-mono text-[10px] text-blue-700">
                                  {item.profileUrl}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-900">
              {selectedSources.length}/{allCatalogNames.length} fuentes seleccionadas
            </span>
            <span aria-hidden="true"> · </span>
            <span>
              {selectedSocialChannels.length > 0
                ? `Incluye ${selectedSocialChannels.length} canales del Add-on de Escucha Social`
                : 'Solo buscadores y portales sin Escucha Social'}
            </span>
            {hasPendingSourceChanges && adminStatus.unlocked && (
              <span className="ml-2 font-medium text-amber-700">
                (Cambios pendientes de guardar)
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={
              !adminStatus.unlocked || busyKey !== null || selectedSources.length === 0
            }
            onClick={async () => {
              setError(null);
              setNotice(null);
              setBusyKey('save-sources');
              try {
                await onUpdateReputationSources(selectedSources);
                setNotice(
                  `Fuentes actualizadas (${selectedSources.length} activas) y sincronizadas con el buzón unificado.`
                );
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'Error guardando fuentes de reputación.'
                );
              } finally {
                setBusyKey(null);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {busyKey === 'save-sources' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : !adminStatus.unlocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>
              {adminStatus.unlocked
                ? 'Guardar fuentes seleccionadas'
                : 'Desbloquea con PIN para guardar'}
            </span>
          </button>
        </div>
      </div>
  );

  const renderSocialAddonSection = () => (
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
              <Radio className="h-3.5 w-3.5" />
              <span>Add-on Opcional · Menciones Negativas en Redes</span>
            </p>
            <h3 className="text-base font-bold text-slate-900">
              Add-on de Escucha Social (Meta, TikTok y YouTube)
            </h3>
            <p className="text-xs text-slate-600 max-w-3xl">
              Monitoriza comentarios negativos y críticas en{' '}
              <strong className="font-medium text-slate-800">
                Meta (Instagram/Facebook)
              </strong>
              , <strong className="font-medium text-slate-800">TikTok</strong>,{' '}
              <strong className="font-medium text-slate-800">YouTube</strong> y cualquier red añadida por el administrador para centralizar menciones negativas en el buzón unificado sin mezclar campañas publicitarias.
            </p>
          </div>
          <div className="shrink-0 text-left text-xs lg:text-right">
            <span
              className={`font-semibold tabular-nums ${
                isSocialAddonActive ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              {isSocialAddonActive
                ? `Activo · ${activeSocialChannels.length}/${socialCatalogNames.length} canales`
                : 'Desactivado · Solo fuentes base y portales'}
            </span>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {isSocialAddonActive
                ? 'Menciones negativas enlazadas al buzón unificado'
                : 'Requiere validación PIN de Asexia para habilitar'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {socialCatalogItems.map((channel) => {
            const isSelected = selectedSources.includes(channel.name);
            const isSaved = savedSources.includes(channel.name);
            return (
              <label
                key={channel.id}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
                  adminStatus.unlocked
                    ? 'cursor-pointer hover:bg-slate-50'
                    : 'cursor-default bg-slate-50/50'
                } ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!adminStatus.unlocked || busyKey !== null}
                  checked={isSelected}
                  onChange={() => toggleSource(channel.name)}
                  className="mt-0.5 rounded border-slate-300 text-blue-700"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{channel.label}</span>
                    <span
                      className={`text-[11px] font-medium ${
                        isSaved ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {isSaved ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    {channel.detail}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {!adminStatus.unlocked ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setNotice(null);
              setBusyKey('social-addon-unlock');
              try {
                const token = await onAdminUnlock(
                  socialPinUsername.trim() || 'Asexia',
                  socialPinInput.trim()
                );
                const baseNonSocial = selectedSources.filter(
                  (s) => !socialCatalogNames.includes(s)
                );
                const mergedSources: ReputationSourcePlatform[] = Array.from(
                  new Set([
                    ...(baseNonSocial.length > 0
                      ? baseNonSocial
                      : coreCatalogNames.length > 0
                        ? coreCatalogNames
                        : CORE_REPUTATION_SOURCES),
                    ...socialCatalogNames,
                  ])
                );
                await onUpdateReputationSources(mergedSources, token);
                setSelectedSources(mergedSources);
                setSocialPinInput('');
                setNotice(
                  'PIN validado y Add-on de Escucha Social activado: Meta, TikTok y YouTube centralizan sus menciones negativas en el buzón unificado.'
                );
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : 'No se pudo validar el PIN de Asexia para activar el Add-on.'
                );
              } finally {
                setBusyKey(null);
              }
            }}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="space-y-1 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Lock className="h-3.5 w-3.5 text-blue-700" />
                <span>Autorización con PIN de Asexia para habilitar la Escucha Social</span>
              </p>
              <p className="text-slate-600">
                Introduce el PIN de acceso para desbloquear la gestión de fuentes y activar la captura de menciones negativas en Meta, TikTok y YouTube.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Usuario autorizado
                </label>
                <input
                  type="text"
                  required
                  value={socialPinUsername}
                  onChange={(e) => setSocialPinUsername(e.target.value)}
                  placeholder="Asexia"
                  className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  PIN de acceso
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  required
                  value={socialPinInput}
                  onChange={(e) => setSocialPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={busyKey !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {busyKey === 'social-addon-unlock' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
                <span>Validar PIN y activar Add-on</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <p className="text-slate-600 tabular-nums">
              {selectedSocialChannels.length > 0
                ? `${selectedSocialChannels.length}/${socialCatalogNames.length} canales sociales seleccionados para centralización de menciones negativas.`
                : 'Ningún canal social seleccionado en el Add-on.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {isSocialAddonActive && (
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={async () => {
                    setError(null);
                    setNotice(null);
                    setBusyKey('social-addon-disable');
                    try {
                      const onlyCore = selectedSources.filter(
                        (s) => !socialCatalogNames.includes(s)
                      );
                      const next =
                        onlyCore.length > 0 ? onlyCore : [...coreCatalogNames];
                      await onUpdateReputationSources(next);
                      setSelectedSources(next);
                      setNotice(
                        'Add-on de Escucha Social pausado. Solo fuentes base y portales sectoriales activos.'
                      );
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'No se pudo desactivar el Add-on de Escucha Social.'
                      );
                    } finally {
                      setBusyKey(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <span>Desactivar Add-on</span>
                </button>
              )}
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={async () => {
                  setError(null);
                  setNotice(null);
                  setBusyKey('social-addon-enable');
                  try {
                    const baseNonSocial = selectedSources.filter(
                      (s) => !socialCatalogNames.includes(s)
                    );
                    const channelsToEnable =
                      selectedSocialChannels.length > 0 &&
                      (hasSocialSelectionDiff || isSocialAddonActive)
                        ? selectedSocialChannels
                        : socialCatalogNames;
                    const next: ReputationSourcePlatform[] = Array.from(
                      new Set([
                        ...(baseNonSocial.length > 0
                          ? baseNonSocial
                          : coreCatalogNames),
                        ...channelsToEnable,
                      ])
                    );
                    await onUpdateReputationSources(next);
                    setSelectedSources(next);
                    setNotice(
                      `Add-on de Escucha Social guardado (${channelsToEnable.length} canal(es) sociales centralizados en el buzón unificado).`
                    );
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Error activando el Add-on de Escucha Social.'
                    );
                  } finally {
                    setBusyKey(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {busyKey === 'social-addon-enable' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>
                  {isSocialAddonActive || (selectedSocialChannels.length > 0 && hasSocialSelectionDiff)
                    ? 'Guardar selección social'
                    : 'Activar Add-on de Escucha Social'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
  );

  return (
    <div className="space-y-5">
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

      {showTopPinGate && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          {!adminStatus.unlocked ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setNotice(null);
                setBusyKey('unlock');
                try {
                  await onAdminUnlock(pinUsername.trim() || 'Asexia', pinInput.trim());
                  setPinInput('');
                  setNotice(
                    `Acceso desbloqueado para ${pinUsername.trim() || 'Asexia'}. Ya puedes activar, añadir o modificar fuentes y configurar el Add-on de Escucha Social.`
                  );
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'No se pudo validar el PIN de acceso.'
                  );
                } finally {
                  setBusyKey(null);
                }
              }}
              className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Lock className="h-4 w-4 text-blue-700" />
                  <span>
                    Acceso administrativo · Desbloquea fuentes, edición y Escucha Social
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl">
                  Introduce el PIN de{' '}
                  <strong className="font-medium text-slate-800">
                    {adminStatus.username || 'Asexia'}
                  </strong>{' '}
                  para desbloquear los selectores múltiples de fuentes, añadir o modificar fuentes del catálogo y habilitar el add-on de Escucha Social.
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
                    className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
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
                    className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busyKey !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {busyKey === 'unlock' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                  <span>Desbloquear gestión</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5 text-xs">
                  <p className="flex items-center gap-2 font-semibold text-emerald-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <span>
                      Gestión de fuentes desbloqueada · Administrador: {adminStatus.username}
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
                    disabled={busyKey !== null}
                    onClick={async () => {
                      setError(null);
                      setNotice(null);
                      setBusyKey('lock');
                      try {
                        await onAdminLock();
                        setShowChangePin(false);
                        setShowAddSource(false);
                        setEditingSourceId(null);
                        setNotice('Configuración de fuentes bloqueada.');
                      } finally {
                        setBusyKey(null);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Bloquear configuración</span>
                  </button>
                </div>
              </div>

              {showChangePin && !adminStatus.envManaged && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    setNotice(null);
                    if (!/^\d{4,12}$/.test(newPinInput.trim())) {
                      setError('El nuevo PIN debe tener entre 4 y 12 dígitos numéricos.');
                      return;
                    }
                    if (newPinInput.trim() !== confirmPinInput.trim()) {
                      setError('La confirmación del nuevo PIN no coincide.');
                      return;
                    }
                    setBusyKey('change-pin');
                    try {
                      await onAdminChangePin(currentPinInput.trim(), newPinInput.trim());
                      setCurrentPinInput('');
                      setNewPinInput('');
                      setConfirmPinInput('');
                      setShowChangePin(false);
                      setNotice(
                        'PIN de acceso actualizado y guardado de forma segura en el servidor.'
                      );
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : 'No se pudo cambiar el PIN.'
                      );
                    } finally {
                      setBusyKey(null);
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
                    disabled={busyKey !== null}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    {busyKey === 'change-pin' ? (
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
      )}

      {socialAddonFirst ? (
        <>
          {renderSocialAddonSection()}
          {renderSourcesCatalogSection()}
        </>
      ) : (
        <>
          {renderSourcesCatalogSection()}
          {renderSocialAddonSection()}
        </>
      )}
    </div>
  );
};
