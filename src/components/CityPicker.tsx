import { useEffect, useRef, useState } from 'react';
import { filterCityOptions } from '../data';

interface CityPickerProps {
  cities: string[];
  selectedCities: string[];
  onToggle: (city: string, checked: boolean) => void;
  disabled?: boolean;
}

export function CityPicker({ cities, selectedCities, onToggle, disabled = false }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = () => {
    if (!disabled) setOpen((current) => !current);
  };

  const visibleCities = filterCityOptions(cities, query);

  return (
    <div ref={pickerRef} className="city-picker">
      <div className="picker-control">
        <div className="selected-chips">
          {selectedCities.length > 0 ? selectedCities.map((city) => (
            <span className="city-chip" key={city}>
              <span>{city}</span>
              <button
                type="button"
                aria-label={`删除${city}`}
                disabled={disabled}
                onClick={() => onToggle(city, false)}
              >
                ×
              </button>
            </span>
          )) : <span className="picker-placeholder">选择城市</span>}
        </div>
        <button
          className="picker-trigger"
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="选择查看城市"
          disabled={disabled}
          onClick={handleToggle}
        >
          <span className="picker-count">{selectedCities.length}/{cities.length || 70}</span>
          <span className="chevron" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="picker-menu" role="group" aria-label="城市列表">
          <div className="picker-menu-header">
            <span>选择城市</span>
            <span>{selectedCities.length} 个已选</span>
          </div>
          <input
            className="city-search"
            type="search"
            aria-label="搜索城市"
            placeholder="输入城市搜索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="city-options">
            {visibleCities.map((city) => (
              <label className="city-option" key={city}>
                <input
                  type="checkbox"
                  checked={selectedCities.includes(city)}
                  onChange={(event) => onToggle(city, event.target.checked)}
                />
                <span>{city}</span>
              </label>
            ))}
            {visibleCities.length === 0 && <p className="city-empty">没有匹配的城市</p>}
          </div>
        </div>
      )}
    </div>
  );
}
