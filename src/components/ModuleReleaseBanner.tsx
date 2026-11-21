import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Sparkles, X } from 'lucide-react';
import type { ModuleReleaseNote, NavSection } from '../types';

interface Props {
  section: NavSection;
  releaseNotes: ModuleReleaseNote[];
  dismissedIds: string[];
  onDismissNote: (noteId: string, reset?: boolean) => Promise<void>;
  onOpenTutor: () => void;
}

export const ModuleReleaseBanner: React.FC<Props> = ({
  section,
  releaseNotes,
  dismissedIds,
  onDismissNote,
  onOpenTutor,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showArchivedForModule, setShowArchivedForModule] = useState(false);

  const moduleNotes = (releaseNotes || []).filter(
    (n) => n.active && n.modules.includes(section)
  );
  if (moduleNotes.length === 0) return null;

  const unreadNotes = moduleNotes.filter((n) => !dismissedIds.includes(n.id));
  const visibleNotes = showArchivedForModule ? moduleNotes : unreadNotes;

  if (visibleNotes.length === 0) {
    return (
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowArchivedForModule(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-700" />
          <span className="tabular-nums">Novedades en este módulo ({moduleNotes.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-2.5">
      {showArchivedForModule && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando todas las notas informativas de este módulo</span>
          <button
            type="button"
            onClick={() => setShowArchivedForModule(false)}
            className="font-medium text-blue-700 hover:text-blue-800"
          >
            Ocultar ya leídas
          </button>
        </div>
      )}

      {visibleNotes.map((note) => {
        const isExpanded = expandedId === note.id;
        const isDismissed = dismissedIds.includes(note.id);
        return (
          <div
            key={note.id}
            className="rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs"
          >
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2.5 min-w-0">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-blue-800">
                      {note.version}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-900">{note.title}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {note.publishedAt}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{note.summary}</p>
                  {isExpanded && (
                    <p className="mt-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-slate-700 leading-relaxed">
                      {note.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-50 whitespace-nowrap"
                >
                  <span>{isExpanded ? 'Menos' : 'Cómo usar'}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onOpenTutor}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <HelpCircle className="h-3 w-3 text-blue-700" />
                  <span>Explicar con voz</span>
                </button>
                {!isDismissed && (
                  <button
                    type="button"
                    onClick={() => onDismissNote(note.id, false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                    title="Marcar novedad como leída"
                  >
                    <X className="h-3 w-3" />
                    <span>Entendido</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
