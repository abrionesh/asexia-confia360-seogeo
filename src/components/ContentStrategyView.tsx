import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import type { EditorialArticle, ProjectWorkspace, UserRole } from '../types';

interface Props {
  project: ProjectWorkspace;
  activeRole: UserRole;
  onGenerateArticle: (payload: {
    topic: string;
    intentType: EditorialArticle['intentType'];
    clusterId?: string;
  }) => Promise<void>;
  onTransitionArticle: (
    articleId: string,
    nextStatus: EditorialArticle['status'],
    scheduledFor?: string
  ) => Promise<void>;
}

export const ContentStrategyView: React.FC<Props> = ({
  project,
  activeRole,
  onGenerateArticle,
  onTransitionArticle,
}) => {
  const [tab, setTab] = useState<'studio' | 'strategy'>('studio');
  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    project.articles[0]?.id || ''
  );
  const [newTopic, setNewTopic] = useState('');
  const [intentType, setIntentType] =
    useState<EditorialArticle['intentType']>('GEO Conversacional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeArticle =
    project.articles.find((a) => a.id === selectedArticleId) || project.articles[0];

  const canApprove = activeRole !== 'Especialista SEO';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setError(null);
    setIsGenerating(true);
    try {
      await onGenerateArticle({ topic: newTopic.trim(), intentType });
      setNewTopic('');
      setTab('studio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el borrador.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTransition = async (
    articleId: string,
    nextStatus: EditorialArticle['status']
  ) => {
    setError(null);
    setIsTransitioning(true);
    try {
      await onTransitionArticle(
        articleId,
        nextStatus,
        nextStatus === 'Aprobado y Programado' ? '2026-11-27 10:00' : undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando el estado.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCopyJsonLd = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Flujo editorial: IA redacta con BrandProfile → Revisión automática → Aprobación humana → Publicación
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Estrategia de Contenidos 90 Días y Estudio Editorial
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('studio')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              tab === 'studio'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estudio y Aprobación ({project.articles.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('strategy')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              tab === 'strategy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clústeres SEO vs GEO ({project.clusters.length})
          </button>
        </div>
      </div>

      {/* Generador asistido por IA con control de BrandProfile */}
      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        <input
          type="text"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="Tema o pregunta objetivo, ej. ¿Cuánto cuesta implantar CRM y SEO local en una pyme?"
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
        />
        <select
          value={intentType}
          onChange={(e) => setIntentType(e.target.value as EditorialArticle['intentType'])}
          aria-label="Objetivo del contenido"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
        >
          <option value="GEO Conversacional">Objetivo: Cita en IAs (GEO)</option>
          <option value="Google Local">Objetivo: Posicionamiento Google Local</option>
          <option value="Comparativa">Objetivo: Comparativa comercial</option>
          <option value="Caso de Éxito">Objetivo: Caso de éxito verificable</option>
        </select>
        <button
          type="submit"
          disabled={isGenerating || !newTopic.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Redactando borrador seguro...</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              <span>Generar borrador para revisión</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {tab === 'strategy' ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Mapa de Clústeres Temáticos: Google SEO vs Visibilidad GEO en IAs
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Distingue los contenidos orientados a posicionarse en Google de las guías estructuradas para ser recomendadas por modelos IA.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Página pilar / Clúster</th>
                  <th className="px-4 py-3 font-medium">Canal objetivo</th>
                  <th className="px-4 py-3 font-medium">Objetivo negocio</th>
                  <th className="px-4 py-3 font-medium text-right">Dificultad</th>
                  <th className="px-4 py-3 font-medium text-right">Vol. est.</th>
                  <th className="px-4 py-3 font-medium">Responsable</th>
                  <th className="px-4 py-3 font-medium">Entrega</th>
                  <th className="px-6 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project.clusters.map((cl) => (
                  <tr key={cl.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-medium text-slate-900 max-w-xs">
                      {cl.pillarTitle}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{cl.intentScope}</td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {cl.commercialGoal} · Potencial {cl.leadPotential}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                      {cl.difficulty}/100
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                      {cl.estimatedVolume.toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{cl.owner}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 tabular-nums">
                      {cl.dueDate}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => {
                          setNewTopic(cl.pillarTitle);
                          setIntentType(
                            cl.intentScope === 'GEO IA'
                              ? 'GEO Conversacional'
                              : 'Google Local'
                          );
                        }}
                        className="font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
                      >
                        Preparar borrador →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Cola de artículos */}
          <div className="rounded-xl border border-slate-200 bg-white lg:col-span-4 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">Cola de Revisión Editorial</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {project.articles.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Genera tu primer borrador arriba para iniciar el flujo de aprobación humana.
                </div>
              ) : (
                project.articles.map((art) => {
                  const isSelected = activeArticle?.id === art.id;
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => setSelectedArticleId(art.id)}
                      className={`w-full text-left px-5 py-4 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{art.intentType}</span>
                        <span
                          className={`font-medium ${
                            art.status === 'Publicado' || art.status === 'Aprobado y Programado'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {art.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900 line-clamp-2">
                        {art.title}
                      </p>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {art.authorHuman} · Originalidad {art.originalityScore}%
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Inspector de Borrador, JSON-LD y Aprobación */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
            {activeArticle ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{activeArticle.intentType}</span>
                      <span>·</span>
                      <span>Modelo: {activeArticle.aiModel}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">
                        Originalidad {activeArticle.originalityScore}%
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-xl font-bold text-slate-900">
                      {activeArticle.title}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-slate-500">{activeArticle.url}</p>
                  </div>

                  {canApprove && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {activeArticle.status !== 'Borrador IA' && (
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={() =>
                            handleTransition(activeArticle.id, 'Revisión Automática')
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          Solicitar cambios
                        </button>
                      )}
                      {activeArticle.status !== 'Aprobado y Programado' &&
                        activeArticle.status !== 'Publicado' && (
                          <button
                            type="button"
                            disabled={isTransitioning}
                            onClick={() =>
                              handleTransition(activeArticle.id, 'Aprobado y Programado')
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Aprobar y programar</span>
                          </button>
                        )}
                      {activeArticle.status === 'Aprobado y Programado' && (
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={() => handleTransition(activeArticle.id, 'Publicado')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Publicar ahora</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Bloque de control editorial y cumplimiento */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" />
                      <span>Verificación RGPD y Tono de Marca</span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Estado actual: <strong>{activeArticle.status}</strong>
                      {activeArticle.reviewedBy ? ` · Revisado por ${activeArticle.reviewedBy}` : ''}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          activeArticle.sensitiveClaimFlag ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      />
                      <span>
                        {activeArticle.sensitiveClaimFlag
                          ? 'Contiene cifras/datos sensibles · Revisión humana obligatoria'
                          : 'Sin afirmaciones legales, médicas o financieras sensibles'}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Proyección: ~{activeArticle.estimatedLeadsMonth} leads/mes
                    </p>
                  </div>
                </div>

                {/* Metadatos SEO */}
                <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700">Meta Título: </span>
                    <span className="text-slate-900">{activeArticle.metaTitle}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Meta Descripción: </span>
                    <span className="text-slate-600">{activeArticle.metaDescription}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Alt Text Imagen sugerida: </span>
                    <span className="text-slate-600">{activeArticle.imageSuggestion.altText}</span>
                  </div>
                </div>

                {/* Estructura H2-H3 */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Estructura del borrador y FAQ</span>
                  </h3>
                  {activeArticle.sections.map((sec, idx) => (
                    <div key={idx} className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-900">
                        <span className="mr-2 font-mono text-xs text-slate-400">{sec.level}</span>
                        {sec.heading}
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-600">{sec.body}</p>
                    </div>
                  ))}
                  {activeArticle.faq.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <h4 className="text-xs font-semibold text-slate-700">
                        Preguntas frecuentes (optimizadas para citas IA)
                      </h4>
                      {activeArticle.faq.map((f, i) => (
                        <div key={i} className="rounded-lg bg-slate-50 p-3 text-xs">
                          <p className="font-semibold text-slate-900">{f.question}</p>
                          <p className="mt-1 text-slate-600">{f.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Datos Estructurados JSON-LD y Fuentes */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between pb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <Code2 className="h-3.5 w-3.5 text-blue-700" />
                        JSON-LD ({activeArticle.jsonLdType})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyJsonLd(activeArticle.jsonLdCode)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedJson ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                    <pre className="max-h-40 overflow-auto rounded bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
                      {activeArticle.jsonLdCode}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4 text-xs space-y-3">
                    <div>
                      <span className="font-semibold text-slate-800">Fuentes verificadas</span>
                      <ul className="mt-1.5 space-y-1 text-slate-600">
                        {activeArticle.sources.map((s, idx) => (
                          <li key={idx}>
                            • {s.title} ({s.url})
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Enlaces internos sugeridos</span>
                      <p className="mt-1 font-mono text-[11px] text-blue-700">
                        {activeArticle.internalLinks.join('  ·  ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Selecciona un artículo para revisar sus metadatos, JSON-LD y fuentes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
