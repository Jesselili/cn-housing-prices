export type HousingType = '二手住宅' | '新建商品住宅';
export type SizeBand = '全部' | '90m2及以下' | '90-144m2' | '144m2以上';

export interface CsvRow {
  period: string;
  house_type: string;
  size_band: string;
  city: string;
  metric: string;
  base: string;
  value: string;
  [key: string]: string;
}

export interface TrendPoint {
  period: string;
  value: number | null;
}

export interface TrendSeries {
  key: string;
  city: string;
  sizeBand: SizeBand;
  points: TrendPoint[];
}

export interface SummaryRow {
  key: string;
  city: string;
  sizeBand: SizeBand;
  latestPeriod: string | null;
  monthOverMonth: number | null;
  yearOverYear: number | null;
  baseGrowth: number | null;
}

export interface SummaryOptions extends PeriodRange {
  housingType: HousingType;
  selectedCities: string[];
}

export interface PeriodRange {
  startPeriod?: string | null;
  endPeriod?: string | null;
}

export interface PeriodSelection {
  startPeriod: string | null;
  endPeriod: string | null;
}

export const RESALE_HOUSING: HousingType = '二手住宅';
export const NEW_BUILD_HOUSING: HousingType = '新建商品住宅';

export const NEW_BUILD_SIZE_BANDS: SizeBand[] = [
  '90m2及以下',
  '90-144m2',
  '144m2以上',
];

function parseCsvRow(text: string, start: number): { fields: string[]; next: number } {
  const fields: string[] = [];
  let field = '';
  let cursor = start;
  let inQuotes = false;

  while (cursor < text.length) {
    const character = text[cursor];

    if (character === '"') {
      if (inQuotes && text[cursor + 1] === '"') {
        field += '"';
        cursor += 2;
        continue;
      }
      inQuotes = !inQuotes;
      cursor += 1;
      continue;
    }

    if (!inQuotes && character === ',') {
      fields.push(field.trim());
      field = '';
      cursor += 1;
      continue;
    }

    if (!inQuotes && (character === '\n' || character === '\r')) {
      fields.push(field.trim());
      if (character === '\r' && text[cursor + 1] === '\n') cursor += 1;
      return { fields, next: cursor + 1 };
    }

    field += character;
    cursor += 1;
  }

  fields.push(field.trim());
  return { fields, next: cursor };
}

export function parseCsv(text: string): CsvRow[] {
  if (!text) return [];

  const rows: string[][] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const parsed = parseCsvRow(text, cursor);
    cursor = parsed.next;
    if (parsed.fields.length === 1 && parsed.fields[0] === '') continue;
    rows.push(parsed.fields);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((header, index) => (
    index === 0 ? header.replace(/^\ufeff/, '') : header
  ));
  return rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? '']),
  ) as CsvRow);
}

function sizeBandsFor(housingType: HousingType): SizeBand[] {
  return housingType === NEW_BUILD_HOUSING ? NEW_BUILD_SIZE_BANDS : ['全部'];
}

