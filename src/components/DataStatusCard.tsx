import { getHousingDataCoverage, type CsvRow, type DataStatus, type HousingType } from '../data';

type LoadState = 'loading' | 'ready' | 'error';

interface DataStatusCardProps {
  status: DataStatus | null;
  loadState: LoadState;
  rows?: CsvRow[];
}

function monthIndex(period: string): number {
  const [year, month] = period.split('-').map(Number);
  return year * 12 + month;
}

function formatPeriodRanges(periods: string[]): string {
  const groups: string[][] = [];
  periods.forEach((period) => {
    const previousGroup = groups.at(-1);
    if (!previousGroup || monthIndex(period) !== monthIndex(previousGroup.at(-1)!) + 1) {
      groups.push([period]);
    } else {
      previousGroup.push(period);
    }
  });
  return groups.map((group) => {
    const start = group[0];
    const end = group.at(-1)!;
    if (start === end) return start;
    return start.slice(0, 4) === end.slice(0, 4)
      ? `${start}～${end.slice(5)}`
      : `${start}～${end}`;
  }).join('、');
}

function formatCoverageRange(firstPeriod: string | null, latestPeriod: string | null): string {
  return firstPeriod && latestPeriod ? `${firstPeriod}—${latestPeriod}` : '暂无数据';
}

function formatLoadedAt(loadedAt: Date | null): string {
  if (!loadedAt) return '暂无数据';
  return loadedAt.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMissingPeriods(periods: string[]): string {
  return periods.length
    ? `整月无数据：${periods.length} 个月（${formatPeriodRanges(periods)}）`
    : '整月无数据：无';
}

function formatCityMissing(rows: CsvRow[], housingType: HousingType): string {
  const coverage = getHousingDataCoverage(rows, housingType);
  if (!coverage.startPeriod) return '城市级缺失：暂无数据';
  if (!coverage.cityMissingPeriods.length) return '城市级缺失：无';
  return `城市级缺失：${coverage.cityMissingPeriods
    .map(({ city, periods }) => `${city}（${formatPeriodRanges(periods)}）`)
    .join('、')}`;
}

export function DataStatusCard({ status, loadState, rows = [] }: DataStatusCardProps) {
  const unavailable = loadState !== 'ready' || !status;

  return (
    <section className="data-status-card" aria-labelledby="data-status-title">
      <div className="data-status-header">
        <div>
          <span className="data-status-kicker">DATA STATUS</span>
          <h2 id="data-status-title">数据状态</h2>
        </div>
      </div>
      {unavailable ? (
        <div className="data-status-empty" role="status">
          {loadState === 'loading' ? '正在读取 CSV 数据…' : '数据状态暂不可用'}
        </div>
      ) : (
        <>
          <div className="data-status-overview">
            <div className="data-status-stat">
              <span>最新数据月份</span>
              <strong>{status.latestPeriod ?? '暂无数据'}</strong>
            </div>
            <div className="data-status-stat">
              <span>来源</span>
              {status.sourceUrl ? (
                <a href={status.sourceUrl} target="_blank" rel="noreferrer">国家统计局原始页面</a>
              ) : <strong>暂无来源链接</strong>}
            </div>
          </div>
          <div className="data-status-details">
            {(['二手住宅', '新建商品住宅'] as const).map((housingType) => {
              const coverage = status.housingTypes[housingType];
              return (
                <div className="data-status-detail" key={housingType}>
                  <span>{housingType}</span>
                  <strong>{formatCoverageRange(coverage.firstPeriod, coverage.latestPeriod)}</strong>
                  <small>{formatMissingPeriods(coverage.missingPeriods)}</small>
                  <small>{formatCityMissing(rows, housingType)}</small>
                </div>
              );
            })}
          </div>
          <div className="data-status-footer">
            <span>页面读取时间：{formatLoadedAt(status.loadedAt)}</span>
            <span>整月无数据的月份不会出现在横轴；单个城市缺失时该点为空，累计趋势仅基于现有有效记录计算。</span>
          </div>
        </>
      )}
    </section>
  );
}
