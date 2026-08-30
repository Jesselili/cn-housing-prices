import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetricDisplayToggle } from '../src/components/MetricDisplayToggle';

describe('MetricDisplayToggle', () => {
  it('marks the current display mode and exposes both choices', () => {
    const markup = renderToStaticMarkup(
      <MetricDisplayToggle value="index" onChange={() => undefined} />,
    );

    expect(markup).toContain('指标显示');
    expect(markup).toContain('指数');
    expect(markup).toContain('变化率');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
  });
});
