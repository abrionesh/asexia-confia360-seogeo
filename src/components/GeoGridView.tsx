import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Compass, MapPin, Minus, Navigation, Star } from 'lucide-react';
import type { GeoGridNode, ProjectWorkspace } from '../types';

interface Props {
  project: ProjectWorkspace;
}

export const GeoGridView: React.FC<Props> = ({ project }) => {
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>(
    project.geoKeywords[0]?.id || ''
  );
  const [radiusOverride, setRadiusOverride] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'rank' | 'delta'>('rank');

  const activeTrack =
    project.geoKeywords.find((k) => k.id === selectedKeywordId) || project.geoKeywords[0];

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    activeTrack?.nodes[Math.floor((activeTrack?.nodes.length || 1) / 2)]?.id || ''
  );

  const selectedNode: GeoGridNode | undefined = useMemo(() => {
    if (!activeTrack) return undefined;
    return (
      activeTrack.nodes.find((n) => n.id === selectedNodeId) ||
      activeTrack.nodes[Math.floor(activeTrack.nodes.length / 2)]
    );
  }, [activeTrack, selectedNodeId]);

  if (!activeTrack) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate-600">
          Aún no hay palabras clave geolocalizadas configuradas para este proyecto.
        </p>
      </div>
    );
  }

  const effectiveRadius = radiusOverride ?? activeTrack.radiusKm;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {activeTrack.sedeName} · {activeTrack.city} · {activeTrack.monthlySearches.toLocaleString('es-ES')} búsquedas/mes
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Mapa Geo-Grid de Posicionamiento Local
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeTrack.id}
            onChange={(e) => {
              setSelectedKeywordId(e.target.value);
              setRadiusOverride(null);
            }}
            aria-label="Seleccionar palabra clave local"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            {project.geoKeywords.map((kw) => (
              <option key={kw.id} value={kw.id}>
                {kw.keyword}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[3, 5, 8].map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setRadiusOverride(km)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  effectiveRadius === km
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('rank')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'rank'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ranking actual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('delta')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'delta'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Variación
            </button>
          </div>
        </div>
      </div>

      {/* Métricas de la malla */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Posición media en malla</span>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            #{activeTrack.avgRank.toFixed(1)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Cobertura en Top 3</span>
          <p className="mt-1 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
            {activeTrack.top3Pct}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Índice de visibilidad local</span>
          <p className="mt-1 font-mono text-xl font-semibold text-blue-700 tabular-nums">
            {activeTrack.visibilityScore} / 100
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Resolución de malla</span>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {activeTrack.gridSize}×{activeTrack.gridSize} ({activeTrack.nodes.length} pts)
          </p>
        </div>
      </div>

      {/* Mapa Geo-Grid interactivo + Inspector lateral */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Compass className="h-4 w-4 text-blue-700" />
              <span>
                Haz clic en cualquier nodo para inspeccionar el Top 3 competidor en esa coordenada
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span>1–3: Top Local Pack</span>
              <span>4–10: Visible</span>
              <span>+10: Fuera de foco</span>
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-6">
            {/* Cartografía vectorial de referencia y anillos de radio */}
            <svg
              aria-hidden="true"
              viewBox="0 0 500 500"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
            >
              <defs>
                <pattern id="streetGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path
                    d="M 50 0 L 0 0 0 50"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="500" height="500" fill="url(#streetGrid)" />
              <path
                d="M 0 180 Q 250 140 500 220 M 140 0 Q 200 250 160 500 M 340 0 Q 320 260 390 500"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
              />
              <circle
                cx="250"
                cy="250"
                r="95"
                fill="none"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <circle
                cx="250"
                cy="250"
                r="185"
                fill="none"
                stroke="#cbd5e1"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            </svg>

            <div className="relative z-10 flex items-center justify-between pb-3 text-[11px] font-mono text-slate-500">
              <span>Radio analizado: {effectiveRadius} km</span>
              <span>Centro: {activeTrack.city}</span>
            </div>

            <div
              className="relative z-10 grid gap-3 sm:gap-4 py-2"
              style={{
                gridTemplateColumns: `repeat(${activeTrack.gridSize}, minmax(0, 1fr))`,
              }}
            >
              {activeTrack.nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const delta = node.previousRank - node.rank; // positivo = mejoró
                const tone =
                  viewMode === 'rank'
                    ? node.rank <= 3
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : node.rank <= 10
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-rose-600 text-white border-rose-700'
                    : delta > 0
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : delta === 0
                        ? 'bg-slate-600 text-white border-slate-700'
                        : 'bg-rose-600 text-white border-rose-700';

                return (
                  <div key={node.id} className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border font-mono text-xs font-semibold tabular-nums transition-transform hover:scale-110 ${tone} ${
                        isSelected ? 'ring-4 ring-blue-600/35 scale-110' : ''
                      }`}
                    >
                      {viewMode === 'rank'
                        ? node.rank
                        : delta > 0
                          ? `+${delta}`
                          : delta === 0
                            ? '0'
                            : delta}
                    </button>
                    <span className="hidden sm:block max-w-[76px] truncate text-[10px] text-slate-600">
                      {node.postalCode}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Inspector de Coordenada */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 flex flex-col justify-between">
          {selectedNode ? (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Nodo seleccionado · CP {selectedNode.postalCode}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {selectedNode.lat}, {selectedNode.lng}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {selectedNode.zoneName}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-xs text-slate-500">Tu posición actual</span>
                  <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                    #{selectedNode.rank}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-xs text-slate-500">Vs. periodo anterior</span>
                  <div className="mt-1 flex items-center gap-1 font-mono text-lg font-semibold tabular-nums">
                    {selectedNode.previousRank - selectedNode.rank > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ArrowUpRight className="h-4 w-4" />+
                        {selectedNode.previousRank - selectedNode.rank} puestos
                      </span>
                    ) : selectedNode.previousRank - selectedNode.rank < 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <ArrowDownRight className="h-4 w-4" />
                        {selectedNode.previousRank - selectedNode.rank} puestos
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Minus className="h-4 w-4" /> Sin cambios
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Top 3 en Google Maps en este punto exacto
                </h3>
                <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {selectedNode.topCompetitors.map((comp) => (
                    <div
                      key={`${comp.rank}-${comp.name}`}
                      className="flex items-center justify-between px-4 py-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono font-semibold text-slate-700 tabular-nums">
                          #{comp.rank}
                        </span>
                        <span
                          className={`truncate font-medium ${
                            comp.name.includes('Tu negocio') ? 'text-blue-700' : 'text-slate-800'
                          }`}
                        >
                          {comp.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-slate-600 shrink-0 tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{comp.rating.toFixed(1)}</span>
                        <span className="text-slate-400">({comp.reviews})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Navigation className="h-3.5 w-3.5 text-blue-700" />
                  <span>Acción local recomendada para {selectedNode.zoneName}</span>
                </div>
                <p className="mt-1.5 leading-relaxed text-slate-600">
                  {selectedNode.rank <= 3
                    ? `Mantén la ventaja en CP ${selectedNode.postalCode} respondiendo reseñas en menos de 48 h y publicando actualizaciones semanales en Google Business Profile.`
                    : `Para entrar al Top 3 en CP ${selectedNode.postalCode}, refuerza una landing específica con schema LocalBusiness (areaServed: ${selectedNode.postalCode}) y consigue 2 menciones en prensa o directorios locales.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              <MapPin className="mr-2 h-4 w-4" /> Selecciona un nodo en la malla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
