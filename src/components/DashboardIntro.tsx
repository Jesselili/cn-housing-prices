import {
  getHousingDataCoverage,
  NEW_BUILD_HOUSING,
  RESALE_HOUSING,
  type CsvRow,
  type HousingDataCoverage,
} from '../data';

interface DashboardIntroProps {
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

function formatCoverageRange(coverage: HousingDataCoverage): string {
  return coverage.startPeriod && coverage.endPeriod
    ? `${coverage.startPeriod}—${coverage.endPeriod}`
    : '等待 CSV 数据';
}

function formatMissingMonths(label: string, coverage: HousingDataCoverage): string {
  if (!coverage.startPeriod) return `${label}等待 CSV 数据`;
  if (!coverage.missingPeriods.length) return `${label}没有整月缺失`;
  return `${label}有 ${coverage.missingPeriods.length} 个月整月无数据（${formatPeriodRanges(coverage.missingPeriods)}）`;
}

function formatCityMissing(coverage: HousingDataCoverage): string {
  if (!coverage.startPeriod) return '等待 CSV 数据';
  if (!coverage.cityMissingPeriods.length) return '没有发现城市级缺失';
  return coverage.cityMissingPeriods
    .map(({ city, periods }) => `${city}（${formatPeriodRanges(periods)}）`)
    .join('、');
}

export function DashboardIntro({ rows = [] }: DashboardIntroProps) {
  const resaleCoverage = getHousingDataCoverage(rows, RESALE_HOUSING);
  const newBuildCoverage = getHousingDataCoverage(rows, NEW_BUILD_HOUSING);

  return (
    <header className="dashboard-intro" aria-labelledby="dashboard-title">
      <h1 id="dashboard-title">中国房产价格指数趋势</h1>
      <p className="dashboard-description">基于国家统计局公开的 70 城住宅价格指数构建看板</p>
      <section className="methodology-note" aria-labelledby="methodology-title">
        <h2 id="methodology-title">口径说明</h2>
        <p className="methodology-lead"><strong>价格指数 ≠ 房价</strong></p>
        <p>
          本看板展示的是价格指数，不是每平方米成交单价。指数以 100 为基准：100 表示与对应比较基期持平，高于 100 表示上涨，低于 100 表示下跌。指数下跌 10%，只能说明指数相对对应比较基期下降约 10%，不能直接等同于实际房价下跌 10%。
        </p>
        <ol>
          <li><strong>原始环比指数：</strong>如果某月的环比指数是 <code>96.7</code>，表示该月相比上月下降约 <code>3.3%</code>。</li>
          <li><strong>趋势图累计指数：</strong>如果趋势图显示 <code>96.7</code>，表示相比所选基期累计下降约 <code>3.3%</code>，不是该月单月环比。</li>
        </ol>
        <div className="methodology-data">
          <p><strong>数据范围：</strong>二手住宅：{formatCoverageRange(resaleCoverage)}；新建住宅：{formatCoverageRange(newBuildCoverage)}。</p>
          <p><strong>整月缺失：</strong>{formatMissingMonths('二手住宅', resaleCoverage)}；{formatMissingMonths('新建住宅', newBuildCoverage)}。</p>
          <p><strong>城市级缺失：</strong>二手住宅：{formatCityMissing(resaleCoverage)}；新建住宅：{formatCityMissing(newBuildCoverage)}。</p>
          <p><strong>看板不补值：</strong>整月无数据的月份不会出现在横轴；单个城市缺失时该点为空，累计趋势仅基于现有有效记录计算。</p>
        </div>
      </section>
    </header>
  );
}
