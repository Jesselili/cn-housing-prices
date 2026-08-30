import { useEffect, useMemo, useRef, useState } from 'react';
import { getResponsiveChartWidth } from '../chartSizing';
import {
  getLatestMonthOverMonthSnapshot,
  NEW_BUILD_HOUSING,
  NEW_BUILD_SIZE_BANDS,
  RESALE_HOUSING,
  type CsvRow,
  type HousingType,
  type SizeBand,
} from '../data';

type LoadState = 'loading' | 'ready' | 'error';

interface MonthOverMonthModuleProps {
  rows: CsvRow[];
  loadState: LoadState;
}

const SIZE_BAND_LABELS: Record<string, string> = {
  '90m2及以下': '90m²及以下',
  '90-144m2': '90–144m²',
  '144m2以上': '144m²以上',
};

function formatChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function compactPeriod(period: string | null): string {
  return period ? period.replace('-', '') : '暂无数据';
}

function formatHousingTitle(housingType: HousingType, sizeBand: SizeBand): string {
  if (housingType === NEW_BUILD_HOUSING) {
    return `新建住宅-${SIZE_BAND_LABELS[sizeBand] ?? sizeBand}`;
  }
  return '二手住宅';
}

export function formatMonthOverMonthTitle(
  housingType: HousingType,
  sizeBand: SizeBand,
  period: string | null,
): string {
  const housingTitle = housingType === NEW_BUILD_HOUSING
    ? `新建住宅（${SIZE_BAND_LABELS[sizeBand] ?? sizeBand}）`
    : formatHousingTitle(housingType, sizeBand);
  return `70 城价格指数环比-${housingTitle}-${compactPeriod(period)}`;
}

function chartTickValues(min: number, max: number): number[] {
  const range = max - min;
  if (range === 0) return [min];
  return Array.from({ length: 5 }, (_, index) => max - (range * index) / 4);
}

