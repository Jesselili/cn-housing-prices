import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DashboardIntro } from '../src/components/DashboardIntro';
import { HousingDataHeader } from '../src/components/HousingDataHeader';

describe('DashboardIntro', () => {
  it('renders the independent page title without the 70-city subtitle', () => {
    const markup = renderToStaticMarkup(<DashboardIntro />);

    expect(markup).toContain('中国房产趋势');
    expect(markup).not.toContain('中国房产价格指数趋势');
    expect(markup).not.toContain('70 城价格指数趋势');
    expect(markup).not.toContain('基于国家统计局公开的 70 城住宅价格指数构建看板');
    expect(markup).not.toContain('价格指数 ≠ 房价');
    expect(markup).not.toContain('<section');
  });

  it('renders the 70-city title, subtitle, and methodology inside its data domain', () => {
    const markup = renderToStaticMarkup(<HousingDataHeader />);

    expect(markup).toContain('70 城价格指数趋势');
    expect(markup).toContain('基于国家统计局公开的 70 城住宅价格指数构建看板');
    expect(markup).toContain('价格指数 ≠ 房价');
    expect(markup).toContain('原始环比指数');
    expect(markup).toContain('趋势图累计指数');
    expect(markup).toContain('96.7');
    expect(markup).not.toContain('2011-02—2026-07');
    expect(markup).not.toContain('2018-03—2026-07');
    expect(markup).not.toContain('数据范围');
    expect(markup).not.toContain('整月缺失');
    expect(markup).not.toContain('看板不补值');
    expect(markup).not.toContain('<button');
  });

  it('keeps loaded data coverage details out of the intro module', () => {
    const markup = renderToStaticMarkup(<HousingDataHeader />);

    expect(markup).not.toContain('二手住宅：2025-01—2025-03');
    expect(markup).not.toContain('新建住宅：2025-01—2025-02');
    expect(markup).not.toContain('二手住宅有 1 个月整月无数据（2025-02）');
    expect(markup).not.toContain('没有发现城市级缺失');
    expect(markup).not.toContain('2026-07');
  });
});
