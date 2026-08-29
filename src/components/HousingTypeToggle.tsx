import type { HousingType } from '../data';

interface HousingTypeToggleProps {
  value: HousingType;
  onChange: (value: HousingType) => void;
  disabled?: boolean;
}

const options: Array<{ value: HousingType; label: string }> = [
  { value: '二手住宅', label: '二手住宅' },
  { value: '新建商品住宅', label: '新建住宅' },
];

export function HousingTypeToggle({ value, onChange, disabled = false }: HousingTypeToggleProps) {
  return (
    <div className="segmented-control" role="group" aria-label="住宅类型">
      {options.map((option) => (
        <button
          className={`segment-button${value === option.value ? ' is-active' : ''}`}
          disabled={disabled}
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
