import type { CsvRow } from '../data';

interface DashboardIntroProps {
  rows?: CsvRow[];
}

export function DashboardIntro(_props: DashboardIntroProps) {
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
      </section>
    </header>
  );
}
