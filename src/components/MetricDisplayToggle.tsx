import type { MetricDisplayMode } from '../data';

interface MetricDisplayToggleProps {
  value: MetricDisplayMode;
  onChange: (mode: MetricDisplayMode) => void;
}

export function MetricDisplayToggle({ value, onChange }: MetricDisplayToggleProps) {
  return (
    <div className="metric-display-toggle" role="group" aria-label="指标显示">
      <button
        className={value === 'index' ? 'is-active' : ''}
        type="button"
        aria-pressed={value === 'index'}
        onClick={() => onChange('index')}
      >
        指数
      </button>
      <button
        className={value === 'change' ? 'is-active' : ''}
        type="button"
        aria-pressed={value === 'change'}
        onClick={() => onChange('change')}
      >
        变化率
      </button>
    </div>
  );
}
