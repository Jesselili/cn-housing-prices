import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CityComparisonMatrix } from '../src/components/CityComparisonMatrix';
import type { CsvRow } from '../src/data';

const rows: CsvRow[] = [
  { period: '2021-08', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-08', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '环比', base: '上月=100', value: '100.4' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '北京', metric: '同比', base: '上年同月=100', value: '97.5' },
  { period: '2021-08', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2023-08', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '100' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '环比', base: '上月=100', value: '99.7' },
  { period: '2026-07', house_type: '二手住宅', size_band: '全部', city: '上海', metric: '同比', base: '上年同月=100', value: '99' },
];

describe('CityComparisonMatrix', () => {
  it('renders the four comparison columns and default latest-month sorting', () => {
    const markup = renderToStaticMarkup(
      <CityComparisonMatrix loadState="ready" rows={rows} />,
    );

    expect(markup).toContain('70 城横向比较');
    expect(markup).toContain('二手住宅');
    expect(markup).toContain('新建住宅');
    expect(markup).toContain('aria-label="住宅类型"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('最新环比');
    expect(markup).toContain('最新同比');
    expect(markup).toContain('近 1 年累计');
    expect(markup).toContain('近 3 年累计');
    expect(markup).toContain('近 5 年累计');
    expect(markup).toContain('aria-sort="descending"');
    expect(markup.indexOf('北京')).toBeLessThan(markup.indexOf('上海'));
    expect(markup).toContain('+0.40%');
    expect(markup).toContain('-2.50%');
  });
});
