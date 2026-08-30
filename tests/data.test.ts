import { describe, expect, it } from 'vitest';
import {
  buildSeries,
  getCityComparisonSnapshot,
  getMarketBreadthSnapshot,
  filterCityOptions,
  filterRows,
  formatDisplayValue,
  getDataStatus,
  getHousingDataCoverage,
  getAvailablePeriods,
  getLatestMonthOverMonthSnapshot,
  getQuickRange,
  getSummaryRows,
  getVisibleSeries,
  NEW_BUILD_HOUSING,
  normalizePeriodRange,
  parseLprCsv,
  parseCsv,
  type CsvRow,
} from '../src/data';
import { filterReducer } from '../src/filterState';

describe('parseLprCsv', () => {
  it('parses, validates, deduplicates, and sorts LPR records', () => {
    const csv = '\ufeff发布日期,1年期LPR利率(%),5年期LPR利率(%)\n'
      + '2020-01-20,4.15,4.8\n'
      + '2019-08-20,4.25,4.85\n'
      + '2020-01-20,4.1,4.75\n'
      + '2020-02-20,,4.75\n'
      + '2020-03-20,not-a-number,4.75';

    expect(parseLprCsv(csv)).toEqual([
      { publishDate: '2019-08-20', oneYearRate: 4.25, fiveYearRate: 4.85 },
      { publishDate: '2020-01-20', oneYearRate: 4.15, fiveYearRate: 4.8 },
    ]);
  });

  it('accepts the whitespace and trailing delimiter in the LPR source format', () => {
    const csv = '\ufeff发布日期,1年期LPR利率(%),5年期LPR利率(%)\n'
      + '2020-01-20\t,4.15,4.8,';

    expect(parseLprCsv(csv)).toEqual([
      { publishDate: '2020-01-20', oneYearRate: 4.15, fiveYearRate: 4.8 },
    ]);
  });
});

const csv = '\ufeffperiod,house_type,size_band,city,metric,base,value\n'
  + '2024-01,二手住宅,全部,北京,环比,上月=100,100\n'
  + '2024-02,二手住宅,全部,北京,环比,上月=100,101\n'
  + '2024-02,二手住宅,全部,"北京,核心",同比,上年同月=100,98\n'
  + '2011-02,新建商品住宅,全部,北京,环比,上月=100,100\n'
  + '2018-03,新建商品住宅,90m2及以下,北京,环比,上月=100,100\n'
  + '2018-03,新建商品住宅,90-144m2,北京,环比,上月=100,100\n'
  + '2018-03,新建商品住宅,144m2以上,北京,环比,上月=100,100\n'
  + '2020-01,新建商品住宅,90m2及以下,北京,环比,上月=100,101\n'
  + '2020-01,新建商品住宅,90-144m2,北京,环比,上月=100,101\n'
  + '2020-01,新建商品住宅,144m2以上,北京,环比,上月=100,101\n'
  + '2024-01,新建商品住宅,90m2及以下,北京,环比,上月=100,99\n'
  + '2024-01,新建商品住宅,90-144m2,北京,环比,上月=100,100.5\n'
  + '2024-01,新建商品住宅,144m2以上,北京,环比,上月=100,101\n';

