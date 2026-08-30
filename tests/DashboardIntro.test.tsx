import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DashboardIntro } from '../src/components/DashboardIntro';
import { parseCsv } from '../src/data';

const updatedCsv = '\ufeffperiod,house_type,size_band,city,metric,base,value\n'
  + '2025-01,二手住宅,全部,北京,环比,上月=100,100\n'
  + '2025-01,二手住宅,全部,上海,环比,上月=100,100\n'
  + '2025-03,二手住宅,全部,北京,环比,上月=100,100\n'
  + '2025-03,二手住宅,全部,上海,环比,上月=100,100\n'
  + '2025-01,新建商品住宅,90m2及以下,北京,环比,上月=100,100\n'
  + '2025-01,新建商品住宅,90-144m2,北京,环比,上月=100,100\n'
  + '2025-01,新建商品住宅,144m2以上,北京,环比,上月=100,100\n'
  + '2025-02,新建商品住宅,90m2及以下,北京,环比,上月=100,100\n'
  + '2025-02,新建商品住宅,90-144m2,北京,环比,上月=100,100\n'
  + '2025-02,新建商品住宅,144m2以上,北京,环比,上月=100,100\n';

describe('DashboardIntro', () => {
  it('renders the title, description, and visible methodology explanation', () => {
    const markup = renderToStaticMarkup(<DashboardIntro rows={[]} />);

    expect(markup).toContain('中国房产价格指数趋势');
    expect(markup).toContain('基于国家统计局公开的 70 城住宅价格指数构建看板');
    expect(markup).toContain('价格指数 ≠ 房价');
    expect(markup).toContain('原始环比指数');
    expect(markup).toContain('趋势图累计指数');
    expect(markup).toContain('96.7');
    expect(markup).toContain('数据范围');
    expect(markup).toContain('等待 CSV 数据');
    expect(markup).not.toContain('2011-02—2026-07');
    expect(markup).not.toContain('2018-03—2026-07');
    expect(markup).toContain('整月缺失');
    expect(markup).toContain('看板不补值');
    expect(markup).not.toContain('<button');
  });

  it('derives coverage and missing-month copy from the loaded CSV rows', () => {
    const markup = renderToStaticMarkup(<DashboardIntro rows={parseCsv(updatedCsv)} />);

    expect(markup).toContain('二手住宅：2025-01—2025-03');
    expect(markup).toContain('新建住宅：2025-01—2025-02');
    expect(markup).toContain('二手住宅有 1 个月整月无数据（2025-02）');
    expect(markup).toContain('没有发现城市级缺失');
    expect(markup).not.toContain('2026-07');
  });
});
