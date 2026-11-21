import React, { useState } from 'react';
import { BellPlus, Check, Loader2, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import type {
  AdminLockStatus,
  ModuleReleaseNote,
  ReleaseNoteModuleTarget,
} from '../types';

const MODULE_OPTIONS: { id: ReleaseNoteModuleTarget; label: string }[] = [
  { id: 'dashboard', label: 'Resumen y ROI' },
  { id: 'client', label: 'Ficha de Cliente' },
  { id: 'reputation', label: 'ReputaciónLocal y GBP' },
  { id: 'geogrid', label: 'Mapa Geo-Grid' },
  { id: 'geo-ai', label: 'Monitor GEO (IAs)' },
  { id: 'content', label: 'Contenido' },
  { id: 'technical', label: 'SEO Técnico' },
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'campaigns', label: 'Campañas' },
  { id: 'onboarding', label: 'Onboarding y Admin' },
];

interface Props {
  releaseNotes: ModuleReleaseNote[];
  adminStatus: AdminLockStatus;
  onCreateNote: (payload: {
    version: string;
    title: string;
    summary: string;
    details: string;
    modules: ReleaseNoteModuleTarget[];
    category: ModuleReleaseNote['category'];
  }) => Promise<void>;
  onUpdateNote: (
    noteId: string,
    updates: Partial<ModuleReleaseNote>
  ) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export const AdminReleaseNotesPanel: React.FC<Props> = ({
  releaseNotes,
  adminStatus,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [version, setVersion] = useState('v2.5');
  const [category, setCategory] = useState<ModuleReleaseNote['category']>('Nueva función');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [selectedModules, setSelectedModules] = useState<ReleaseNoteModuleTarget[]>([
    'reputation',
  ]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleModule = (modId: ReleaseNoteModuleTarget) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setVersion('v2.5');
    setCategory('Nueva función');
    setTitle('');
    setSummary('');
    setDetails('');
    setSelectedModules(['reputation']);
    setShowForm(false);
  };

  const startEdit = (note: ModuleReleaseNote) => {
    setEditingId(note.id);
    setVersion(note.version);
    setCategory(note.category);
    setTitle(note.title);
    setSummary(note.summary);
    setDetails(note.details);
    setSelectedModules(note.modules);
    setShowForm(true);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BellPlus className="h-4 w-4 text-blue-700" />
            <span>Notas Informativas de Novedades por Módulo</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Publica avisos de nuevas funcionalidades desde Administración; aparecerán automáticamente en la cabecera de cada módulo seleccionado de forma usable y descartable.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!adminStatus.unlocked) {
              setError('Desbloquea Administración con el PIN de Asexia para publicar o editar notas.');
              return;
            }
            setError(null);
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          {!adminStatus.unlocked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : showForm ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span>{showForm ? 'Cerrar editor' : 'Publicar novedad'}</span>
        </button>
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

      {showForm && adminStatus.unlocked && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (selectedModules.length === 0) {
              setError('Selecciona al menos un módulo donde mostrar la novedad.');
              return;
            }
            setError(null);
            setNotice(null);
            setBusyKey('save-note');
            try {
              if (editingId) {
                await onUpdateNote(editingId, {
                  version: version.trim(),
                  category,
                  title: title.trim(),
                  summary: summary.trim(),
                  details: details.trim() || summary.trim(),
                  modules: selectedModules,
                });
                setNotice('Nota informativa actualizada en los módulos asignados.');
              } else {
                await onCreateNote({
                  version: version.trim(),
                  category,
                  title: title.trim(),
                  summary: summary.trim(),
                  details: details.trim() || summary.trim(),
                  modules: selectedModules,
                });
                setNotice('Nueva nota informativa publicada en los módulos seleccionados.');
              }
              resetForm();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Error guardando nota informativa.');
            } finally {
              setBusyKey(null);
            }
          }}
          className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 text-xs"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Versión</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ModuleReleaseNote['category'])}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900"
              >
                <option value="Nueva función">Nueva función</option>
                <option value="Mejora">Mejora</option>
                <option value="Integración">Integración</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-slate-700">Título breve *</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Nuevo filtro automático de reseñas urgentes"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Resumen claro (visible en el módulo) *
            </label>
            <input
              required
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Explica en 1 frase qué cambia y qué gana el usuario"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Guía de uso ampliada (al pulsar "Cómo usar")
            </label>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Indica los pasos concretos para aprovechar esta nueva función"
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900"
            />
          </div>

          <div>
            <p className="mb-1.5 font-medium text-slate-700">
              Módulos donde aparecerá esta nota informativa:
            </p>
            <div className="flex flex-wrap gap-2">
              {MODULE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 cursor-pointer ${
                    selectedModules.includes(opt.id)
                      ? 'border-blue-400 bg-white text-blue-900 font-medium'
                      : 'border-slate-200 bg-white/70 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(opt.id)}
                    onChange={() => toggleModule(opt.id)}
                    className="rounded border-slate-300 text-blue-700"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busyKey !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {busyKey === 'save-note' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>{editingId ? 'Guardar cambios' : 'Publicar en módulos'}</span>
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {releaseNotes.map((note) => (
          <div
            key={note.id}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 sm:flex-row sm:items-start sm:justify-between text-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-blue-700">{note.version}</span>
                <span className="font-semibold text-slate-900">{note.title}</span>
                <span
                  className={`font-medium ${
                    note.active ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  · {note.active ? 'Visible en módulos' : 'Oculta'}
                </span>
              </div>
              <p className="text-slate-600">{note.summary}</p>
              <p className="text-[11px] text-slate-500">
                Módulos:{' '}
                {note.modules
                  .map((m) => MODULE_OPTIONS.find((o) => o.id === m)?.label || m)
                  .join(' · ')}{' '}
                · Publicada: <span className="font-mono tabular-nums">{note.publishedAt}</span>
              </p>
            </div>

            {adminStatus.unlocked && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateNote(note.id, { active: !note.active })}
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  {note.active ? 'Ocultar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(note)}
                  className="rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={`Editar ${note.title}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteNote(note.id)}
                  className="rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  aria-label={`Eliminar ${note.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
