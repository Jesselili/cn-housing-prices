import { useEffect, useMemo, useRef, useState } from 'react';
import { getResponsiveChartWidth } from '../chartSizing';
import {
  getMarketBreadthSnapshot,
  NEW_BUILD_HOUSING,
  NEW_BUILD_SIZE_BANDS,
  RESALE_HOUSING,
  type CsvRow,
  type HousingType,
  type MarketBreadthPoint,
  type SizeBand,
} from '../data';

type LoadState = 'loading' | 'ready' | 'error';

interface MarketBreadthModuleProps {
  rows: CsvRow[];
  loadState: LoadState;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  plotWidth: number;
  plotHeight: number;
  slotWidth: number;
  barWidth: number;
  yScale: (value: number) => number;
}

const CATEGORIES: Array<{ key: 'rising' | 'unchanged' | 'falling'; label: string; className: string }> = [
  { key: 'falling', label: '下降城市', className: 'is-falling' },
  { key: 'unchanged', label: '持平城市', className: 'is-unchanged' },
  { key: 'rising', label: '上涨城市', className: 'is-rising' },
];

const SIZE_BAND_LABELS: Record<string, string> = {
  '90m2及以下': '90m²及以下',
  '90-144m2': '90–144m²',
  '144m2以上': '144m²以上',
};

const CHART_HORIZONTAL_PADDING = 44;

function tickIndices(length: number): number[] {
  if (length <= 1) return [0];
  const step = Math.max(1, Math.ceil(length / 10));
  return [...new Set([
    0,
    ...Array.from({ length: Math.ceil(length / step) }, (_, index) => Math.min(length - 1, index * step)),
    length - 1,
  ])];
}

function formatCount(value: number): string {
  return `${value} 城`;
}

function formatPeriod(period: string): string {
  return period.replace('-', '.');
}

function chartTickValues(max: number): number[] {
  return Array.from({ length: 5 }, (_, index) => Math.round((max * index) / 4));
}

export function getMarketBreadthChartWidth(pointCount: number, availableWidth: number): number {
  return getResponsiveChartWidth(pointCount, availableWidth, 9, 74);
}

function segmentY(point: MarketBreadthPoint, key: 'rising' | 'unchanged' | 'falling', yScale: (value: number) => number): number {
  const categoryIndex = CATEGORIES.findIndex((category) => category.key === key);
  const previousTotal = CATEGORIES
    .slice(0, categoryIndex)
    .reduce((sum, category) => sum + point[category.key], 0);
  return yScale(previousTotal + point[key]);
}

