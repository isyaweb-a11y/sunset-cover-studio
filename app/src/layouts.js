// Panel layouts for Sunset Cover Studio.
//
// Every layout is a set of polygons in unit space (x and y run 0..1 across the
// cover). Neighbouring panels share slanted edges, GTA-poster style: the
// dividers lean instead of running straight, so a collage feels cut from one
// sheet of artwork rather than tiled. The renderer scales these polygons to
// whatever export size is asked for, expands each a hair past its neighbours
// so no background can peek through a seam, and strokes a thin light border
// along every edge.

/** One panel: a display name and its polygon as [x, y] points in unit space. */
function panel(name, points) {
  return { name, points };
}

/** The six poster layouts, weakest to busiest. */
export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero',
    blurb: 'One full-bleed portrait panel',
    panels: [
      panel('Hero', [[0, 0], [1, 0], [1, 1], [0, 1]]),
    ],
  },
  {
    id: 'split2',
    name: 'Angled Split',
    blurb: 'Two panels, one leaning divider',
    panels: [
      panel('Left', [[0, 0], [0.62, 0], [0.42, 1], [0, 1]]),
      panel('Right', [[0.62, 0], [1, 0], [1, 1], [0.42, 1]]),
    ],
  },
  {
    id: 'trio3',
    name: 'Trio',
    blurb: 'Tall lead panel, two stacked beside it',
    panels: [
      panel('Lead', [[0, 0], [0.52, 0], [0.44, 1], [0, 1]]),
      panel('Upper', [[0.52, 0], [1, 0], [1, 0.5], [0.48, 0.5]]),
      panel('Lower', [[0.48, 0.5], [1, 0.5], [1, 1], [0.44, 1]]),
    ],
  },
  {
    id: 'quad4',
    name: 'Quad',
    blurb: 'Four panels around a slanted cross',
    panels: [
      panel('Top left', [[0, 0], [0.54, 0], [0.5, 0.5], [0, 0.52]]),
      panel('Top right', [[0.54, 0], [1, 0], [1, 0.48], [0.5, 0.5]]),
      panel('Bottom left', [[0, 0.52], [0.5, 0.5], [0.46, 1], [0, 1]]),
      panel('Bottom right', [[0.5, 0.5], [1, 0.48], [1, 1], [0.46, 1]]),
    ],
  },
  {
    id: 'collage5',
    name: 'Poster Collage',
    blurb: 'The classic five-panel poster grid',
    panels: [
      panel('Lead', [[0, 0], [0.58, 0], [0.52, 0.62], [0, 0.62]]),
      panel('Upper right', [[0.58, 0], [1, 0], [1, 0.34], [0.547, 0.34]]),
      panel('Mid right', [[0.547, 0.34], [1, 0.34], [1, 0.62], [0.52, 0.62]]),
      panel('Lower left', [[0, 0.62], [0.52, 0.62], [0.48, 1], [0, 1]]),
      panel('Lower right', [[0.52, 0.62], [1, 0.62], [1, 1], [0.48, 1]]),
    ],
  },
  {
    id: 'mosaic6',
    name: 'Mosaic',
    blurb: 'Six panels, two leaning rows of three',
    panels: [
      panel('One', [[0, 0], [0.36, 0], [0.335, 0.505], [0, 0.52]]),
      panel('Two', [[0.36, 0], [0.69, 0], [0.665, 0.49], [0.335, 0.505]]),
      panel('Three', [[0.69, 0], [1, 0], [1, 0.47], [0.665, 0.49]]),
      panel('Four', [[0, 0.52], [0.335, 0.505], [0.31, 1], [0, 1]]),
      panel('Five', [[0.335, 0.505], [0.665, 0.49], [0.64, 1], [0.31, 1]]),
      panel('Six', [[0.665, 0.49], [1, 0.47], [1, 1], [0.64, 1]]),
    ],
  },
];

/** Looks a layout up by id, falling back to the poster collage. */
export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[4];
}

/** A polygon's bounding box in unit space: {x, y, w, h}. */
export function polygonBounds(points) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Pushes every point a little away from the polygon's centre, so clipped neighbours overlap at the seams. */
export function expandPolygon(points, amount) {
  const bounds = polygonBounds(points);
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  return points.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * amount, y + (dy / len) * amount];
  });
}

/** True when the unit-space point (x, y) falls inside the polygon (ray casting). */
export function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