const summaryRows = [
  { period: '2023-08', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '101' },
  { period: '2023-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '同比', base: '上年同月=100', value: '98.5' },
  { period: '2024-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99' },
  { period: '2024-09', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '同比', base: '上年同月=100', value: '96.5' },
  { period: '2023-08', house_type: '新建商品住宅', size_band: '90m2及以下', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90m2及以下', city: '上海', metric: '环比', base: '上月=100', value: '102' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90m2及以下', city: '上海', metric: '同比', base: '上年同月=100', value: '101.2' },
  { period: '2023-08', house_type: '新建商品住宅', size_band: '90-144m2', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90-144m2', city: '上海', metric: '环比', base: '上月=100', value: '101' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '90-144m2', city: '上海', metric: '同比', base: '上年同月=100', value: '100.8' },
  { period: '2023-08', house_type: '新建商品住宅', size_band: '144m2以上', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '144m2以上', city: '上海', metric: '环比', base: '上月=100', value: '99' },
  { period: '2023-09', house_type: '新建商品住宅', size_band: '144m2以上', city: '上海', metric: '同比', base: '上年同月=100', value: '99.8' },
] as CsvRow[];

const monthOverMonthRows = [
  { period: '2026-06', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99.8' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '环比', base: '上月=100', value: '100.4' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99.7' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '99.7' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '天津', metric: '环比', base: '上月=100', value: '99.0' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '同比', base: '上年同月=100', value: '115' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '深圳', metric: '环比', base: '上年同月=100', value: '103' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '长沙', metric: '环比', base: '上月=100', value: '' },
  { period: '2026-07', house_type: '新建商品住宅', size_band: '90m2及以下', city: '北京', metric: '环比', base: '上月=100', value: '101.2' },
  { period: '2026-07', house_type: '新建商品住宅', size_band: '90-144m2', city: '北京', metric: '环比', base: '上月=100', value: '102.3' },
  { period: '2026-07', house_type: '新建商品住宅', size_band: '144m2以上', city: '北京', metric: '环比', base: '上月=100', value: '103.4' },
] as CsvRow[];

describe('housing price data', () => {
  it('parses BOM-prefixed CSV and quoted fields', () => {
    const rows = parseCsv(csv);
    expect(rows[0].period).toBe('2024-01');
    expect(rows[2].city).toBe('北京,核心');
    expect(rows).toHaveLength(13);
  });

  it('filters to monthly index rows for the selected housing type and cities', () => {
    const rows = filterRows(parseCsv(csv), {
      housingType: '二手住宅',
      cities: ['北京'],
    });
    expect(rows.map((row) => row.period)).toEqual(['2024-01', '2024-02']);
  });

  it('normalizes first month to 100 and compounds monthly changes', () => {
    const rows = filterRows(parseCsv(csv), {
      housingType: '二手住宅',
      cities: ['北京'],
    });
    const [series] = buildSeries(rows, { housingType: '二手住宅', cities: ['北京'] });
    expect(series.points[0].value).toBe(100);
    expect(series.points[1].value).toBe(101);
  });

  it('creates three size-band series for new-build housing', () => {
    const series = getVisibleSeries(parseCsv(csv), {
      housingType: '新建商品住宅',
      selectedCities: ['北京'],
    });
    expect(series.map(({ sizeBand }) => sizeBand)).toEqual([
      '90m2及以下', '90-144m2', '144m2以上',
    ]);
  });

  it('uses inclusive date boundaries and re-normalizes the selected range', () => {
    const series = getVisibleSeries(parseCsv(csv), {
      housingType: '二手住宅',
      selectedCities: ['北京'],
      startPeriod: '2024-02',
      endPeriod: '2024-02',
    });
    expect(series[0].points).toEqual([{ period: '2024-02', value: 100 }]);
  });

  it('returns sorted unique available periods and substring city matches', () => {
    const rows = parseCsv(csv);
    expect(getAvailablePeriods(rows)).toEqual(['2011-02', '2018-03', '2020-01', '2024-01', '2024-02']);
    expect(getAvailablePeriods(rows, { housingType: NEW_BUILD_HOUSING, cities: ['北京'] })).toEqual([
      '2018-03', '2020-01', '2024-01',
    ]);
    expect(filterCityOptions(['北京', '上海', '长沙'], '上')).toEqual(['上海']);
    expect(filterCityOptions(['北京', '上海'], '  ')).toEqual(['北京', '上海']);
  });

  it('calculates type-specific ranges and separates whole-month from city-level gaps', () => {
    const rows = [
      { period: '2025-01', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
      { period: '2025-01', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
      { period: '2025-02', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
      { period: '2025-03', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
      { period: '2025-03', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
      ...['90m2及以下', '90-144m2', '144m2以上'].flatMap((size_band) => [
        { period: '2025-01', house_type: '新建商品住宅', size_band, city: '北京', metric: '环比', base: '上月=100', value: '100' },
        { period: '2025-03', house_type: '新建商品住宅', size_band, city: '北京', metric: '环比', base: '上月=100', value: '100' },
      ]),
    ] as CsvRow[];

    expect(getHousingDataCoverage(rows, '二手住宅')).toMatchObject({
      startPeriod: '2025-01',
      endPeriod: '2025-03',
      missingPeriods: [],
      cityMissingPeriods: [{ city: '上海', periods: ['2025-02'] }],
    });
    expect(getHousingDataCoverage(rows, NEW_BUILD_HOUSING)).toMatchObject({
      startPeriod: '2025-01',
      endPeriod: '2025-03',
      missingPeriods: ['2025-02'],
      cityMissingPeriods: [],
    });
  });

  it('builds a dynamic data status from valid monthly index rows', () => {
    const rows = [
      { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/january' },
      { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/january' },
      { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99.8', source_url: 'https://example.com/latest' },
      { period: '2026-01', house_type: '新建商品住宅', size_band: '90m2及以下', city: '北京', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/january' },
      { period: '2026-01', house_type: '新建商品住宅', size_band: '90-144m2', city: '北京', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/january' },
      { period: '2026-01', house_type: '新建商品住宅', size_band: '144m2以上', city: '北京', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/january' },
      { period: '2026-03', house_type: '新建商品住宅', size_band: '90m2及以下', city: '北京', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/latest' },
      { period: '2026-03', house_type: '新建商品住宅', size_band: '90-144m2', city: '北京', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/latest' },
      { period: '2026-03', house_type: '新建商品住宅', size_band: '144m2以上', city: '北京', metric: '环比', base: '上月=100', value: '100', source_url: 'https://example.com/latest' },
    ] as CsvRow[];
    const loadedAt = new Date('2026-08-30T08:00:00.000Z');

    expect(getDataStatus(rows, loadedAt)).toEqual({
      latestPeriod: '2026-03',
      cityCount: 2,
      expectedCityCount: 70,
      housingTypes: {
        二手住宅: {
          firstPeriod: '2026-01',
          latestPeriod: '2026-02',
          missingPeriods: [],
        },
        新建商品住宅: {
          firstPeriod: '2026-01',
          latestPeriod: '2026-03',
          missingPeriods: ['2026-02'],
        },
      },
      sourceUrl: 'https://example.com/latest',
      loadedAt,
    });
  });

  it('formats index values as either indices or percentage changes', () => {
    expect(formatDisplayValue(99.2, 'index')).toBe('99.20');
    expect(formatDisplayValue(99.2, 'change')).toBe('-0.80%');
    expect(formatDisplayValue(100.4, 'change')).toBe('+0.40%');
    expect(formatDisplayValue(null, 'change')).toBe('—');
  });

  it('builds latest, three-year, and five-year city comparison metrics', () => {
    const rows = [
      { period: '2021-08', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
      { period: '2023-08', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
      { period: '2025-08', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
      { period: '2026-06', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100.2' },
      { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100.4' },
      { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '同比', base: '上年同月=100', value: '97.5' },
      { period: '2021-08', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
      { period: '2023-08', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
      { period: '2025-08', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
      { period: '2026-06', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '99.8' },
      { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '99.7' },
      { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '同比', base: '上年同月=100', value: '99' },
      { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '环比', base: '上月=100', value: '100.1' },
      { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '同比', base: '上年同月=100', value: '98' },
    ] as CsvRow[];

    const result = getCityComparisonSnapshot(rows, { housingType: '二手住宅' });

    expect(result.period).toBe('2026-07');
    expect(result.rows.map(({ city }) => city)).toEqual(['北京', '广州', '上海']);
    expect(result.rows[0]).toMatchObject({
      monthOverMonth: 0.4000000000000057,
      yearOverYear: -2.5,
    });
    expect(result.rows[0].threeYearGrowth).toBeCloseTo(0.6008, 8);
    expect(result.rows[0].oneYearGrowth).toBeCloseTo(0.6008, 8);
    expect(result.rows[0].fiveYearGrowth).toBeCloseTo(0.6008, 8);
    expect(result.rows[1]).toMatchObject({
      monthOverMonth: 0.09999999999999432,
      yearOverYear: -2,
      threeYearGrowth: null,
      fiveYearGrowth: null,
    });
  });

  it('counts monthly rising, unchanged, and falling cities', () => {
    const rows = [
      { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100.2' },
      { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
      { period: '2026-01', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '环比', base: '上月=100', value: '99.8' },
      { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '99.7' },
      { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
      { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '环比', base: '上月=100', value: '100.1' },
      { period: '2026-02', house_type: '二手住宅', size_band: '全部', city: '广州', metric: '同比', base: '上年同月=100', value: '90' },
    ] as CsvRow[];

    expect(getMarketBreadthSnapshot(rows, { housingType: '二手住宅' })).toEqual({
      latestPeriod: '2026-02',
      points: [
        { period: '2026-01', coverageCities: 3, rising: 1, unchanged: 1, falling: 1 },
        { period: '2026-02', coverageCities: 3, rising: 1, unchanged: 1, falling: 1 },
      ],
    });
  });

  it('calculates quick ranges from natural months and snaps to available periods', () => {
    expect(getQuickRange(['2020-01', '2020-02', '2020-05', '2021-01'], 12)).toEqual({
      startPeriod: '2020-02',
      endPeriod: '2021-01',
    });
    expect(getQuickRange(['2020-01', '2020-05', '2021-01'], 11)).toEqual({
      startPeriod: '2020-05',
      endPeriod: '2021-01',
    });
  });

  it('normalizes a range to type-specific period boundaries', () => {
    expect(normalizePeriodRange(
      { startPeriod: '2017-01', endPeriod: '2020-05' },
      ['2018-03', '2019-01', '2020-05'],
    )).toEqual({ startPeriod: '2018-03', endPeriod: '2020-05' });
    expect(normalizePeriodRange(
      { startPeriod: '2017-01', endPeriod: '2018-01' },
      ['2018-03', '2019-01'],
    )).toEqual({ startPeriod: null, endPeriod: null });
  });

  it('builds one resale summary row with raw latest indices and compounded base growth', () => {
    const result = getSummaryRows(summaryRows, {
      housingType: '二手住宅',
      selectedCities: ['北京'],
      startPeriod: '2023-08',
      endPeriod: '2024-09',
    });
    expect(result[0]).toMatchObject({
      key: '北京__全部',
      city: '北京',
      sizeBand: '全部',
      latestPeriod: '2024-09',
      monthOverMonth: 99,
      yearOverYear: 96.5,
    });
    expect(result[0].baseGrowth).toBeCloseTo(-0.01, 8);
  });

  it('builds one row for each new-build size band in selected city order', () => {
    const result = getSummaryRows(summaryRows, {
      housingType: '新建商品住宅',
      selectedCities: ['上海'],
      startPeriod: '2023-08',
      endPeriod: '2023-09',
    });
    expect(result.map(({ key, sizeBand }) => [key, sizeBand])).toEqual([
      ['上海__90m2及以下', '90m2及以下'],
      ['上海__90-144m2', '90-144m2'],
      ['上海__144m2以上', '144m2以上'],
    ]);
    expect(result.map(({ baseGrowth }) => baseGrowth)).toEqual([2, 1, -1]);
  });

  it('keeps the latest period inside inclusive bounds', () => {
    const result = getSummaryRows(summaryRows, {
      housingType: '二手住宅',
      selectedCities: ['北京'],
      startPeriod: '2023-08',
      endPeriod: '2023-09',
    });
    expect(result[0].latestPeriod).toBe('2023-09');
    expect(result[0].monthOverMonth).toBe(101);
  });

  it('returns null when the latest row has no same-month comparison', () => {
    const result = getSummaryRows(summaryRows.filter((row) => row.metric !== '同比'), {
      housingType: '二手住宅',
      selectedCities: ['北京'],
      startPeriod: '2023-08',
      endPeriod: '2024-09',
    });
    expect(result[0].yearOverYear).toBeNull();
  });

  it('builds a latest-month resale snapshot from valid monthly rows only', () => {
    const result = getLatestMonthOverMonthSnapshot(monthOverMonthRows, {
      housingType: '二手住宅',
    });
    expect(result.period).toBe('2026-07');
    expect(result.points.map(({ city, indexValue, change }) => [city, indexValue, change])).toEqual([
      ['广州', 100.4, 0.4000000000000057],
      ['北京', 99.7, -0.29999999999999716],
      ['上海', 99.7, -0.29999999999999716],
      ['天津', 99, -1],
    ]);
    expect(result.overview).toMatchObject({
      coverageCities: 4,
      rising: 1,
      unchanged: 0,
      falling: 3,
      min: -1,
      max: 0.4000000000000057,
    });
    expect(result.overview.mean).toBeCloseTo(-0.3, 8);
  });

  it('uses the requested new-build size band', () => {
    const result = getLatestMonthOverMonthSnapshot(monthOverMonthRows, {
      housingType: NEW_BUILD_HOUSING,
      sizeBand: '90-144m2',
    });
    expect(result.points).toEqual([{ city: '北京', indexValue: 102.3, change: 2.299999999999997 }]);
    expect(result.overview.rising).toBe(1);
  });
});

describe('filter state', () => {
  it('adds and removes cities without changing existing order or creating duplicates', () => {
    const initial = {
      housingType: '二手住宅' as const,
      selectedCities: ['北京', '上海'],
      startPeriod: null,
      endPeriod: null,
    };
    const added = filterReducer(initial, { type: 'city/toggled', city: '广州', checked: true });
    expect(added.selectedCities).toEqual(['北京', '上海', '广州']);
    expect(filterReducer(added, { type: 'city/toggled', city: '广州', checked: true })).toEqual(added);
    expect(filterReducer(added, { type: 'city/toggled', city: '上海', checked: false }).selectedCities).toEqual(['北京', '广州']);
  });

  it('stores start and end period changes without changing selected cities', () => {
    const initial = {
      housingType: '二手住宅' as const,
      selectedCities: ['北京'],
      startPeriod: null,
      endPeriod: null,
    };
    const withStart = filterReducer(initial, { type: 'period/set', boundary: 'start', period: '2020-01' });
    const withEnd = filterReducer(withStart, { type: 'period/set', boundary: 'end', period: '2024-12' });
    expect(withEnd).toEqual({
      housingType: '二手住宅',
      selectedCities: ['北京'],
      startPeriod: '2020-01',
      endPeriod: '2024-12',
    });
  });

  it('updates housing type and normalized range in one action', () => {
    const initial = {
      housingType: '二手住宅' as const,
      selectedCities: ['北京'],
      startPeriod: null,
      endPeriod: null,
    };
    expect(filterReducer(initial, {
      type: 'housingType/set',
      housingType: NEW_BUILD_HOUSING,
      range: { startPeriod: '2018-03', endPeriod: null },
    })).toMatchObject({
      housingType: NEW_BUILD_HOUSING,
      startPeriod: '2018-03',
      endPeriod: null,
    });
  });
});
