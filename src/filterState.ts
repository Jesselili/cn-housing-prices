import type { HousingType } from './data';

export interface FilterState {
  housingType: HousingType;
  selectedCities: string[];
  startPeriod: string | null;
  endPeriod: string | null;
}

export type FilterAction =
  | {
      type: 'housingType/set';
      housingType: HousingType;
      range?: { startPeriod: string | null; endPeriod: string | null };
    }
  | { type: 'city/toggled'; city: string; checked: boolean }
  | { type: 'period/set'; boundary: 'start' | 'end'; period: string | null };

export const DEFAULT_CITIES = ['北京', '上海', '广州', '深圳', '长沙'];

export const DEFAULT_FILTER_STATE: FilterState = {
  housingType: '二手住宅',
  selectedCities: [...DEFAULT_CITIES],
  startPeriod: null,
  endPeriod: null,
};

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  if (action.type === 'housingType/set') {
    return {
      ...state,
      housingType: action.housingType,
      ...(action.range ?? {}),
    };
  }

  if (action.type === 'period/set') {
    return action.boundary === 'start'
      ? { ...state, startPeriod: action.period }
      : { ...state, endPeriod: action.period };
  }

  if (action.checked) {
    return state.selectedCities.includes(action.city)
      ? state
      : { ...state, selectedCities: [...state.selectedCities, action.city] };
  }

  return {
    ...state,
    selectedCities: state.selectedCities.filter((city) => city !== action.city),
  };
}
