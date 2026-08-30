import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('App data domains', () => {
  it('groups the 70-city dashboard separately from the LPR module', () => {
    const markup = renderToStaticMarkup(<App />);
    const housingStart = markup.indexOf('housing-dashboard-module');
    const lprStart = markup.indexOf('lpr-module');
    const pageTitleStart = markup.indexOf('中国房产趋势');

    expect(housingStart).toBeGreaterThanOrEqual(0);
    expect(lprStart).toBeGreaterThan(housingStart);
    expect(pageTitleStart).toBeGreaterThanOrEqual(0);
    expect(pageTitleStart).toBeLessThan(housingStart);
    expect(markup).toContain('70 城价格指数趋势');
    expect(markup).toContain('基于国家统计局公开的 70 城住宅价格指数构建看板');
    expect(markup).toContain('LPR 利率趋势');
    expect(markup).toContain('正在加载 LPR 数据');
    expect(markup).not.toContain('DATA STATUS');
    expect(markup).not.toContain('MONTHLY HOUSING INDEX');
    expect(markup).not.toContain('70-CITY COMPARISON');
    expect(markup).not.toContain('MARKET BREADTH');
    expect(markup).not.toContain('LATEST MONTHLY CHANGE');
    expect(markup).not.toContain('LOAN PRIME RATE');
  });
});