export function MarketBreadthModule({ rows, loadState }: MarketBreadthModuleProps) {
  const [housingType, setHousingType] = useState<HousingType>(RESALE_HOUSING);
  const [sizeBand, setSizeBand] = useState<SizeBand>(NEW_BUILD_SIZE_BANDS[0]);
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [availableChartWidth, setAvailableChartWidth] = useState(0);
  useEffect(() => {
    const node = chartScrollRef.current;
    if (!node) return undefined;
    const updateWidth = () => {
      setAvailableChartWidth(Math.max(0, node.clientWidth - CHART_HORIZONTAL_PADDING));
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [loadState, rows.length, housingType, sizeBand]);
  const snapshot = useMemo(
    () => getMarketBreadthSnapshot(rows, { housingType, sizeBand }),
    [rows, housingType, sizeBand],
  );
  const chart = useMemo<ChartDimensions | null>(() => {
    if (!snapshot.points.length) return null;
    const width = getMarketBreadthChartWidth(snapshot.points.length, availableChartWidth);
    const height = 420;
    const margin = { top: 26, right: 26, bottom: 76, left: 54 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxCoverage = Math.max(70, ...snapshot.points.map((point) => point.coverageCities));
    const yScale = (value: number) => margin.top + ((maxCoverage - value) / maxCoverage) * plotHeight;
    const slotWidth = plotWidth / snapshot.points.length;
    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      slotWidth,
      barWidth: Math.min(14, Math.max(4, slotWidth * 0.72)),
      yScale,
    };
  }, [snapshot.points, availableChartWidth]);
  const xTicks = useMemo(() => tickIndices(snapshot.points.length), [snapshot.points.length]);
  const latestPoint = snapshot.points.at(-1) ?? null;
  const tooltipLeft = hover && chart ? Math.min(Math.max(hover.x + 14, 10), chart.width - 224) : 0;

  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    if (!chart) return;
    const svg = event.currentTarget.ownerSVGElement;
    const rect = svg?.getBoundingClientRect();
    if (!rect) return;
    const svgX = (event.clientX - rect.left) * (chart.width / rect.width);
    const boundedX = Math.min(Math.max(svgX, chart.margin.left), chart.width - chart.margin.right);
    const index = snapshot.points.length === 1
      ? 0
      : Math.min(snapshot.points.length - 1, Math.max(0, Math.round(((boundedX - chart.margin.left) / chart.plotWidth) * (snapshot.points.length - 1))));
    setHover({ index, x: boundedX });
  };

  return (
    <section className="market-breadth-module" aria-labelledby="market-breadth-title">
      <header className="market-breadth-header">
        <div className="market-breadth-title-copy">
          <span className="market-breadth-kicker">MARKET BREADTH</span>
          <h2 id="market-breadth-title">市场广度趋势</h2>
          <p>{snapshot.latestPeriod ? `最新数据：${snapshot.latestPeriod} · 按每月有数据城市统计` : '等待可用数据'}</p>
        </div>
        <div className="market-breadth-controls">
          <div className="market-breadth-type-control" role="group" aria-label="住宅类型">
            <button
              className={housingType === RESALE_HOUSING ? 'is-active' : ''}
              type="button"
              aria-pressed={housingType === RESALE_HOUSING}
              onClick={() => setHousingType(RESALE_HOUSING)}
            >
              二手住宅
            </button>
            <button
              className={housingType === NEW_BUILD_HOUSING ? 'is-active' : ''}
              type="button"
              aria-pressed={housingType === NEW_BUILD_HOUSING}
              onClick={() => setHousingType(NEW_BUILD_HOUSING)}
            >
              新建住宅
            </button>
          </div>
          {housingType === NEW_BUILD_HOUSING && (
            <div className="market-breadth-size-control" role="group" aria-label="新建住宅户型">
              {NEW_BUILD_SIZE_BANDS.map((option) => (
              <button
                className={sizeBand === option ? 'is-active' : ''}
                type="button"
                aria-pressed={sizeBand === option}
                key={option}
                onClick={() => setSizeBand(option)}
              >
                {SIZE_BAND_LABELS[option]}
              </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {loadState === 'loading' && <div className="market-breadth-empty">正在加载市场广度数据…</div>}
      {loadState === 'error' && <div className="market-breadth-empty is-error">数据加载失败，无法生成市场广度趋势。</div>}
      {loadState === 'ready' && !chart && <div className="market-breadth-empty">当前住宅类型没有可用的市场广度数据。</div>}
      {loadState === 'ready' && chart && latestPoint && (
        <>
          <div className="market-breadth-overview" aria-label="最新市场广度">
            <span>最新月份：{latestPoint.period}</span>
            {CATEGORIES.map(({ key, label, className }) => (
              <span className={`market-breadth-overview-item ${className}`} key={key}>
                <i aria-hidden="true" />{label} {formatCount(latestPoint[key])}
              </span>
            ))}
          </div>
          <div className="market-breadth-legend" aria-label="图例">
            {CATEGORIES.map(({ key, label, className }) => (
              <span className={`market-breadth-legend-item ${className}`} key={key}>
                <i aria-hidden="true" />{label}
              </span>
            ))}
          </div>
          <div className="market-breadth-chart-scroll" ref={chartScrollRef}>
            <div className="market-breadth-chart" style={{ width: chart.width }}>
              <svg
                className="market-breadth-svg"
                width={chart.width}
                height={chart.height}
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                role="img"
                aria-labelledby="market-breadth-chart-title market-breadth-chart-description"
              >
                <title id="market-breadth-chart-title">{`${housingType}市场广度趋势`}</title>
                <desc id="market-breadth-chart-description">按月统计上涨、持平和下降城市数量，帮助判断价格变化的覆盖范围。</desc>
                <g className="market-breadth-grid">
                  {chartTickValues(Math.max(70, ...snapshot.points.map((point) => point.coverageCities))).map((value) => {
                    const y = chart.yScale(value);
                    return (
                      <g key={value}>
                        <line x1={chart.margin.left} x2={chart.width - chart.margin.right} y1={y} y2={y} />
                        <text x={chart.margin.left - 10} y={y + 4} textAnchor="end">{value}</text>
                      </g>
                    );
                  })}
                </g>
                <line className="market-breadth-axis" x1={chart.margin.left} x2={chart.width - chart.margin.right} y1={chart.yScale(0)} y2={chart.yScale(0)} />
                {snapshot.points.map((point, index) => {
                  const center = chart.margin.left + chart.slotWidth * index + chart.slotWidth / 2;
                  const x = center - chart.barWidth / 2;
                  let previousTotal = 0;
                  return (
                    <g className="market-breadth-bar-group" key={point.period}>
                      {CATEGORIES.map(({ key, className }) => {
                        const value = point[key];
                        const y = chart.yScale(previousTotal + value);
                        const barHeight = chart.yScale(previousTotal) - y;
                        previousTotal += value;
                        if (value === 0) return null;
                        return <rect className={`market-breadth-bar ${className}`} height={barHeight} key={key} width={chart.barWidth} x={x} y={y} />;
                      })}
                      <title>{`${point.period} 上涨 ${point.rising} 城，持平 ${point.unchanged} 城，下降 ${point.falling} 城`}</title>
                    </g>
                  );
                })}
                {hover && (
                  <line className="market-breadth-hover-line" x1={chart.margin.left + chart.slotWidth * hover.index + chart.slotWidth / 2} x2={chart.margin.left + chart.slotWidth * hover.index + chart.slotWidth / 2} y1={chart.margin.top} y2={chart.yScale(0)} />
                )}
                <rect
                  className="market-breadth-pointer-layer"
                  height={chart.plotHeight}
                  onPointerLeave={() => setHover(null)}
                  onPointerMove={handlePointerMove}
                  width={chart.plotWidth}
                  x={chart.margin.left}
                  y={chart.margin.top}
                />
                <g className="market-breadth-x-labels">
                  {xTicks.map((index) => (
                    <text key={snapshot.points[index].period} transform={`translate(${chart.margin.left + chart.slotWidth * index + chart.slotWidth / 2} ${chart.height - chart.margin.bottom + 20}) rotate(55)`} textAnchor="start">
                      {formatPeriod(snapshot.points[index].period)}
                    </text>
                  ))}
                </g>
              </svg>
              {hover && (
                <div className="market-breadth-tooltip" style={{ left: tooltipLeft, top: 12 }}>
                  <strong>{snapshot.points[hover.index].period}</strong>
                  {CATEGORIES.map(({ key, label, className }) => (
                    <div className={`market-breadth-tooltip-row ${className}`} key={key}>
                      <i aria-hidden="true" />
                      <span>{label}</span>
                      <b>{formatCount(snapshot.points[hover.index][key])}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
