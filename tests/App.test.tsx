import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('App data domains', () => {
  it('groups the 70-city dashboard separately from the LPR module', () => {
    const markup = renderToStaticMarkup(<App />);
    const housingStart = markup.indexOf('housing-dashboard-module');
    const lprStart = markup.indexOf('lpr-module');

    expect(housingStart).toBeGreaterThanOrEqual(0);
    expect(lprStart).toBeGreaterThan(housingStart);
    expect(markup).toContain('中国房产价格指数趋势');
    expect(markup).toContain('LPR 利率趋势');
    expect(markup).toContain('正在加载 LPR 数据');
  });
});
