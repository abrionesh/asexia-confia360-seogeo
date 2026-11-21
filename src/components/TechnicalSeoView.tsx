import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import type { ProjectWorkspace, TechnicalIssue } from '../types';

interface Props {
  project: ProjectWorkspace;
  onUpdateStatus: (issueId: string, status: TechnicalIssue['status']) => Promise<void>;
}

export const TechnicalSeoView: React.FC<Props> = ({ project, onUpdateStatus }) => {
  const [impactFilter, setImpactFilter] = useState<'Todos' | 'Alto' | 'Medio'>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | TechnicalIssue['status']>('Todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = project.technicalIssues.filter((issue) => {
    const matchImpact = impactFilter === 'Todos' || issue.impact === impactFilter;
    const matchStatus = statusFilter === 'Todos' || issue.status === statusFilter;
    return matchImpact && matchStatus;
  });

  const handleStatus = async (issueId: string, nextStatus: TechnicalIssue['status']) => {
    setUpdatingId(issueId);
    try {
      await onUpdateStatus(issueId, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = project.technicalIssues.filter((t) => t.status === 'Pendiente').length;
  const resolvedCount = project.technicalIssues.filter((t) => t.status === 'Resuelto').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Rastreo técnico continuo · Indexación · Core Web Vitals · Schema Markup · Canibalización
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            SEO Técnico y Auditoría Accionable
          </h1>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <span>
            Salud técnica:{' '}
            <strong className="font-mono text-slate-900 tabular-nums">
              {project.kpis.technicalHealthPct}%
            </strong>
          </span>
          <span>
            Pendientes:{' '}
            <strong className="font-mono text-amber-700 tabular-nums">{pendingCount}</strong>
          </span>
          <span>
            Resueltas:{' '}
            <strong className="font-mono text-emerald-700 tabular-nums">{resolvedCount}</strong>
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['Todos', 'Alto', 'Medio'] as const).map((imp) => (
            <button
              key={imp}
              type="button"
              onClick={() => setImpactFilter(imp)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                impactFilter === imp
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Impacto: {imp}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['Todos', 'Pendiente', 'En curso', 'Resuelto'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista accionable */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No hay incidencias técnicas con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((issue) => (
            <div
              key={issue.id}
              className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-800">{issue.category}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-600">{issue.url}</span>
                  <span>·</span>
                  <span>
                    Impacto{' '}
                    <strong
                      className={
                        issue.impact === 'Alto' ? 'text-rose-700' : 'text-amber-700'
                      }
                    >
                      {issue.impact}
                    </strong>{' '}
                    / Esfuerzo {issue.effort}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-slate-900">{issue.title}</h2>
                <p className="text-xs leading-relaxed text-slate-600">
                  <span className="font-medium text-slate-800">Corrección propuesta: </span>
                  {issue.recommendation}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 mr-2">
                  {issue.status === 'Resuelto' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : issue.status === 'En curso' ? (
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  {issue.status}
                </span>

                {issue.status !== 'En curso' && issue.status !== 'Resuelto' && (
                  <button
                    type="button"
                    disabled={updatingId === issue.id}
                    onClick={() => handleStatus(issue.id, 'En curso')}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Wrench className="h-3 w-3" />
                    <span>En curso</span>
                  </button>
                )}

                {issue.status !== 'Resuelto' && (
                  <button
                    type="button"
                    disabled={updatingId === issue.id}
                    onClick={() => handleStatus(issue.id, 'Resuelto')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                  >
                    Marcar resuelto
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
