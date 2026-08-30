import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LprModule } from '../src/components/LprModule';

const points = [
  { publishDate: '2019-08-20', oneYearRate: 4.25, fiveYearRate: 4.85 },
  { publishDate: '2020-01-20', oneYearRate: 4.15, fiveYearRate: 4.8 },
];

describe('LprModule', () => {
  it('renders both rates and explains why five-year LPR matters', () => {
    const markup = renderToStaticMarkup(<LprModule loadState="ready" points={points} error="" />);

    expect(markup).toContain('LPR 利率趋势');
    expect(markup).toContain('4.15%');
    expect(markup).toContain('4.80%');
    expect(markup).toContain('5 年期 LPR');
    expect(markup).toContain('不是房价');
    expect(markup).toContain('房价预期');
    expect(markup).toContain('lpr-line-five-year');
    expect(markup).toContain('lpr-line-one-year');
    expect(markup).toContain('周期：20190820—20200120');
    expect(markup).toContain('LPR（贷款市场报价利率）是银行贷款定价的参考利率，不是房价。5 年期 LPR 更接近长期住房贷款，是观察房贷融资成本的重点指标。LPR 下调通常会降低部分借款人的利息负担，但不会直接决定房价上涨。');
    expect(markup).not.toContain('LPR 是融资成本指标，不是房价');
    expect(markup.indexOf('lpr-methodology')).toBeLessThan(markup.indexOf('lpr-chart-scroll'));
  });

  it('keeps LPR states independent and renders an error without chart data', () => {
    const markup = renderToStaticMarkup(<LprModule loadState="error" points={[]} error="HTTP 503" />);

    expect(markup).toContain('LPR 数据加载失败');
    expect(markup).toContain('HTTP 503');
    expect(markup).not.toContain('<svg');
  });
});
