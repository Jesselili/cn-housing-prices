import { useMemo, useState, type CSSProperties } from 'react';
import {
  getCityComparisonSnapshot,
  NEW_BUILD_HOUSING,
  NEW_BUILD_SIZE_BANDS,
  RESALE_HOUSING,
  type CityComparisonMetric,
  type CityComparisonRow,
  type CsvRow,
  type HousingType,
  type SizeBand,
} from '../data';

type LoadState = 'loading' | 'ready' | 'error';
type SortDirection = 'ascending' | 'descending';

interface CityComparisonMatrixProps {
  rows: CsvRow[];
  loadState: LoadState;
}

const SIZE_BAND_LABELS: Record<string, string> = {
  '90m2及以下': '90m²及以下',
  '90-144m2': '90–144m²',
  '144m2以上': '144m²以上',
};

const COLUMNS: Array<{ key: CityComparisonMetric; label: string }> = [
  { key: 'monthOverMonth', label: '最新环比' },
  { key: 'yearOverYear', label: '最新同比' },
  { key: 'oneYearGrowth', label: '近 1 年累计' },
  { key: 'threeYearGrowth', label: '近 3 年累计' },
  { key: 'fiveYearGrowth', label: '近 5 年累计' },
];

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function sortRows(rows: CityComparisonRow[], sortKey: CityComparisonMetric, direction: SortDirection): CityComparisonRow[] {
  return [...rows].sort((left, right) => {
    const leftValue = left[sortKey];
    const rightValue = right[sortKey];
    if (leftValue === null && rightValue === null) return left.city.localeCompare(right.city, 'zh-CN');
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    if (leftValue !== rightValue) return direction === 'descending' ? rightValue - leftValue : leftValue - rightValue;
    return left.city.localeCompare(right.city, 'zh-CN');
  });
}

function heatStyle(value: number | null, maxAbs: number): CSSProperties {
  if (value === null || !Number.isFinite(value)) return {};
  const intensity = 0.08 + Math.min(Math.abs(value) / maxAbs, 1) * 0.27;
  return {
    backgroundColor: value > 0
      ? `rgba(47, 128, 237, ${intensity})`
      : value < 0
        ? `rgba(230, 120, 98, ${intensity})`
        : '#f7f5f1',
  };
}

export function CityComparisonMatrix({ rows, loadState }: CityComparisonMatrixProps) {
  const [housingType, setHousingType] = useState<HousingType>(RESALE_HOUSING);
  const [sizeBand, setSizeBand] = useState<SizeBand>(NEW_BUILD_SIZE_BANDS[0]);
  const [sortKey, setSortKey] = useState<CityComparisonMetric>('monthOverMonth');
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending');
  const snapshot = useMemo(
    () => getCityComparisonSnapshot(rows, { housingType, sizeBand }),
    [rows, housingType, sizeBand],
  );
  const sortedRows = useMemo(
    () => sortRows(snapshot.rows, sortKey, sortDirection),
    [snapshot.rows, sortKey, sortDirection],
  );
  const maxAbsByMetric = useMemo(() => Object.fromEntries(
    COLUMNS.map(({ key }) => [
      key,
      Math.max(...snapshot.rows.map((row) => Math.abs(row[key] ?? 0)), 1),
    ]),
  ) as Record<CityComparisonMetric, number>, [snapshot.rows]);

  const handleSort = (nextKey: CityComparisonMetric) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => current === 'descending' ? 'ascending' : 'descending');
      return;
    }
    setSortKey(nextKey);
    setSortDirection('descending');
  };

  return (
    <section className="city-matrix-module" aria-labelledby="city-matrix-title">
      <header className="city-matrix-header">
        <div className="city-matrix-title-copy">
          <span className="city-matrix-kicker">70-CITY COMPARISON</span>
          <h2 id="city-matrix-title">70 城横向比较</h2>
          <p>{snapshot.period ? `最新数据：${snapshot.period} · 所有数值均为变化率` : '等待可用数据'}</p>
        </div>
        <div className="city-matrix-controls">
          <div className="city-matrix-type-control" role="group" aria-label="住宅类型">
            <button
              className={housingType === RESALE_HOUSING ? 'is-active' : ''}
              type="button"
              aria-pressed={housingType === RESALE_HOUSING}
              onClick={() => setHousingType(RESALE_HOUSING)}
            >
              二手住宅
            </button>
            <button
              className={housingType === NEW_BUILD_HOUSING ? 'is-active' : ''}
              type="button"
              aria-pressed={housingType === NEW_BUILD_HOUSING}
              onClick={() => setHousingType(NEW_BUILD_HOUSING)}
            >
              新建住宅
            </button>
          </div>
          {housingType === NEW_BUILD_HOUSING && (
            <div className="city-matrix-size-control" role="group" aria-label="新建住宅户型">
              {NEW_BUILD_SIZE_BANDS.map((option) => (
              <button
                className={sizeBand === option ? 'is-active' : ''}
                type="button"
                aria-pressed={sizeBand === option}
                key={option}
                onClick={() => setSizeBand(option)}
              >
                {SIZE_BAND_LABELS[option]}
              </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {loadState === 'loading' && <div className="city-matrix-empty">正在加载 70 城数据…</div>}
      {loadState === 'error' && <div className="city-matrix-empty is-error">数据加载失败，无法生成城市比较矩阵。</div>}
      {loadState === 'ready' && !snapshot.rows.length && <div className="city-matrix-empty">当前住宅类型没有可用的城市比较数据。</div>}
      {loadState === 'ready' && snapshot.rows.length > 0 && (
        <div className="city-matrix-scroll">
          <table className="city-matrix-table">
            <caption className="city-matrix-caption">{housingType} 70 城价格变化率比较</caption>
            <thead>
              <tr>
                <th scope="col">城市</th>
                {COLUMNS.map(({ key, label }) => (
                  <th scope="col" aria-sort={sortKey === key ? sortDirection : 'none'} key={key}>
                    <button type="button" onClick={() => handleSort(key)} aria-label={`按${label}排序`}>
                      <span>{label}</span>
                      <span className="city-matrix-sort-icon" aria-hidden="true">{sortKey === key ? (sortDirection === 'descending' ? '↓' : '↑') : '↕'}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.city}</th>
                  {COLUMNS.map(({ key }) => {
                    const value = row[key];
                    return (
                      <td
                        className={`city-matrix-value${value === null ? ' is-empty' : value > 0 ? ' is-positive' : value < 0 ? ' is-negative' : ' is-neutral'}`}
                        key={key}
                        style={heatStyle(value, maxAbsByMetric[key])}
                      >
                        {formatPercent(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
