import { useEffect, useMemo, useRef, useState } from 'react';
import { getResponsiveChartWidth } from '../chartSizing';
import type { LprPoint } from '../data';

type LoadState = 'loading' | 'ready' | 'error';

interface LprModuleProps {
  loadState: LoadState;
  points: LprPoint[];
  error: string;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  plotWidth: number;
  plotHeight: number;
  xScale: (index: number) => number;
  yScale: (value: number) => number;
  yTicks: number[];
}

const CHART_HORIZONTAL_PADDING = 90;
const CHART_MIN_POINT_WIDTH = 24;
const SERIES = [
  { key: 'oneYearRate', label: '1 年期 LPR', className: 'lpr-line-one-year' },
  { key: 'fiveYearRate', label: '5 年期 LPR（重点关注）', className: 'lpr-line-five-year' },
] as const;

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatDate(date: string): string {
  return date.replaceAll('-', '.');
}

function tickIndices(length: number): number[] {
  if (length <= 1) return [0];
  const step = Math.max(1, Math.ceil((length - 1) / 7));
  return [...new Set([
    0,
    ...Array.from({ length: Math.ceil((length - 1) / step) }, (_, index) => Math.min(length - 1, index * step)),
    length - 1,
  ])];
}

function makePath(
  points: LprPoint[],
  key: 'oneYearRate' | 'fiveYearRate',
  xScale: (index: number) => number,
  yScale: (value: number) => number,
): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(index).toFixed(2)} ${yScale(point[key]).toFixed(2)}`)
    .join(' ');
}

function createChartDimensions(points: LprPoint[], availableWidth: number): ChartDimensions {
  const width = getResponsiveChartWidth(
    points.length,
    availableWidth || 1024,
    CHART_MIN_POINT_WIDTH,
    CHART_HORIZONTAL_PADDING,
  );
  const height = 430;
  const margin = { top: 28, right: 28, bottom: 74, left: 68 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = points.flatMap((point) => [point.oneYearRate, point.fiveYearRate]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax - rawMin;
  const padding = rawRange === 0 ? 0.2 : Math.max(rawRange * 0.12, 0.1);
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;
  const xScale = (index: number) => margin.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const yScale = (value: number) => margin.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * (4 - index)) / 4);

  return { width, height, margin, plotWidth, plotHeight, xScale, yScale, yTicks };
}

export function LprModule({ loadState, points, error }: LprModuleProps) {
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [availableChartWidth, setAvailableChartWidth] = useState(0);
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null);

  useEffect(() => {
    const node = chartScrollRef.current;
    if (!node) return undefined;
    const updateWidth = () => setAvailableChartWidth(Math.max(0, node.clientWidth - 44));
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [loadState, points.length]);

  const chart = useMemo(
    () => points.length ? createChartDimensions(points, availableChartWidth) : null,
    [points, availableChartWidth],
  );
  const xTicks = useMemo(() => tickIndices(points.length), [points.length]);
  const tooltipWidth = 220;
  const tooltipLeft = hover && chart ? Math.min(Math.max(hover.x + 14, 10), chart.width - tooltipWidth - 10) : 0;

  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    if (!chart || points.length === 0) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = (event.clientX - rect.left) * (chart.width / rect.width);
    const boundedX = Math.min(Math.max(svgX, chart.margin.left), chart.width - chart.margin.right);
    const index = points.length === 1
      ? 0
      : Math.min(points.length - 1, Math.max(0, Math.round(((boundedX - chart.margin.left) / chart.plotWidth) * (points.length - 1))));
    setHover({ index, x: boundedX });
  };

  return (
    <section className="lpr-module" aria-labelledby="lpr-title">
      <header className="lpr-header">
        <div className="lpr-title-copy">
          <h2 id="lpr-title">LPR 利率趋势</h2>
          <p>{points.length ? `周期：${points[0].publishDate.replaceAll('-', '')}—${points.at(-1)!.publishDate.replaceAll('-', '')}` : '周期：暂无数据'}</p>
        </div>
      </header>

      {loadState === 'loading' && <div className="lpr-empty">正在加载 LPR 数据…</div>}
      {loadState === 'error' && <div className="lpr-empty is-error">LPR 数据加载失败：{error || '请检查本地数据文件。'}</div>}
      {loadState === 'ready' && !points.length && <div className="lpr-empty">当前没有可用的 LPR 数据。</div>}
      {loadState === 'ready' && chart && (
        <>
          <section className="lpr-methodology" aria-labelledby="lpr-methodology-title">
            <h3 id="lpr-methodology-title">口径说明</h3>
            <p>LPR（贷款市场报价利率）是银行贷款定价的参考利率，不是房价。5 年期 LPR 更接近长期住房贷款，是观察房贷融资成本的重点指标。LPR 下调通常会降低部分借款人的利息负担，但不会直接决定房价上涨。</p>
            <ol>
              <li><strong>已经在还贷的人：</strong>如果房贷合同采用 LPR 定价，到了重定价日后，利率下调可能让月供减少；具体金额取决于合同、加点和重定价日。</li>
              <li><strong>想买房的人：</strong>利率下降会降低利息，但购房决定还取决于房价预期、收入和就业稳定性；降息不等于购房需求必然回升。</li>
              <li><strong>手里有闲钱的人：</strong>当存款和理财收益下降时，部分人可能更愿意比较提前还贷；是否划算还要看贷款利率、资金流动性和合同条款。</li>
              <li><strong>对整个房市的信号：</strong>降 LPR 是降低融资成本、托底需求和防范风险的政策信号，但不是房价上涨的充分条件；市场能否回暖仍取决于收入、就业、预期和房屋需求。</li>
            </ol>
            <p className="lpr-source"><strong>数据来源：</strong><a href="https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/3876551/index.html" target="_blank" rel="noreferrer">中国人民银行 LPR</a></p>
          </section>
          <div className="lpr-legend" aria-label="LPR 图例">
            {SERIES.map(({ label, className }) => (
              <span className="lpr-legend-item" key={className}>
                <i className={className} aria-hidden="true" />{label}
                <b>{formatRate(points.at(-1)![className === 'lpr-line-five-year' ? 'fiveYearRate' : 'oneYearRate'])}</b>
              </span>
            ))}
          </div>
          <div className="lpr-chart-scroll" ref={chartScrollRef}>
            <div className="lpr-chart" style={{ width: chart.width }}>
              <svg
                ref={svgRef}
                className="lpr-svg"
                width={chart.width}
                height={chart.height}
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                role="img"
                aria-labelledby="lpr-chart-title lpr-chart-description"
              >
                <title id="lpr-chart-title">1 年期和 5 年期 LPR 利率趋势</title>
                <desc id="lpr-chart-description">按发布日期展示 1 年期和 5 年期贷款市场报价利率变化，5 年期更接近长期住房贷款。</desc>
                <g className="lpr-grid">
                  {chart.yTicks.map((value) => {
                    const y = chart.yScale(value);
                    return (
                      <g key={value}>
                        <line x1={chart.margin.left} x2={chart.width - chart.margin.right} y1={y} y2={y} />
                        <text x={chart.margin.left - 12} y={y + 4} textAnchor="end">{formatRate(value)}</text>
                      </g>
                    );
                  })}
                </g>
                <line className="lpr-axis" x1={chart.margin.left} x2={chart.margin.left} y1={chart.margin.top} y2={chart.height - chart.margin.bottom} />
                <g className="lpr-x-labels">
                  {xTicks.map((index) => (
                    <text key={points[index].publishDate} transform={`translate(${chart.xScale(index)} ${chart.height - chart.margin.bottom + 22}) rotate(55)`} textAnchor="start">
                      {formatDate(points[index].publishDate)}
                    </text>
                  ))}
                </g>
                <path className="lpr-line-one-year" d={makePath(points, 'oneYearRate', chart.xScale, chart.yScale)} />
                <path className="lpr-line-five-year" d={makePath(points, 'fiveYearRate', chart.xScale, chart.yScale)} />
                {hover && (
                  <line className="lpr-hover-line" x1={chart.xScale(hover.index)} x2={chart.xScale(hover.index)} y1={chart.margin.top} y2={chart.height - chart.margin.bottom} />
                )}
                <rect
                  className="lpr-pointer-layer"
                  x={chart.margin.left}
                  y={chart.margin.top}
                  width={chart.plotWidth}
                  height={chart.plotHeight}
                  onPointerMove={handlePointerMove}
                  onPointerLeave={() => setHover(null)}
                />
              </svg>
              {hover && (
                <div className="lpr-tooltip" style={{ left: tooltipLeft, top: 18, width: tooltipWidth }}>
                  <strong>{points[hover.index].publishDate}</strong>
                  <div><i className="lpr-line-one-year" aria-hidden="true" />1 年期 LPR <b>{formatRate(points[hover.index].oneYearRate)}</b></div>
                  <div><i className="lpr-line-five-year" aria-hidden="true" />5 年期 LPR <b>{formatRate(points[hover.index].fiveYearRate)}</b></div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
