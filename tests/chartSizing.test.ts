import { describe, expect, it } from 'vitest';
import { getResponsiveChartWidth } from '../src/chartSizing';

describe('getResponsiveChartWidth', () => {
  it('fills the card when the data fits comfortably', () => {
    expect(getResponsiveChartWidth(6, 1600, 42, 96)).toBe(1600);
  });

  it('keeps the minimum data width when many points need more room', () => {
    expect(getResponsiveChartWidth(70, 900, 42, 96)).toBe(3036);
  });
});
