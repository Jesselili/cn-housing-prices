export function getResponsiveChartWidth(
  pointCount: number,
  availableWidth: number,
  minPointWidth: number,
  horizontalPadding: number,
): number {
  return Math.max(
    0,
    Math.ceil(Math.max(availableWidth, horizontalPadding + Math.max(pointCount, 0) * minPointWidth)),
  );
}
