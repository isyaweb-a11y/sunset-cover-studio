// The cover renderer for Sunset Cover Studio.
//
// One function paints a whole cover onto any 2D context at any size, so the
// live preview and the full-resolution PNG exports are the same drawing:
// panels clipped to their slanted polygons, each photo cover-fitted with its
// own zoom and offset, graded, bordered, then film grain, a vignette and the
// caption lettering over the top. An empty panel gets a dusk gradient, a sun
// disc and a palm, so a fresh cover already looks like a poster.

import { expandPolygon, layoutById, polygonBounds } from './layouts.js';
import { filterString, gradeById, paintGradeLight } from './grades.js';
import { drawLettering, drawPalm, drawSunDisc } from './lettering.js';

/** The three export sizes the studio offers, in pixels. */
export const EXPORT_SIZES = [
  { id: 'square', name: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait post', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide banner', w: 1920, h: 1080 },
];

/** Looks an export size up by id, falling back to square. */
export function exportSizeById(id) {
  return EXPORT_SIZES.find((size) => size.id === id) ?? EXPORT_SIZES[0];
}

/** A scratch canvas reused for the grain tile, built once. */
let grainTile = null;

/** Builds (once) a 144px tile of monochrome noise for the film grain pass. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 144;
  tile.height = 144;
  const t = tile.getContext('2d');
  const data = t.createImageData(144, 144);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  t.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/** Paints film grain over the whole cover with a soft-light blend. */
function paintGrain(ctx, w, h, strength) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.34 * strength;
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Darkens the cover's corners so the lettering and the lead panel pop. */
function paintVignette(ctx, w, h, strength) {
  const radius = Math.hypot(w, h) * 0.62;
  const gradient = ctx.createRadialGradient(w / 2, h * 0.46, radius * 0.42, w / 2, h * 0.52, radius);
  gradient.addColorStop(0, 'rgba(12,0,24,0)');
  gradient.addColorStop(1, `rgba(12,0,24,${0.44 * strength})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The placeholder art for a panel with no photo yet: dusk sky, sun and palms. */
function paintEmptyPanel(ctx, bounds, seed) {
  const { x, y, w, h } = bounds;
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, '#3b1d63');
  gradient.addColorStop(0.55, '#a12c6d');
  gradient.addColorStop(1, '#ff7a3c');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  drawSunDisc(ctx, x + w * (0.32 + 0.12 * seed), y + h * 0.36, Math.min(w, h) * 0.2, '#ffd76e', '#ff5e8a');
  drawPalm(ctx, x + w * 0.16, y + h * 0.98, h * 0.5, 0.14, 'rgba(20,4,34,0.8)');
  drawPalm(ctx, x + w * 0.88, y + h * 0.99, h * 0.38, -0.18, 'rgba(20,4,34,0.7)');
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 ${Math.max(11, Math.min(w, h) * 0.055)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', x + w / 2, y + h * 0.9);
}

/**
 * Draws one panel: clip to its (slightly expanded) polygon, cover-fit its
 * photo with the panel's zoom and offset, run the grade, un-clip.
 * `assignment` is {photoIndex, zoom, ox, oy, gradeId}; photos is the image list.
 */
function paintPanel(ctx, w, h, points, assignment, photos, state, index) {
  const scaled = points.map(([px, py]) => [px * w, py * h]);
  const grown = expandPolygon(points, 0.004).map(([px, py]) => [px * w, py * h]);
  const unit = polygonBounds(points);
  const bounds = { x: unit.x * w, y: unit.y * h, w: unit.w * w, h: unit.h * h };
  const grade = gradeById(assignment?.gradeId ?? state.gradeId);

  ctx.save();
  ctx.beginPath();
  grown.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.clip();

  const photo = assignment ? photos[assignment.photoIndex] : undefined;
  if (photo && photo.naturalWidth > 0) {
    const zoom = Math.max(0.4, assignment.zoom || 1);
    const scale = Math.max(bounds.w / photo.naturalWidth, bounds.h / photo.naturalHeight) * zoom;
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const dx = bounds.x + (bounds.w - dw) / 2 + (assignment.ox || 0) * bounds.w;
    const dy = bounds.y + (bounds.h - dh) / 2 + (assignment.oy || 0) * bounds.h;
    ctx.save();
    try { ctx.filter = filterString(grade, state.intensity); } catch { /* filter unsupported: draw plain */ }
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.restore();
  } else {
    paintEmptyPanel(ctx, bounds, (index % 3) / 3);
  }
  paintGradeLight(ctx, grade, bounds.x, bounds.y, bounds.w, bounds.h, state.intensity);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  scaled.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.0042);
  ctx.strokeStyle = 'rgba(255,246,235,0.92)';
  ctx.stroke();
  ctx.restore();
  return scaled;
}

/**
 * Paints a full cover. `state` carries layoutId, gradeId, intensity, grain,
 * vignette, caption {title, subtitle}, letterStyle and panels (assignments);
 * `photos` is the loaded image list; `options.highlight` optionally names the
 * selected panel index (editor only — exports pass -1).
 */
export function renderCover(ctx, w, h, state, photos, options = {}) {
  const layout = layoutById(state.layoutId);
  ctx.save();
  const backdrop = ctx.createLinearGradient(0, 0, 0, h);
  backdrop.addColorStop(0, '#241040');
  backdrop.addColorStop(1, '#12041f');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, w, h);

  const scaledPanels = layout.panels.map((panelDef, index) =>
    paintPanel(ctx, w, h, panelDef.points, state.panels[index], photos, state, index));

  if (options.highlight >= 0 && scaledPanels[options.highlight]) {
    ctx.save();
    ctx.beginPath();
    scaledPanels[options.highlight].forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.007);
    ctx.strokeStyle = '#ffd23e';
    ctx.setLineDash([Math.min(w, h) * 0.03, Math.min(w, h) * 0.018]);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255,246,235,0.95)';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.005);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  if (state.vignette) paintVignette(ctx, w, h, 1);
  if (state.grain) paintGrain(ctx, w, h, 1);
  drawLettering(ctx, w, h, state.caption, state.letterStyle);
  ctx.restore();
}
