import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BarChart3, Award, MessageSquare, MapPin } from 'lucide-react';
import type { ReputationCompetitorBenchmark, ReputationKpiPoint } from '../types';

interface Props {
  companyName: string;
  city: string;
  timeline: ReputationKpiPoint[];
  competitors: ReputationCompetitorBenchmark[];
}

type ChartMode = 'combined' | 'grid' | 'competitors';

function useElementWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 120) setWidth(w);
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);

  return width;
}

export const ReputationKpiD3Panel: React.FC<Props> = ({
  companyName,
  city,
  timeline,
  competitors,
}) => {
  const [range, setRange] = useState<'6m' | '12m'>('12m');
  const [mode, setMode] = useState<ChartMode>('combined');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredCompBar, setHoveredCompBar] = useState<{
    name: string;
    metric: string;
    value: string;
  } | null>(null);

  const combinedRef = useRef<HTMLDivElement | null>(null);
  const ratingRef = useRef<HTMLDivElement | null>(null);
  const responseRef = useRef<HTMLDivElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const compRef = useRef<HTMLDivElement | null>(null);

  const combinedWidth = useElementWidth(combinedRef);
  const ratingWidth = useElementWidth(ratingRef);
  const responseWidth = useElementWidth(responseRef);
  const shareWidth = useElementWidth(shareRef);
  const compWidth = useElementWidth(compRef);

  const visibleData = useMemo(
    () => (range === '6m' ? timeline.slice(-6) : timeline),
    [timeline, range]
  );

  const latest = visibleData[visibleData.length - 1] || {
    period: 'Nov 26',
    avgRating: 4.8,
    competitorAvgRating: 4.4,
    responseRatePct: 96,
    mapsVisibilitySharePct: 38,
    competitorTopSharePct: 22,
    reviewsCount: 131,
  };
  const first = visibleData[0] || latest;

  const activeHoverPoint =
    hoveredIdx !== null && visibleData[hoveredIdx] ? visibleData[hoveredIdx] : latest;

  const benchmarkRows = useMemo(
    () => [
      {
        id: 'self',
        name: `${companyName} (Tu negocio)`,
        isSelf: true,
        avgRating: latest.avgRating,
        reviewsCount: latest.reviewsCount,
        responseRatePct: latest.responseRatePct,
        mapsSharePct: latest.mapsVisibilitySharePct,
      },
      ...competitors.map((c) => ({ ...c, isSelf: false })),
    ],
    [companyName, latest, competitors]
  );

  // D3 Render: Mode 1 — Combined Dual-Axis Temporal Chart
  useEffect(() => {
    if (mode !== 'combined') return;
    const container = combinedRef.current;
    if (!container || visibleData.length === 0) return;

    const svgEl = d3.select(container).select<SVGSVGElement>('svg');
    svgEl.selectAll('*').remove();

    const width = Math.max(320, combinedWidth);
    const height = 300;
    const margin = { top: 20, right: 52, bottom: 32, left: 46 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svgEl.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint<string>()
      .domain(visibleData.map((d) => d.period))
      .range([0, innerW])
      .padding(0.25);

    const yPct = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);
    const yStar = d3.scaleLinear().domain([3.5, 5.0]).range([innerH, 0]);

    // Gridlines
    g.append('g')
      .selectAll('line')
      .data(yPct.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yPct(d))
      .attr('y2', (d) => yPct(d))
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3,3');

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
      .call((axis) => axis.select('.domain').attr('stroke', '#CBD5E1'))
      .selectAll('text')
      .attr('fill', '#64748B')
      .style('font-size', '11px')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // Left Y Axis (%)
    g.append('g')
      .call(
        d3
          .axisLeft(yPct)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      )
      .call((axis) => axis.select('.domain').remove())
      .call((axis) => axis.selectAll('.tick line').remove())
      .selectAll('text')
      .attr('fill', '#64748B')
      .style('font-size', '11px')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // Right Y Axis (★)
    g.append('g')
      .attr('transform', `translate(${innerW},0)`)
      .call(
        d3
          .axisRight(yStar)
          .ticks(4)
          .tickFormat((d) => `${Number(d).toFixed(1)}★`)
      )
      .call((axis) => axis.select('.domain').remove())
      .call((axis) => axis.selectAll('.tick line').remove())
      .selectAll('text')
      .attr('fill', '#B45309')
      .style('font-size', '11px')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // Area under Maps Visibility Share
    const shareArea = d3
      .area<ReputationKpiPoint>()
      .x((d) => x(d.period) ?? 0)
      .y0(innerH)
      .y1((d) => yPct(d.mapsVisibilitySharePct))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(visibleData)
      .attr('fill', 'rgba(29, 78, 216, 0.08)')
      .attr('d', shareArea);

    const drawLine = (
      accessor: (d: ReputationKpiPoint) => number,
      scaleY: d3.ScaleLinear<number, number>,
      stroke: string,
      strokeWidth: number,
      dashed = false
    ) => {
      const lineGen = d3
        .line<ReputationKpiPoint>()
        .x((d) => x(d.period) ?? 0)
        .y((d) => scaleY(accessor(d)))
        .curve(d3.curveMonotoneX);

      const path = g
        .append('path')
        .datum(visibleData)
        .attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth)
        .attr('d', lineGen);

      if (dashed) {
        path.attr('stroke-dasharray', '5,4');
      }
    };

    // Lines
    drawLine((d) => d.competitorTopSharePct, yPct, '#94A3B8', 1.75, true);
    drawLine((d) => d.mapsVisibilitySharePct, yPct, '#1D4ED8', 2.5);
    drawLine((d) => d.responseRatePct, yPct, '#059669', 2.25);
    drawLine((d) => d.avgRating, yStar, '#D97706', 2.5);

    // Interactive crosshair + dots
    const focusGroup = g.append('g').style('display', hoveredIdx === null ? 'none' : 'inline');

    const focusLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#94A3B8')
      .attr('stroke-dasharray', '2,2');

    const dotSpecs = [
      { key: 'maps', color: '#1D4ED8', yVal: (d: ReputationKpiPoint) => yPct(d.mapsVisibilitySharePct) },
      { key: 'resp', color: '#059669', yVal: (d: ReputationKpiPoint) => yPct(d.responseRatePct) },
      { key: 'star', color: '#D97706', yVal: (d: ReputationKpiPoint) => yStar(d.avgRating) },
    ];

    const dots = dotSpecs.map((spec) =>
      focusGroup
        .append('circle')
        .attr('r', 4.5)
        .attr('fill', spec.color)
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 2)
    );

    if (hoveredIdx !== null && visibleData[hoveredIdx]) {
      const pt = visibleData[hoveredIdx];
      const cx = x(pt.period) ?? 0;
      focusLine.attr('x1', cx).attr('x2', cx);
      dotSpecs.forEach((spec, i) => {
        dots[i].attr('cx', cx).attr('cy', spec.yVal(pt));
      });
    }

    // Static point markers on lines for crisp readability
    g.selectAll('.dot-maps')
      .data(visibleData)
      .join('circle')
      .attr('cx', (d) => x(d.period) ?? 0)
      .attr('cy', (d) => yPct(d.mapsVisibilitySharePct))
      .attr('r', 2.8)
      .attr('fill', '#1D4ED8');

    g.selectAll('.dot-star')
      .data(visibleData)
      .join('circle')
      .attr('cx', (d) => x(d.period) ?? 0)
      .attr('cy', (d) => yStar(d.avgRating))
      .attr('r', 2.8)
      .attr('fill', '#D97706');

    // Invisible hover zones per period
    const step = innerW / Math.max(1, visibleData.length);
    g.selectAll('.hover-band')
      .data(visibleData)
      .join('rect')
      .attr('x', (d) => (x(d.period) ?? 0) - step / 2)
      .attr('y', 0)
      .attr('width', step)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseenter', (_ev, d) => {
        const idx = visibleData.findIndex((p) => p.period === d.period);
        if (idx >= 0) setHoveredIdx(idx);
      })
      .on('mouseleave', () => setHoveredIdx(null));
  }, [mode, visibleData, combinedWidth, hoveredIdx]);

  // D3 Render: Mode 2 — Three Separate Mini D3 Charts
  useEffect(() => {
    if (mode !== 'grid' || visibleData.length === 0) return;

    const renderMiniChart = (
      ref: React.RefObject<HTMLDivElement | null>,
      containerW: number,
      domain: [number, number],
      formatTick: (n: number) => string,
      primaryAccessor: (d: ReputationKpiPoint) => number,
      primaryColor: string,
      areaFill: string,
      secondaryAccessor?: (d: ReputationKpiPoint) => number,
      constantThreshold?: number
    ) => {
      const container = ref.current;
      if (!container) return;
      const svgEl = d3.select(container).select<SVGSVGElement>('svg');
      svgEl.selectAll('*').remove();

      const width = Math.max(240, containerW);
      const height = 190;
      const margin = { top: 14, right: 16, bottom: 26, left: 40 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      svgEl.attr('viewBox', `0 0 ${width} ${height}`);
      const g = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scalePoint<string>()
        .domain(visibleData.map((d) => d.period))
        .range([0, innerW])
        .padding(0.2);

      const y = d3.scaleLinear().domain(domain).range([innerH, 0]);

      g.append('g')
        .selectAll('line')
        .data(y.ticks(4))
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => y(d))
        .attr('y2', (d) => y(d))
        .attr('stroke', '#E2E8F0')
        .attr('stroke-dasharray', '2,2');

      const tickPeriods =
        visibleData.length > 6
          ? visibleData.filter((_, i) => i % 2 === 0 || i === visibleData.length - 1).map((d) => d.period)
          : visibleData.map((d) => d.period);

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(tickPeriods).tickSize(0).tickPadding(8))
        .call((a) => a.select('.domain').attr('stroke', '#CBD5E1'))
        .selectAll('text')
        .attr('fill', '#64748B')
        .style('font-size', '10px')
        .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(4)
            .tickFormat((d) => formatTick(Number(d)))
        )
        .call((a) => a.select('.domain').remove())
        .call((a) => a.selectAll('.tick line').remove())
        .selectAll('text')
        .attr('fill', '#64748B')
        .style('font-size', '10px')
        .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

      if (constantThreshold !== undefined) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerW)
          .attr('y1', y(constantThreshold))
          .attr('y2', y(constantThreshold))
          .attr('stroke', '#94A3B8')
          .attr('stroke-dasharray', '4,3')
          .attr('stroke-width', 1.25);
      }

      const area = d3
        .area<ReputationKpiPoint>()
        .x((d) => x(d.period) ?? 0)
        .y0(innerH)
        .y1((d) => y(primaryAccessor(d)))
        .curve(d3.curveMonotoneX);

      g.append('path').datum(visibleData).attr('fill', areaFill).attr('d', area);

      if (secondaryAccessor) {
        const secLine = d3
          .line<ReputationKpiPoint>()
          .x((d) => x(d.period) ?? 0)
          .y((d) => y(secondaryAccessor(d)))
          .curve(d3.curveMonotoneX);
        g.append('path')
          .datum(visibleData)
          .attr('fill', 'none')
          .attr('stroke', '#94A3B8')
          .attr('stroke-width', 1.6)
          .attr('stroke-dasharray', '4,3')
          .attr('d', secLine);
      }

      const priLine = d3
        .line<ReputationKpiPoint>()
        .x((d) => x(d.period) ?? 0)
        .y((d) => y(primaryAccessor(d)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(visibleData)
        .attr('fill', 'none')
        .attr('stroke', primaryColor)
        .attr('stroke-width', 2.4)
        .attr('d', priLine);

      g.selectAll('.pt')
        .data(visibleData)
        .join('circle')
        .attr('cx', (d) => x(d.period) ?? 0)
        .attr('cy', (d) => y(primaryAccessor(d)))
        .attr('r', (d) =>
          hoveredIdx !== null && visibleData[hoveredIdx]?.period === d.period ? 4.5 : 2.5
        )
        .attr('fill', primaryColor)
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 1.5);

      const step = innerW / Math.max(1, visibleData.length);
      g.selectAll('.hover-band')
        .data(visibleData)
        .join('rect')
        .attr('x', (d) => (x(d.period) ?? 0) - step / 2)
        .attr('y', 0)
        .attr('width', step)
        .attr('height', innerH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mouseenter', (_ev, d) => {
          const idx = visibleData.findIndex((p) => p.period === d.period);
          if (idx >= 0) setHoveredIdx(idx);
        })
        .on('mouseleave', () => setHoveredIdx(null));
    };

    renderMiniChart(
      ratingRef,
      ratingWidth,
      [3.8, 5.0],
      (v) => `${v.toFixed(1)}★`,
      (d) => d.avgRating,
      '#D97706',
      'rgba(217, 119, 6, 0.10)',
      (d) => d.competitorAvgRating
    );

    renderMiniChart(
      responseRef,
      responseWidth,
      [0, 100],
      (v) => `${v}%`,
      (d) => d.responseRatePct,
      '#059669',
      'rgba(5, 150, 105, 0.10)',
      undefined,
      90
    );

    renderMiniChart(
      shareRef,
      shareWidth,
      [0, 55],
      (v) => `${v}%`,
      (d) => d.mapsVisibilitySharePct,
      '#1D4ED8',
      'rgba(29, 78, 216, 0.10)',
      (d) => d.competitorTopSharePct
    );
  }, [mode, visibleData, ratingWidth, responseWidth, shareWidth, hoveredIdx]);

  // D3 Render: Mode 3 — Competitor Grouped Comparison Bar Chart
  useEffect(() => {
    if (mode !== 'competitors') return;
    const container = compRef.current;
    if (!container || benchmarkRows.length === 0) return;

    const svgEl = d3.select(container).select<SVGSVGElement>('svg');
    svgEl.selectAll('*').remove();

    const width = Math.max(320, compWidth);
    const height = 290;
    const margin = { top: 20, right: 20, bottom: 38, left: 46 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svgEl.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3
      .scaleBand<string>()
      .domain(benchmarkRows.map((b) => b.name))
      .range([0, innerW])
      .paddingInner(0.24);

    const metrics = ['Cuota Maps %', 'Tasa Respuesta %', 'Nota (escala 100)'] as const;
    const x1 = d3
      .scaleBand<string>()
      .domain([...metrics])
      .range([0, x0.bandwidth()])
      .padding(0.12);

    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    const colorMap: Record<(typeof metrics)[number], string> = {
      'Cuota Maps %': '#1D4ED8',
      'Tasa Respuesta %': '#059669',
      'Nota (escala 100)': '#D97706',
    };

    g.append('g')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3,3');

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickSize(0).tickPadding(10))
      .call((a) => a.select('.domain').attr('stroke', '#CBD5E1'))
      .selectAll('text')
      .attr('fill', (d) => (String(d).includes('(Tu negocio)') ? '#1D4ED8' : '#475569'))
      .style('font-weight', (d) => (String(d).includes('(Tu negocio)') ? '600' : '500'))
      .style('font-size', '11px');

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => `${d}%`)
      )
      .call((a) => a.select('.domain').remove())
      .call((a) => a.selectAll('.tick line').remove())
      .selectAll('text')
      .attr('fill', '#64748B')
      .style('font-size', '11px')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    const groups = g
      .selectAll('.comp-group')
      .data(benchmarkRows)
      .join('g')
      .attr('transform', (d) => `translate(${x0(d.name) ?? 0},0)`);

    groups
      .selectAll('rect')
      .data((row) => [
        {
          name: row.name,
          metric: 'Cuota Maps %' as const,
          val: row.mapsSharePct,
          label: `${row.mapsSharePct}%`,
        },
        {
          name: row.name,
          metric: 'Tasa Respuesta %' as const,
          val: row.responseRatePct,
          label: `${row.responseRatePct}%`,
        },
        {
          name: row.name,
          metric: 'Nota (escala 100)' as const,
          val: Math.round((row.avgRating / 5) * 100),
          label: `${row.avgRating.toFixed(1)}★`,
        },
      ])
      .join('rect')
      .attr('x', (d) => x1(d.metric) ?? 0)
      .attr('y', (d) => y(d.val))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => innerH - y(d.val))
      .attr('rx', 4)
      .attr('fill', (d) => colorMap[d.metric])
      .attr('opacity', (d) => (d.name.includes('(Tu negocio)') ? 1 : 0.72))
      .style('cursor', 'pointer')
      .on('mouseenter', (_ev, d) =>
        setHoveredCompBar({ name: d.name, metric: d.metric, value: d.label })
      )
      .on('mouseleave', () => setHoveredCompBar(null));
  }, [mode, benchmarkRows, compWidth]);

  const ratingDelta = (latest.avgRating - first.avgRating).toFixed(1);
  const responseDelta = latest.responseRatePct - first.responseRatePct;
  const shareDelta = latest.mapsVisibilitySharePct - first.mapsVisibilitySharePct;

  return (
    <div className="space-y-6">
      {/* Cabecera de controles D3 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <BarChart3 className="h-4 w-4 text-blue-700" />
              <span>KPIs de Reputación frente a Competidores ({city})</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Visualización interactiva con D3.js · Nota media, tasa de respuesta y cuota de visibilidad en Google Maps
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de modo visual D3 */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'combined', label: 'Combinada + Tabla' },
                  { id: 'grid', label: '3 Gráficas D3' },
                  { id: 'competitors', label: 'Vs Competidores' },
                ] as { id: ChartMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    mode === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Selector 6M / 12M */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['6m', '12m'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    range === r
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === '6m' ? '6 meses' : '12 meses'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lectura numérica en vivo (sincronizada con el cursor en D3) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between text-slate-500">
              <span>Nota Media · {activeHoverPoint.period}</span>
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                {activeHoverPoint.avgRating.toFixed(1)}★
              </span>
              <span className="font-mono text-xs font-medium text-emerald-700 tabular-nums">
                +{ratingDelta}★ vs inicio · Comp: {activeHoverPoint.competitorAvgRating.toFixed(1)}★
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between text-slate-500">
              <span>Tasa de Respuesta · {activeHoverPoint.period}</span>
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                {activeHoverPoint.responseRatePct}%
              </span>
              <span className="font-mono text-xs font-medium text-emerald-700 tabular-nums">
                +{responseDelta} pts · Meta SLA ≥90%
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between text-slate-500">
              <span>Cuota Visibilidad Maps · {activeHoverPoint.period}</span>
              <MapPin className="h-4 w-4 text-blue-700" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                {activeHoverPoint.mapsVisibilitySharePct}%
              </span>
              <span className="font-mono text-xs font-medium text-blue-700 tabular-nums">
                +{shareDelta} pts · Líder rival: {activeHoverPoint.competitorTopSharePct}%
              </span>
            </div>
          </div>
        </div>

        {/* Render según modo seleccionado */}
        {mode === 'combined' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-700" />
                Cuota Visibilidad Google Maps (%)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                Tasa de Respuesta (%)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-amber-600" />
                Nota Media (★ eje derecho)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
                Cuota Líder Competidor (%)
              </span>
            </div>

            <div ref={combinedRef} className="w-full overflow-hidden">
              <svg className="w-full h-[300px]" aria-label="Evolución KPIs de Reputación D3" />
            </div>
          </div>
        )}

        {mode === 'grid' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Nota Media (1.0★ – 5.0★)</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {activeHoverPoint.avgRating.toFixed(1)}★ vs {activeHoverPoint.competitorAvgRating.toFixed(1)}★
                </span>
              </div>
              <div ref={ratingRef} className="w-full">
                <svg className="w-full h-[190px]" aria-label="Gráfica D3 Nota Media" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Tasa de Respuesta (%)</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {activeHoverPoint.responseRatePct}% (SLA 90%)
                </span>
              </div>
              <div ref={responseRef} className="w-full">
                <svg className="w-full h-[190px]" aria-label="Gráfica D3 Tasa de Respuesta" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Cuota Visibilidad Maps (%)</span>
                <span className="font-mono font-semibold text-blue-700 tabular-nums">
                  {activeHoverPoint.mapsVisibilitySharePct}% vs {activeHoverPoint.competitorTopSharePct}% rival
                </span>
              </div>
              <div ref={shareRef} className="w-full">
                <svg className="w-full h-[190px]" aria-label="Gráfica D3 Cuota Google Maps" />
              </div>
            </div>
          </div>
        )}

        {mode === 'competitors' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-700" />
                  Cuota Maps (%)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                  Tasa de Respuesta (%)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-amber-600" />
                  Nota Media (escala 0–100)
                </span>
              </div>
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                {hoveredCompBar
                  ? `${hoveredCompBar.name} · ${hoveredCompBar.metric}: ${hoveredCompBar.value}`
                  : 'Pasa el cursor sobre las barras para inspeccionar'}
              </span>
            </div>

            <div ref={compRef} className="w-full overflow-hidden">
              <svg className="w-full h-[290px]" aria-label="Comparativa Competidores Google Maps D3" />
            </div>
          </div>
        )}
      </div>

      {/* Tabla comparativa frente a competidores locales */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Benchmark Competitivo en Google Maps ({city})
            </h3>
            <p className="text-xs text-slate-500">
              Comparativa actual de nota media, volumen de reseñas, velocidad de respuesta y cuota de visibilidad local
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            Corte: {latest.period}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Negocio / Competidor</th>
                <th className="py-2 px-3 font-medium text-right">Nota Media</th>
                <th className="py-2 px-3 font-medium text-right">Reseñas Totales</th>
                <th className="py-2 px-3 font-medium text-right">Tasa de Respuesta</th>
                <th className="py-2 pl-3 font-medium text-right">Cuota Visibilidad Maps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarkRows.map((row) => (
                <tr
                  key={row.id}
                  className={row.isSelf ? 'bg-blue-50/40 font-semibold text-slate-900' : 'hover:bg-slate-50'}
                >
                  <td className="py-3 pr-4">
                    <span className={row.isSelf ? 'text-blue-800' : 'text-slate-800'}>
                      {row.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700">
                    {row.avgRating.toFixed(1)}★
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {row.reviewsCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                    {row.responseRatePct}%
                  </td>
                  <td className="py-3 pl-3 text-right font-mono tabular-nums text-blue-700">
                    {row.mapsSharePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