export function MonthOverMonthModule({ rows, loadState }: MonthOverMonthModuleProps) {
  const [housingType, setHousingType] = useState<HousingType>(RESALE_HOUSING);
  const [sizeBand, setSizeBand] = useState<SizeBand>(NEW_BUILD_SIZE_BANDS[0]);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [availableChartWidth, setAvailableChartWidth] = useState(0);
  useEffect(() => {
    const node = chartScrollRef.current;
    if (!node) return undefined;
    const updateWidth = () => {
      setAvailableChartWidth(Math.max(0, node.clientWidth - 44));
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
    () => getLatestMonthOverMonthSnapshot(rows, { housingType, sizeBand }),
    [rows, housingType, sizeBand],
  );
  const title = formatMonthOverMonthTitle(housingType, sizeBand, snapshot.period);

  const chart = useMemo(() => {
    if (!snapshot.points.length) return null;
    const width = getResponsiveChartWidth(snapshot.points.length, availableChartWidth, 42, 74);
    const height = 470;
    const margin = { top: 34, right: 24, bottom: 112, left: 54 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const rawMin = Math.min(...snapshot.points.map(({ change }) => change), 0);
    const rawMax = Math.max(...snapshot.points.map(({ change }) => change), 0);
    const rawRange = rawMax - rawMin;
    const padding = Math.max(rawRange * 0.12, 0.1);
    const min = rawMin - padding;
    const max = rawMax + padding;
    const yScale = (value: number) => margin.top + ((max - value) / (max - min)) * plotHeight;
    const zeroY = yScale(0);
    const slotWidth = plotWidth / snapshot.points.length;
    const barWidth = Math.min(28, Math.max(14, slotWidth * 0.62));

    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      yScale,
      zeroY,
      slotWidth,
      barWidth,
      ticks: chartTickValues(min, max),
    };
  }, [snapshot.points, availableChartWidth]);

  return (
    <section className="mom-module" aria-labelledby="mom-module-title">
      <header className="mom-header">
        <div className="mom-title-copy">
          <h2 id="mom-module-title">{title}</h2>
        </div>
        <div className="mom-controls" aria-label="环比模块筛选">
          <div className="mom-type-control" role="group" aria-label="住宅类型">
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
          <div className={`mom-size-control${housingType === NEW_BUILD_HOUSING ? '' : ' is-hidden'}`} role="group" aria-label="新建住宅户型" aria-hidden={housingType !== NEW_BUILD_HOUSING}>
            {NEW_BUILD_SIZE_BANDS.map((option) => (
              <button
                className={sizeBand === option ? 'is-active' : ''}
                disabled={housingType !== NEW_BUILD_HOUSING}
                type="button"
                aria-pressed={sizeBand === option}
                key={option}
                onClick={() => setSizeBand(option)}
              >
                {SIZE_BAND_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loadState === 'loading' && <div className="mom-empty">正在加载最新环比数据…</div>}
      {loadState === 'error' && <div className="mom-empty is-error">环比数据加载失败，无法生成 70 城概览。</div>}
      {loadState === 'ready' && (
        <>
          <div className="mom-overview" aria-label="环比数据概览">
            <div className="mom-stat"><span>覆盖城市</span><strong>{snapshot.overview.coverageCities}</strong></div>
            <div className="mom-stat"><span>上涨</span><strong>{snapshot.overview.rising}</strong></div>
            <div className="mom-stat"><span>持平</span><strong>{snapshot.overview.unchanged}</strong></div>
            <div className="mom-stat"><span>下降</span><strong>{snapshot.overview.falling}</strong></div>
            <div className="mom-stat"><span>均值</span><strong>{formatChange(snapshot.overview.mean)}</strong></div>
            <div className="mom-stat mom-stat-range"><span>区间</span><strong>{snapshot.overview.min === null ? '—' : `${formatChange(snapshot.overview.min)} ~ ${formatChange(snapshot.overview.max)}`}</strong></div>
          </div>
          {!chart ? (
            <div className="mom-empty">当前住宅类型和户型没有可用的环比数据。</div>
          ) : (
            <div className="mom-chart-scroll" ref={chartScrollRef}>
              <svg
                className="mom-svg"
                width={chart.width}
                height={chart.height}
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                role="img"
                aria-labelledby="mom-chart-title mom-chart-description"
              >
                <title id="mom-chart-title">{`${title}城市排名`}</title>
                <desc id="mom-chart-description">按最新月份环比变化从高到低排序的 70 城价格指数柱状图。</desc>
                <g className="mom-grid">
                  {chart.ticks.map((value) => {
                    const y = chart.yScale(value);
                    return (
                      <g key={value}>
                        <line x1={chart.margin.left} x2={chart.width - chart.margin.right} y1={y} y2={y} />
                        <text x={chart.margin.left - 10} y={y + 4} textAnchor="end">{formatChange(value)}</text>
                      </g>
                    );
                  })}
                </g>
                <line className="mom-zero-line" x1={chart.margin.left} x2={chart.width - chart.margin.right} y1={chart.zeroY} y2={chart.zeroY} />
                {snapshot.points.map((point, index) => {
                  const center = chart.margin.left + chart.slotWidth * index + chart.slotWidth / 2;
                  const x = center - chart.barWidth / 2;
                  const valueY = chart.yScale(point.change);
                  const y = point.change >= 0 ? valueY : chart.zeroY;
                  const barHeight = Math.max(Math.abs(chart.zeroY - valueY), point.change === 0 ? 2 : 1);
                  return (
                    <g className="mom-bar-group" key={point.city}>
                      <rect
                        className={point.change >= 0 ? 'mom-bar is-positive' : 'mom-bar is-negative'}
                        x={x}
                        y={y}
                        width={chart.barWidth}
                        height={barHeight}
                      >
                        <title>{`${point.city} ${formatChange(point.change)}`}</title>
                      </rect>
                      <text className="mom-value-label" x={center} y={point.change >= 0 ? valueY - 8 : chart.zeroY + barHeight + 16} textAnchor="middle">{formatChange(point.change)}</text>
                      <text className="mom-city-label" transform={`translate(${center} ${chart.height - chart.margin.bottom + 22}) rotate(55)`} textAnchor="start">{point.city}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </>
      )}
    </section>
  );
}
