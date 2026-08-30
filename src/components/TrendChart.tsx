import { useEffect, useMemo, useRef, useState } from 'react';
import { getResponsiveChartWidth } from '../chartSizing';
import { formatDisplayValue, type HousingType, type MetricDisplayMode, type TrendSeries } from '../data';

interface TrendChartProps {
  series: TrendSeries[];
  periods: string[];
  housingType: HousingType;
  displayMode?: MetricDisplayMode;
}

interface Dimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  plotWidth: number;
  plotHeight: number;
}

const CITY_COLORS: Record<string, string> = {
  北京: '#2f80ed',
  上海: '#16b5bd',
  广州: '#f7824b',
  深圳: '#bd6ff2',
  长沙: '#e2a72f',
};

const FALLBACK_COLORS = ['#4b8dce', '#3a9d83', '#cc765d', '#816fc1', '#b18749', '#687b8d', '#c25d8b', '#4b9a9a'];
const DASH_PATTERNS: Record<string, string> = {
  '90m2及以下': '',
  '90-144m2': '7 5',
  '144m2以上': '2 5',
};
const SIZE_BAND_LABELS: Record<string, string> = {
  '90m2及以下': '90m²及以下',
  '90-144m2': '90–144m²',
  '144m2以上': '144m²以上',
};