function numericValue(value: string): number | null {
  const parsed = value.trim() === '' ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function filterRows(
  rows: CsvRow[],
  {
    housingType,
    cities,
    startPeriod = null,
    endPeriod = null,
  }: { housingType: HousingType; cities: string[] } & PeriodRange,
): CsvRow[] {
  const citySet = new Set(cities);
  const sizeBands = new Set(sizeBandsFor(housingType));

  return rows.filter((row) => (
    row.house_type === housingType
    && row.metric === '环比'
    && row.base === '上月=100'
    && citySet.has(row.city)
    && sizeBands.has(row.size_band as SizeBand)
    && (!startPeriod || row.period >= startPeriod)
    && (!endPeriod || row.period <= endPeriod)
  ));
}

export function buildSeries(
  rows: CsvRow[],
  { housingType, cities }: { housingType: HousingType; cities: string[] },
): TrendSeries[] {
  const sizeBands = sizeBandsFor(housingType);
  const series: TrendSeries[] = [];

  for (const city of cities) {
    for (const sizeBand of sizeBands) {
      const group = rows
        .filter((row) => row.city === city && row.size_band === sizeBand)
        .sort((left, right) => left.period.localeCompare(right.period));
      if (group.length === 0) continue;

      let currentValue: number | null = null;
      const points = group.map((row): TrendPoint => {
        const rawValue = row.value.trim();
        const monthlyIndex = rawValue === '' ? Number.NaN : Number(rawValue);
        if (!Number.isFinite(monthlyIndex)) return { period: row.period, value: null };
        if (currentValue === null) {
          currentValue = 100;
        } else {
          currentValue *= monthlyIndex / 100;
        }
        return { period: row.period, value: currentValue };
      });

      series.push({
        key: `${city}__${sizeBand}`,
        city,
        sizeBand,
        points,
      });
    }
  }

  return series;
}

export function getVisibleSeries(
  rows: CsvRow[],
  {
    housingType,
    selectedCities,
    startPeriod = null,
    endPeriod = null,
  }: { housingType: HousingType; selectedCities: string[] } & PeriodRange,
): TrendSeries[] {
  return buildSeries(
    filterRows(rows, {
      housingType,
      cities: selectedCities,
      startPeriod,
      endPeriod,
    }),
    { housingType, cities: selectedCities },
  );
}

export function getSummaryRows(rows: CsvRow[], {
  housingType,
  selectedCities,
  startPeriod = null,
  endPeriod = null,
}: SummaryOptions): SummaryRow[] {
  const sizeBands = sizeBandsFor(housingType);
  const summary: SummaryRow[] = [];

  for (const city of selectedCities) {
    for (const sizeBand of sizeBands) {
      const matchingRows = rows.filter((row) => (
        row.house_type === housingType
        && row.city === city
        && row.size_band === sizeBand
        && (!startPeriod || row.period >= startPeriod)
        && (!endPeriod || row.period <= endPeriod)
      ));
      const monthlyByPeriod = new Map<string, number>();
      const yearOverYearByPeriod = new Map<string, number>();

      matchingRows.forEach((row) => {
        const value = numericValue(row.value);
        if (value === null) return;
        if (row.metric === '环比' && row.base === '上月=100') {
          monthlyByPeriod.set(row.period, value);
        }
        if (row.metric === '同比' && row.base === '上年同月=100') {
          yearOverYearByPeriod.set(row.period, value);
        }
      });

      const monthlyPoints = [...monthlyByPeriod.entries()].sort(([left], [right]) => left.localeCompare(right));
      if (!monthlyPoints.length) continue;

      const [latestPeriod, monthOverMonth] = monthlyPoints.at(-1)!;
      let cumulative = 100;
      monthlyPoints.slice(1).forEach(([, value]) => {
        cumulative *= value / 100;
      });

      summary.push({
        key: `${city}__${sizeBand}`,
        city,
        sizeBand,
        latestPeriod,
        monthOverMonth,
        yearOverYear: yearOverYearByPeriod.get(latestPeriod) ?? null,
        baseGrowth: cumulative - 100,
      });
    }
  }

  return summary;
}

export function getPeriods(series: TrendSeries[]): string[] {
  return [...new Set(
    series.flatMap(({ points }) => points.map(({ period }) => period)),
  )].sort();
}

export function getAvailablePeriods(
  rows: CsvRow[],
  { housingType, cities }: { housingType?: HousingType; cities?: string[] } = {},
): string[] {
  const citySet = cities?.length ? new Set(cities) : null;
  const sizeBands = housingType ? new Set(sizeBandsFor(housingType)) : null;
  const periods = rows
    .filter((row) => (
      (!housingType || (
        row.house_type === housingType
        && row.metric === '环比'
        && row.base === '上月=100'
        && sizeBands?.has(row.size_band as SizeBand)
      ))
      && (!citySet || citySet.has(row.city))
      && Boolean(row.period)
    ))
    .map((row) => row.period);
  return [...new Set(periods)].sort();
}

function periodToMonthIndex(period: string): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return Number(match[1]) * 12 + month - 1;
}

function monthIndexToPeriod(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function validSortedPeriods(periods: string[]): string[] {
  return [...new Set(periods.filter((period) => periodToMonthIndex(period) !== null))].sort();
}

export function getQuickRange(periods: string[], months: number): PeriodSelection | null {
  const validPeriods = validSortedPeriods(periods);
  if (!validPeriods.length || months <= 0) return null;

  const endPeriod = validPeriods.at(-1)!;
  const endIndex = periodToMonthIndex(endPeriod)!;
  const targetPeriod = monthIndexToPeriod(endIndex - months + 1);
  const startPeriod = validPeriods.find((period) => period >= targetPeriod) ?? validPeriods[0];
  return { startPeriod, endPeriod };
}

export function normalizePeriodRange(range: PeriodRange, periods: string[]): PeriodSelection {
  const validPeriods = validSortedPeriods(periods);
  if (!validPeriods.length) return { startPeriod: null, endPeriod: null };

  const minPeriod = validPeriods[0];
  const maxPeriod = validPeriods.at(-1)!;
  const requestedStart = range.startPeriod ?? minPeriod;
  const requestedEnd = range.endPeriod ?? maxPeriod;
  if (requestedStart > requestedEnd || requestedEnd < minPeriod || requestedStart > maxPeriod) {
    return { startPeriod: null, endPeriod: null };
  }

  const hasAvailablePeriod = validPeriods.some((period) => period >= requestedStart && period <= requestedEnd);
  if (!hasAvailablePeriod) return { startPeriod: null, endPeriod: null };

  const startPeriod = range.startPeriod
    ? validPeriods.find((period) => period >= requestedStart) ?? maxPeriod
    : null;
  const endPeriod = range.endPeriod
    ? [...validPeriods].reverse().find((period) => period <= requestedEnd) ?? minPeriod
    : null;
  if (startPeriod && endPeriod && startPeriod > endPeriod) {
    return { startPeriod: null, endPeriod: null };
  }
  return { startPeriod, endPeriod };
}

export function filterCityOptions(cities: string[], query: string): string[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return cities;
  return cities.filter((city) => city.includes(normalizedQuery));
}
