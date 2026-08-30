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
  });

  it('keeps LPR states independent and renders an error without chart data', () => {
    const markup = renderToStaticMarkup(<LprModule loadState="error" points={[]} error="HTTP 503" />);

    expect(markup).toContain('LPR 数据加载失败');
    expect(markup).toContain('HTTP 503');
    expect(markup).not.toContain('<svg');
  });
});
