import type { HousingType, SizeBand, SummaryRow } from '../data';

interface SummaryTableProps {
  rows: SummaryRow[];
  housingType: HousingType;
  basePeriod: string | null;
}

const SIZE_BAND_LABELS: Partial<Record<SizeBand, string>> = {
  '90m2及以下': '90m²及以下',
  '90-144m2': '90–144m²',
  '144m2以上': '144m²以上',
};

function formatPeriod(period: string | null): string {
  if (!period) return '—';
  const [year, month] = period.split('-');
  return `${year}年${month}月`;
}

function formatIndex(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : value.toFixed(1);
}

function formatGrowth(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatCity(row: SummaryRow, housingType: HousingType): string {
  if (housingType === '新建商品住宅') {
    return `${row.city} · ${SIZE_BAND_LABELS[row.sizeBand] ?? row.sizeBand}`;
  }
  return row.city;
}

export function SummaryTable({ rows, housingType, basePeriod }: SummaryTableProps) {
  const growthHeading = `相比基期涨幅（${basePeriod ?? '—'}）`;

  return (
    <section className="summary-section" aria-labelledby="summary-title">
      <div className="summary-header">
        <div>
          <span className="summary-kicker">LATEST SNAPSHOT</span>
          <h2 id="summary-title">最新数据摘要</h2>
        </div>
        <span className="summary-description">原始指数 · 基期累计变化</span>
      </div>
      {rows.length === 0 ? (
        <div className="summary-empty" role="status">当前选择没有可用的摘要数据。</div>
      ) : (
        <div className="summary-table-wrap">
          <table className="summary-table">
            <caption className="summary-table-caption">{housingType}最新房价指数摘要</caption>
            <thead>
              <tr>
                <th scope="col">城市</th>
                <th scope="col">最新月份</th>
                <th scope="col">环比（上月=100）</th>
                <th scope="col">同比（去年同月=100）</th>
                <th scope="col">{growthHeading}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{formatCity(row, housingType)}</th>
                  <td>{formatPeriod(row.latestPeriod)}</td>
                  <td className="summary-number">{formatIndex(row.monthOverMonth)}</td>
                  <td className="summary-number">{formatIndex(row.yearOverYear)}</td>
                  <td className={`summary-growth${row.baseGrowth !== null ? (row.baseGrowth >= 0 ? ' is-positive' : ' is-negative') : ''}`}>
                    <span>{formatGrowth(row.baseGrowth)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
