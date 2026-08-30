import { useEffect, useMemo, useReducer, useState } from 'react';
import { CityPicker } from './components/CityPicker';
import { CityComparisonMatrix } from './components/CityComparisonMatrix';
import { DateRangeFilter } from './components/DateRangeFilter';
import { DataStatusCard } from './components/DataStatusCard';
import { DashboardIntro } from './components/DashboardIntro';
import { HousingDataHeader } from './components/HousingDataHeader';
import { HousingTypeToggle } from './components/HousingTypeToggle';
import { MetricDisplayToggle } from './components/MetricDisplayToggle';
import { MarketBreadthModule } from './components/MarketBreadthModule';
import { LprModule } from './components/LprModule';
import { MonthOverMonthModule } from './components/MonthOverMonthModule';
import { SummaryTable } from './components/SummaryTable';
import { TrendChart } from './components/TrendChart';
import {
  getAvailablePeriods,
  getDataStatus,
  getPeriods,
  getSummaryRows,
  getVisibleSeries,
  normalizePeriodRange,
  parseLprCsv,
  parseCsv,
  type CsvRow,
  type LprPoint,
  type MetricDisplayMode,
} from './data';
import { DEFAULT_CITIES, DEFAULT_FILTER_STATE, filterReducer } from './filterState';
import './styles.css';

type LoadState = 'loading' | 'ready' | 'error';
const REQUIRED_FIELDS = ['period', 'house_type', 'size_band', 'city', 'metric', 'base', 'value'];

