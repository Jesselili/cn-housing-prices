import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TrendChart } from '../src/components/TrendChart';

describe('TrendChart display mode', () => {
  it('renders cumulative change rates with a zero reference line', () => {
    const markup = renderToStaticMarkup(
      <TrendChart
        displayMode="change"
        housingType="二手住宅"
        periods={['2026-01', '2026-02']}
        series={[{
          key: '北京__全部',
          city: '北京',
          sizeBand: '全部',
          points: [
            { period: '2026-01', value: 100 },
            { period: '2026-02', value: 99.2 },
          ],
        }]}
      />,
    );

    expect(markup).toContain('累计变化率');
    expect(markup).toContain('-0.80%');
    expect(markup).toContain('change-reference-line');
  });
});
