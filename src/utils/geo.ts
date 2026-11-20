import { geoMercator, GeoProjection } from 'd3-geo';

// Simplified outline polygon of India (lat/lng coordinates)
export const INDIA_BOUNDARY_COORDS: [number, number][] = [
  [74.0, 36.5], [77.5, 35.5], [79.0, 32.5], [80.5, 30.5], [81.5, 29.5],
  [88.0, 27.8], [88.5, 27.0], [89.8, 26.2], [92.0, 27.5], [96.5, 28.2],
  [97.0, 27.0], [95.0, 26.0], [94.0, 24.0], [92.5, 22.0], [92.0, 21.0],
  [89.0, 21.5], [87.0, 21.5], [85.5, 19.5], [83.0, 18.0], [80.3, 16.0],
  [80.0, 13.0], [79.8, 10.0], [77.5, 8.1],  [76.5, 9.5],  [75.0, 12.0],
  [73.5, 15.5], [72.8, 19.0], [72.5, 21.0], [69.0, 22.0], [68.2, 23.5],
  [71.0, 24.5], [70.5, 27.5], [74.0, 30.5], [74.5, 32.5], [74.0, 34.5],
  [74.0, 36.5]
];

export function createIndiaProjection(width: number, height: number): GeoProjection {
  // Center roughly at 80° E, 22° N
  return geoMercator()
    .center([81.5, 22.0])
    .scale(Math.min(width, height) * 1.6)
    .translate([width / 2, height / 2]);
}

/**
 * Projects a [lat, lng] to SVG [x, y] coordinates
 */
export function projectLatLng(
  lat: number,
  lng: number,
  projection: GeoProjection
): [number, number] | null {
  const result = projection([lng, lat]);
  if (!result) return null;
  return [result[0], result[1]];
}

/**
 * Computes a curved SVG arc path between two points with a gentle curve
 */
export function createFlightArcPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Slight perpendicular offset for gentle curvature
  const curvature = 0.22;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Normal vector perpendicular to line
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);

  // Control point
  const cx = midX + nx * (dist * curvature);
  const cy = midY + ny * (dist * curvature);

  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/**
 * Calculates current plane position along the quadratic Bezier curve
 * t ranges from 0.0 (departure) to 1.0 (arrival)
 */
export function getArcPosition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
): { x: number; y: number; angleDeg: number } {
  const clampedT = Math.max(0, Math.min(1, t));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const curvature = 0.22;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);

  const cx = midX + nx * (dist * curvature);
  const cy = midY + ny * (dist * curvature);

  // B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const oneMinusT = 1 - clampedT;
  const x = oneMinusT * oneMinusT * x1 + 2 * oneMinusT * clampedT * cx + clampedT * clampedT * x2;
  const y = oneMinusT * oneMinusT * y1 + 2 * oneMinusT * clampedT * cy + clampedT * clampedT * y2;

  // Derivative B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
  const tangentX = 2 * oneMinusT * (cx - x1) + 2 * clampedT * (x2 - cx);
  const tangentY = 2 * oneMinusT * (cy - y1) + 2 * clampedT * (y2 - cy);
  const angleDeg = (Math.atan2(tangentY, tangentX) * 180) / Math.PI;

  return { x, y, angleDeg };
}
