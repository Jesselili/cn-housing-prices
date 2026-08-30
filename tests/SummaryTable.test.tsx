import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SummaryTable } from '../src/components/SummaryTable';
import type { SummaryRow } from '../src/data';

const rows: SummaryRow[] = [
  {
    key: '北京__90m2及以下',
    city: '北京',
    sizeBand: '90m2及以下',
    latestPeriod: '2026-03',
    monthOverMonth: 99.4,
    yearOverYear: 96.6,
    baseGrowth: -10.19,
  },
  {
    key: '北京__90-144m2',
    city: '北京',
    sizeBand: '90-144m2',
    latestPeriod: null,
    monthOverMonth: null,
    yearOverYear: null,
    baseGrowth: null,
  },
];

describe('SummaryTable', () => {
  it('renders the dynamic base header and formatted new-build summary values', () => {
    const markup = renderToStaticMarkup(
      <SummaryTable rows={rows} housingType="新建商品住宅" basePeriod="2023-08" />,
    );

    expect(markup).toContain('相比基期涨幅（2023-08）');
    expect(markup).toContain('北京 · 90m²及以下');
    expect(markup).toContain('2026年03月');
    expect(markup).toContain('99.4');
    expect(markup).toContain('96.6');
    expect(markup).toContain('-10.19%');
    expect(markup).toContain('—');
  });

  it('renders month-over-month and year-over-year values as changes in change mode', () => {
    const markup = renderToStaticMarkup(
      <SummaryTable displayMode="change" rows={rows} housingType="新建商品住宅" basePeriod="2023-08" />,
    );

    expect(markup).toContain('环比变化');
    expect(markup).toContain('同比变化');
    expect(markup).toContain('-0.60%');
    expect(markup).toContain('-3.40%');
    expect(markup).toContain('-10.19%');
  });
});