export default function App() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [lprPoints, setLprPoints] = useState<LprPoint[]>([]);
  const [lprLoadState, setLprLoadState] = useState<LoadState>('loading');
  const [lprLoadError, setLprLoadError] = useState('');
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [displayMode, setDisplayMode] = useState<MetricDisplayMode>('index');
  const [filters, dispatch] = useReducer(filterReducer, DEFAULT_FILTER_STATE);

  useEffect(() => {
    let active = true;
    fetch('/data/house_price_index_all.csv')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        const nextRows = parseCsv(text);
        const missingFields = REQUIRED_FIELDS.filter((field) => !(field in (nextRows[0] || {})));
        if (!nextRows.length || missingFields.length) throw new Error('CSV 字段不完整');
        if (!active) return;
        setRows(nextRows);
        setLoadedAt(new Date());
        const available = new Set(nextRows.map((row) => row.city));
        DEFAULT_CITIES.filter((city) => !available.has(city)).forEach((city) => {
          dispatch({ type: 'city/toggled', city, checked: false });
        });
        setLoadState('ready');
      })
      .catch((error: Error) => {
        if (!active) return;
        setLoadError(error.message);
        setLoadedAt(null);
        setLoadState('error');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/data/LPR.csv')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((text) => {
        if (!active) return;
        setLprPoints(parseLprCsv(text));
        setLprLoadError('');
        setLprLoadState('ready');
      })
      .catch((error: Error) => {
        if (!active) return;
        setLprPoints([]);
        setLprLoadError(error.message);
        setLprLoadState('error');
      });
    return () => { active = false; };
  }, []);

  const availableCities = useMemo(
    () => [...new Set(rows.map((row) => row.city).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN')),
    [rows],
  );
  const dataStatus = useMemo(
    () => rows.length ? getDataStatus(rows, loadedAt) : null,
    [rows, loadedAt],
  );
  const periodCities = filters.selectedCities.length ? filters.selectedCities : undefined;
  const availablePeriods = useMemo(
    () => getAvailablePeriods(rows, { housingType: filters.housingType, cities: periodCities }),
    [rows, filters.housingType, filters.selectedCities],
  );
  const rangeInvalid = Boolean(
    filters.startPeriod && filters.endPeriod && filters.startPeriod > filters.endPeriod,
  );
  const effectiveRange = useMemo(
    () => normalizePeriodRange(filters, availablePeriods),
    [filters.startPeriod, filters.endPeriod, availablePeriods],
  );
  const effectiveFilters = useMemo(
    () => ({ ...filters, ...effectiveRange }),
    [filters, effectiveRange],
  );
  const visibleSeries = useMemo(
    () => rangeInvalid ? [] : getVisibleSeries(rows, effectiveFilters),
    [rows, effectiveFilters, rangeInvalid],
  );
  const periods = useMemo(() => getPeriods(visibleSeries), [visibleSeries]);
  const summaryRows = useMemo(
    () => rangeInvalid ? [] : getSummaryRows(rows, effectiveFilters),
    [rows, effectiveFilters, rangeInvalid],
  );
  const summaryBasePeriod = effectiveRange.startPeriod ?? availablePeriods[0] ?? null;

  const handleHousingTypeChange = (housingType: typeof filters.housingType) => {
    const nextPeriods = getAvailablePeriods(rows, { housingType, cities: periodCities });
    const range = normalizePeriodRange(filters, nextPeriods);
    dispatch({ type: 'housingType/set', housingType, range });
  };

  const handleDateRangeChange = (startPeriod: string | null, endPeriod: string | null) => {
    dispatch({ type: 'period/set', boundary: 'start', period: startPeriod });
    dispatch({ type: 'period/set', boundary: 'end', period: endPeriod });
  };

  const statusMessage = loadState === 'loading'
    ? '正在加载房价数据…'
    : loadState === 'error'
      ? `房价数据加载失败：${loadError}`
      : rangeInvalid
        ? '起始月份不能晚于结束月份'
      : !filters.selectedCities.length
        ? '尚未选择城市，请从右上角添加要查看的趋势。'
        : !visibleSeries.length
          ? '当前选择没有可用的环比数据。'
          : `${filters.housingType} · ${visibleSeries.length} 条趋势线`;

  return (
    <main className="page-shell">
      <DashboardIntro />
      <section className="housing-dashboard-module" aria-labelledby="housing-data-title">
        <HousingDataHeader />
        <DataStatusCard loadState={loadState} rows={rows} status={dataStatus} />
        <section className="trend-card" aria-labelledby="page-title">
          <header className="card-header">
            <div className="title-copy">
              <h1 id="page-title">房价趋势</h1>
              <p className="dataset-summary">
                {loadState === 'ready' ? `${rows.length.toLocaleString('zh-CN')} 条月度记录 · 首月归一为 100` : '正在读取国家统计局 70 城数据…'}
              </p>
            </div>
            <div className="controls" aria-label="图表筛选">
              <HousingTypeToggle
                disabled={loadState !== 'ready'}
                value={filters.housingType}
                onChange={handleHousingTypeChange}
              />
              <MetricDisplayToggle value={displayMode} onChange={setDisplayMode} />
              <DateRangeFilter
                periods={availablePeriods}
                disabled={loadState !== 'ready' || !availablePeriods.length}
                endPeriod={effectiveRange.endPeriod}
                onChange={handleDateRangeChange}
                startPeriod={effectiveRange.startPeriod}
              />
              <CityPicker
                cities={availableCities}
                disabled={loadState !== 'ready'}
                selectedCities={filters.selectedCities}
                onToggle={(city, checked) => dispatch({ type: 'city/toggled', city, checked })}
              />
            </div>
          </header>
          <div className={`chart-status${loadState === 'error' || rangeInvalid ? ' is-error' : !visibleSeries.length ? ' is-empty' : ''}`} role="status" aria-live="polite">
            <span>{statusMessage}</span>
            {loadState === 'ready' && periods.length > 0 && <span>{periods[0]} — {periods.at(-1)}</span>}
          </div>
          <div className="chart-scroll">
            {loadState === 'loading' && <div className="loading-state"><span className="loading-bar" /><span className="loading-bar short" /></div>}
            {loadState === 'error' && <div className="empty-state is-error"><strong>数据加载失败</strong><span>请检查本地开发服务是否从项目根目录启动。</span></div>}
            {loadState === 'ready' && rangeInvalid && <div className="empty-state is-error"><strong>日期范围无效</strong><span>起始月份不能晚于结束月份</span></div>}
            {loadState === 'ready' && !rangeInvalid && <TrendChart displayMode={displayMode} housingType={filters.housingType} periods={periods} series={visibleSeries} />}
          </div>
          {loadState === 'ready' && !rangeInvalid && (
            <SummaryTable
              basePeriod={summaryBasePeriod}
              displayMode={displayMode}
              housingType={filters.housingType}
              rows={summaryRows}
            />
          )}
          <footer className="card-footer">
            <span>口径：月度环比指数连乘，首月归一为 100</span>
            <span>数据范围随 CSV 更新</span>
          </footer>
        </section>
        <CityComparisonMatrix loadState={loadState} rows={rows} />
        <MarketBreadthModule loadState={loadState} rows={rows} />
        <MonthOverMonthModule loadState={loadState} rows={rows} />
      </section>
      <LprModule loadState={lprLoadState} points={lprPoints} error={lprLoadError} />
    </main>
  );
}
