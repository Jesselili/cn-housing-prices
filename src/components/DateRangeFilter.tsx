import { useEffect, useMemo, useRef, useState } from 'react';
import { getQuickRange, type PeriodSelection } from '../data';

interface DateRangeFilterProps {
  periods: string[];
  startPeriod: string | null;
  endPeriod: string | null;
  onChange: (startPeriod: string | null, endPeriod: string | null) => void;
  disabled?: boolean;
}

const QUICK_RANGES = [
  { label: '近 12 个月', months: 12 },
  { label: '近 3 年', months: 36 },
  { label: '近 5 年', months: 60 },
  { label: '近 10 年', months: 120 },
];

function formatPeriod(period: string | null): string {
  if (!period) return '暂无数据';
  return period.replace('-', '.');
}

function periodIndex(periods: string[], period: string | null, side: 'start' | 'end'): number {
  if (!periods.length) return 0;
  if (!period) return side === 'start' ? 0 : periods.length - 1;

  const exactIndex = periods.indexOf(period);
  if (exactIndex >= 0) return exactIndex;

  if (side === 'start') {
    const nextIndex = periods.findIndex((item) => item >= period);
    return nextIndex >= 0 ? nextIndex : periods.length - 1;
  }

  for (let index = periods.length - 1; index >= 0; index -= 1) {
    if (periods[index] <= period) return index;
  }
  return 0;
}

function sameRange(left: PeriodSelection, right: PeriodSelection): boolean {
  return left.startPeriod === right.startPeriod && left.endPeriod === right.endPeriod;
}

function yearTicks(periods: string[]): Array<{ label: string; index: number }> {
  const years = [...new Map(periods.map((period, index) => [period.slice(0, 4), index]))];
  if (years.length <= 6) return years.map(([label, index]) => ({ label, index }));

  const step = Math.ceil((years.length - 1) / 5);
  const indexes = [...new Set([0, ...Array.from({ length: 5 }, (_, index) => index * step), years.length - 1])]
    .map((yearIndex) => Math.min(yearIndex, years.length - 1));
  return indexes.map((yearIndex) => ({ label: years[yearIndex][0], index: years[yearIndex][1] }));
}

export function DateRangeFilter({
  periods,
  startPeriod,
  endPeriod,
  onChange,
  disabled = false,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const minPeriod = periods[0] ?? null;
  const maxPeriod = periods.at(-1) ?? null;
  const startIndex = periodIndex(periods, startPeriod, 'start');
  const endIndex = Math.max(startIndex, periodIndex(periods, endPeriod, 'end'));
  const effectiveRange: PeriodSelection = {
    startPeriod: periods[startIndex] ?? minPeriod,
    endPeriod: periods[endIndex] ?? maxPeriod,
  };
  const ticks = useMemo(() => yearTicks(periods), [periods]);
  const activeQuickRange = QUICK_RANGES.find(({ months }) => {
    const quickRange = getQuickRange(periods, months);
    return quickRange ? sameRange(quickRange, effectiveRange) : false;
  });

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const applyRange = (range: PeriodSelection | null) => {
    if (range) onChange(range.startPeriod, range.endPeriod);
  };

  const updateStart = (nextIndex: number) => {
    const boundedIndex = Math.min(Math.max(nextIndex, 0), endIndex);
    onChange(periods[boundedIndex] ?? minPeriod, periods[endIndex] ?? maxPeriod);
  };

  const updateEnd = (nextIndex: number) => {
    const boundedIndex = Math.max(Math.min(nextIndex, periods.length - 1), startIndex);
    onChange(periods[startIndex] ?? minPeriod, periods[boundedIndex] ?? maxPeriod);
  };

  return (
    <div ref={filterRef} className="date-range-filter">
      <button
        className="date-range-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`日期范围 ${formatPeriod(effectiveRange.startPeriod)} 至 ${formatPeriod(effectiveRange.endPeriod)}`}
        disabled={disabled || !periods.length}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="date-calendar-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" role="presentation">
            <rect x="2.5" y="4.5" width="15" height="13" rx="2" />
            <path d="M5.5 2.5v4M14.5 2.5v4M2.5 8.5h15" />
          </svg>
        </span>
        <span className="date-trigger-copy">
          <span className="date-trigger-label">日期范围</span>
          <strong className="date-trigger-value">
            {formatPeriod(effectiveRange.startPeriod)} <span aria-hidden="true">—</span> {formatPeriod(effectiveRange.endPeriod)}
          </strong>
        </span>
        <span className="date-trigger-mode">{activeQuickRange?.label ?? '自定义'}</span>
        <span className="chevron" aria-hidden="true" />
      </button>

      {open && periods.length > 0 && (
        <div className="date-range-menu" role="dialog" aria-label="选择日期范围">
          <div className="date-menu-heading">
            <div>
              <span className="date-menu-kicker">MONTHLY COMPARISON</span>
              <strong>选择比较区间</strong>
            </div>
            <span className="date-menu-boundary">{formatPeriod(minPeriod)} — {formatPeriod(maxPeriod)}</span>
          </div>

          <div className="date-section">
            <span className="date-section-label">快捷范围</span>
            <div className="date-shortcuts">
              {QUICK_RANGES.map(({ label, months }) => {
                const quickRange = getQuickRange(periods, months);
                const selected = quickRange ? sameRange(quickRange, effectiveRange) : false;
                return (
                  <button
                    className={`date-shortcut${selected ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={selected}
                    key={label}
                    onClick={() => applyRange(quickRange)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="date-section date-slider-section">
            <span className="date-section-label">自定义月份</span>
            <div className="date-slider-list">
              <label className="date-slider-row">
                <span className="date-slider-meta"><span>起始月份</span><strong>{formatPeriod(effectiveRange.startPeriod)}</strong></span>
                <input
                  type="range"
                  min="0"
                  max={endIndex}
                  value={startIndex}
                  aria-label="起始月份滑杆"
                  aria-valuetext={formatPeriod(effectiveRange.startPeriod)}
                  onChange={(event) => updateStart(Number(event.currentTarget.value))}
                />
              </label>
              <label className="date-slider-row">
                <span className="date-slider-meta"><span>结束月份</span><strong>{formatPeriod(effectiveRange.endPeriod)}</strong></span>
                <input
                  type="range"
                  min={startIndex}
                  max={Math.max(periods.length - 1, 0)}
                  value={endIndex}
                  aria-label="结束月份滑杆"
                  aria-valuetext={formatPeriod(effectiveRange.endPeriod)}
                  onChange={(event) => updateEnd(Number(event.currentTarget.value))}
                />
              </label>
            </div>
            <div className="date-timeline" aria-hidden="true">
              <div className="date-timeline-line" />
              {ticks.map(({ label, index }) => (
                <span
                  className="date-timeline-label"
                  key={label}
                  style={{ left: `${periods.length <= 1 ? 0 : (index / (periods.length - 1)) * 100}%` }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <p className="date-menu-hint">拖动滑杆快速定位，聚焦后可用左右方向键逐月微调</p>
        </div>
      )}
    </div>
  );
}
