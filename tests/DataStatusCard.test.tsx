import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataStatusCard } from '../src/components/DataStatusCard';
import type { DataStatus } from '../src/data';

const loadedAt = new Date('2026-08-30T08:00:00.000Z');
const status: DataStatus = {
  latestPeriod: '2026-03',
  cityCount: 2,
  expectedCityCount: 70,
  housingTypes: {
    二手住宅: {
      firstPeriod: '2026-01',
      latestPeriod: '2026-02',
      missingPeriods: [],
    },
    新建商品住宅: {
      firstPeriod: '2026-01',
      latestPeriod: '2026-03',
      missingPeriods: ['2026-02'],
    },
  },
  sourceUrl: 'https://example.com/latest',
  loadedAt,
};

describe('DataStatusCard', () => {
  it('renders dynamic coverage, gaps, source, and page-read time', () => {
    const markup = renderToStaticMarkup(<DataStatusCard status={status} loadState="ready" />);

    expect(markup).toContain('数据状态');
    expect(markup).toContain('2026-03');
    expect(markup).not.toContain('2 / 70 个城市');
    expect(markup).toContain('二手住宅');
    expect(markup).toContain('2026-01—2026-02');
    expect(markup).toContain('新建商品住宅');
    expect(markup).toContain('整月无数据：1 个月（2026-02）');
    expect(markup).toContain('国家统计局原始页面');
    expect(markup).toContain('href="https://example.com/latest"');
    expect(markup).toContain('页面读取时间');
  });

  it('does not show stale metadata while data is unavailable', () => {
    const markup = renderToStaticMarkup(<DataStatusCard status={null} loadState="error" />);

    expect(markup).toContain('数据状态暂不可用');
    expect(markup).not.toContain('国家统计局原始页面');
    expect(markup).not.toContain('href=');
  });
});