function getCityColor(city: string): string {
  if (CITY_COLORS[city]) return CITY_COLORS[city];
  const hash = [...city].reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

function seriesLabel(series: TrendSeries, housingType: HousingType): string {
  return housingType === '新建商品住宅'
    ? `${series.city} · ${SIZE_BAND_LABELS[series.sizeBand] ?? series.sizeBand}`
    : series.city;
}

function makePath(
  series: TrendSeries,
  periodIndex: Map<string, number>,
  xScale: (index: number) => number,
  yScale: (value: number) => number,
  displayValue: (value: number) => number,
): string {
  let path = '';
  let segmentOpen = false;
  series.points.forEach((point) => {
    if (point.value === null || !periodIndex.has(point.period)) {
      segmentOpen = false;
      return;
    }
    const x = xScale(periodIndex.get(point.period)!);
    const y = yScale(displayValue(point.value));
    path += `${segmentOpen ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)} `;
    segmentOpen = true;
  });
  return path.trim();
}

function tickIndices(length: number): number[] {
  if (length <= 1) return [0];
  const step = Math.max(1, Math.ceil(length / 9));
  return [...new Set([
    0,
    ...Array.from({ length: Math.ceil(length / step) }, (_, index) => Math.min(length - 1, index * step)),
    length - 1,
  ])];
}

function formatChartValue(value: number, displayMode: MetricDisplayMode): string {
  if (displayMode === 'change') return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  return value.toFixed(2);
}

export function TrendChart({ series, periods, housingType, displayMode = 'index' }: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewportWidth, setViewportWidth] = useState(1024);
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const updateWidth = () => setViewportWidth(container.parentElement?.clientWidth || 1024);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container.parentElement || container);
    return () => observer.disconnect();
  }, []);

  const dimensions = useMemo<Dimensions>(() => {
    const width = getResponsiveChartWidth(periods.length, viewportWidth, 42, 90);
    const height = Math.max(440, Math.min(590, Math.round(width * 0.4)));
    const margin = { top: 28, right: 28, bottom: 76, left: 62 };
    return {
      width,
      height,
      margin,
      plotWidth: width - margin.left - margin.right,
      plotHeight: height - margin.top - margin.bottom,
    };
  }, [periods.length, viewportWidth]);

  const numericValues = useMemo(
    () => series
      .flatMap((item) => item.points.map((point) => point.value === null ? null : (displayMode === 'change' ? point.value - 100 : point.value)))
      .filter((value): value is number => Number.isFinite(value)),
    [series, displayMode],
  );
  const periodIndex = useMemo(() => new Map(periods.map((period, index) => [period, index])), [periods]);

  if (!series.length || !periods.length || !numericValues.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">＋</span>
        <strong>选择城市开始查看趋势</strong>
        <span>右上角可以添加或删除城市</span>
      </div>
    );
  }

  const { width, height, margin, plotWidth, plotHeight } = dimensions;
  const rawMin = Math.min(...numericValues, ...(displayMode === 'change' ? [0] : []));
  const rawMax = Math.max(...numericValues, ...(displayMode === 'change' ? [0] : []));
  const rawRange = rawMax - rawMin;
  const padding = rawRange === 0 ? Math.max(Math.abs(rawMax) * 0.03, 1) : rawRange * 0.05;
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;
  const xScale = (index: number) => margin.left + (periods.length === 1 ? plotWidth / 2 : (index / (periods.length - 1)) * plotWidth);
  const yScale = (value: number) => margin.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4).reverse();
  const xTicks = tickIndices(periods.length);
  const tooltipWidth = series.length > 8 ? 300 : 240;
  const tooltipLeft = hover ? Math.min(Math.max(hover.x + 14, 10), width - tooltipWidth - 10) : 0;

  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = (event.clientX - rect.left) * (width / rect.width);
    const boundedX = Math.min(Math.max(svgX, margin.left), width - margin.right);
    const index = periods.length === 1 ? 0 : Math.round(((boundedX - margin.left) / plotWidth) * (periods.length - 1));
    setHover({ index, x: boundedX });
  };

  return (
    <div ref={containerRef} className="trend-chart" style={{ width }}>
      <div className="chart-legend" aria-label="图例">
        {series.map((item) => {
          const color = getCityColor(item.city);
          const dash = housingType === '新建商品住宅' ? DASH_PATTERNS[item.sizeBand] : '';
          return (
            <span className="legend-item" key={item.key}>
              <span className="legend-line" style={{ borderTop: `2px ${dash ? 'dashed' : 'solid'} ${color}` }} />
              <span>{seriesLabel(item, housingType)}</span>
            </span>
          );
        })}
      </div>
      <div className="plot-wrap" style={{ width }}>
        <svg ref={svgRef} className="trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="chart-title chart-description">
          <title id="chart-title">{`${housingType}${displayMode === 'change' ? '累计变化率' : '累计指数趋势'}`}</title>
          <desc id="chart-description">{displayMode === 'change' ? '月度环比指数连乘后的累计变化率，所选区间首月为 0%。' : '月度环比指数连乘后的房价指数趋势，所选区间首月归一为 100。'}</desc>
          <g className="grid">
            {yTicks.map((value) => {
              const y = yScale(value);
              return (
                <g key={value}>
                  <line className="grid-line" x1={margin.left} x2={width - margin.right} y1={y} y2={y} />
                  <text className="y-label" x={margin.left - 12} y={y + 4} textAnchor="end">{formatChartValue(value, displayMode)}</text>
                </g>
              );
            })}
          </g>
          {displayMode === 'change' && (
            <line className="change-reference-line" x1={margin.left} x2={width - margin.right} y1={yScale(0)} y2={yScale(0)} />
          )}
          <line className="axis-line" x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} />
          <g className="x-labels">
            {xTicks.map((index) => (
              <text className="x-label" key={periods[index]} transform={`translate(${xScale(index)} ${height - margin.bottom + 22}) rotate(58)`} textAnchor="start">
                {periods[index]}
              </text>
            ))}
          </g>
          <g className="series-lines">
            {series.map((item) => {
              const dash = housingType === '新建商品住宅' ? DASH_PATTERNS[item.sizeBand] : '';
              return (
                <path
                  className="trend-line"
                  d={makePath(item, periodIndex, xScale, yScale, (value) => displayMode === 'change' ? value - 100 : value)}
                  key={item.key}
                  stroke={getCityColor(item.city)}
                  strokeDasharray={dash || undefined}
                >
                  <title>{`${seriesLabel(item, housingType)} ${formatDisplayValue([...item.points].reverse().find((point) => point.value !== null)?.value ?? null, displayMode)}`}</title>
                </path>
              );
            })}
          </g>
          {hover && (
            <>
              <line className="hover-line" x1={xScale(hover.index)} x2={xScale(hover.index)} y1={margin.top} y2={height - margin.bottom} />
              <g className="active-dots">
                {series.map((item) => {
                  const point = item.points.find(({ period }) => period === periods[hover.index]);
                  if (!point || point.value === null) return null;
                  const value = displayMode === 'change' ? point.value - 100 : point.value;
                  return <circle className="active-dot" cx={xScale(hover.index)} cy={yScale(value)} fill={getCityColor(item.city)} key={item.key} r="4" />;
                })}
              </g>
            </>
          )}
          <rect
            className="pointer-layer"
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hover && (
          <div className="chart-tooltip" style={{ left: tooltipLeft, top: 18, width: tooltipWidth }}>
            <div className="tooltip-period">{periods[hover.index]}</div>
            {series.map((item) => {
              const point = item.points.find(({ period }) => period === periods[hover.index]);
              return (
                <div className="tooltip-row" key={item.key}>
                  <span className="tooltip-swatch" style={{ backgroundColor: getCityColor(item.city) }} />
                  <span className="tooltip-label">{seriesLabel(item, housingType)}</span>
                  <strong>{formatDisplayValue(point?.value ?? null, displayMode)}</strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
