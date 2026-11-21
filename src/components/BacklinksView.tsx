import React, { useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import type { BacklinkProspect, ProjectWorkspace } from '../types';

interface Props {
  project: ProjectWorkspace;
  onOutreachAction: (
    prospectId: string,
    action: 'generate' | 'status',
    nextStatus?: BacklinkProspect['status']
  ) => Promise<void>;
}

export const BacklinksView: React.FC<Props> = ({ project, onOutreachAction }) => {
  const [selectedId, setSelectedId] = useState<string>(project.backlinks[0]?.id || '');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = project.backlinks.find((b) => b.id === selectedId) || project.backlinks[0];

  const handleAction = async (
    prospectId: string,
    action: 'generate' | 'status',
    nextStatus?: BacklinkProspect['status']
  ) => {
    setError(null);
    setBusyId(prospectId);
    try {
      await onOutreachAction(prospectId, action, nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando outreach ético.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Prospección auditada de prensa local, asociaciones y Digital PR · Cero redes opacas ni compra masiva
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Backlinks y Autoridad Ética
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Spam Score máximo permitido: &le; 5/100</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tabla de prospectos */}
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Medio / Dominio</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium text-right">Relevancia</th>
                  <th className="px-4 py-3 font-medium text-right">Tráfico est.</th>
                  <th className="px-4 py-3 font-medium text-right">Spam</th>
                  <th className="px-5 py-3 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project.backlinks.map((bl) => (
                  <tr
                    key={bl.id}
                    onClick={() => setSelectedId(bl.id)}
                    className={`cursor-pointer transition-colors ${
                      selected?.id === bl.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                      {bl.domain}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{bl.category}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-blue-700 tabular-nums">
                      {bl.relevanceScore}/100
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                      {bl.estimatedTraffic.toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-700 tabular-nums">
                      {bl.spamScore}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                      {bl.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspector y generador de outreach */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          {selected ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-medium text-slate-500">
                  {selected.category} · Estado: {selected.status}
                </span>
                <h2 className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {selected.domain}
                </h2>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-700">
                  Justificación editorial obligatoria
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {selected.editorialJustification}
                </p>
              </div>

              <div className="text-xs">
                <span className="font-semibold text-slate-700">Anchor text natural sugerido: </span>
                <span className="font-mono text-slate-800">{selected.anchorSuggestion}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handleAction(selected.id, 'generate')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {busyId === selected.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Redactando propuesta...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-3.5 w-3.5" />
                      <span>Generar outreach personalizado</span>
                    </>
                  )}
                </button>

                <select
                  value={selected.status}
                  onChange={(e) =>
                    handleAction(
                      selected.id,
                      'status',
                      e.target.value as BacklinkProspect['status']
                    )
                  }
                  aria-label="Cambiar estado de prospecto"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                >
                  <option value="Prospecto">Prospecto</option>
                  <option value="Outreach Enviado">Outreach Enviado</option>
                  <option value="Negociación">Negociación</option>
                  <option value="Conseguido">Conseguido</option>
                  <option value="Descartado">Descartado</option>
                </select>
              </div>

              {selected.outreachDraft && (
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-slate-700">
                    Borrador de propuesta Digital PR (revisar antes de enviar)
                  </h3>
                  <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {selected.outreachDraft}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Selecciona un medio para ver el análisis.</p>
          )}
        </div>
      </div>
    </div>
  );
};
