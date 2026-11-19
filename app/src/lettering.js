// Poster lettering for Sunset Cover Studio.
//
// The display face is Anton (SIL Open Font License, shipped in app/fonts/),
// loaded through a @font-face rule in style.css and drawn here on canvas:
// a vertical chrome gradient fill, a heavy dark stroke, a soft drop shadow
// and a slight italic skew — the full poster treatment. Around the words the
// module draws its own decorations: a striped sun disc and palm silhouettes,
// all original canvas paths made for this app.

/** Waits until the Anton face can actually be drawn with, so exports never fall back silently. */
export async function ensureLetteringFont() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('90px Anton', 'SUNSET'),
        document.fonts.load('30px Anton', 'VICE'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // A missing font still leaves the generic heavy fallback usable.
  }
  return document.fonts.check('90px Anton');
}

/** The gradient recipes for the title fill, top stop to bottom stop. */
export const LETTER_STYLES = [
  { id: 'sunset', name: 'Sunset Chrome', stops: [[0, '#fff7ae'], [0.38, '#ffb347'], [0.62, '#ff5e8a'], [1, '#b04dff']] },
  { id: 'neon', name: 'Neon Pink', stops: [[0, '#ffffff'], [0.45, '#ff9aeb'], [0.75, '#ff2ec4'], [1, '#8a2be2']] },
  { id: 'gold', name: 'Gold', stops: [[0, '#fffbe0'], [0.4, '#ffe066'], [0.7, '#f5b301'], [1, '#9c6b00']] },
  { id: 'ice', name: 'Ice', stops: [[0, '#ffffff'], [0.45, '#c8f4ff'], [0.75, '#4fc3ff'], [1, '#2456d6']] },
  { id: 'paper', name: 'Paper White', stops: [[0, '#ffffff'], [1, '#e8e2d4']] },
];

/** Looks a lettering style up by id, falling back to Sunset Chrome. */
export function letterStyleById(id) {
  return LETTER_STYLES.find((style) => style.id === id) ?? LETTER_STYLES[0];
}

/** Draws one palm tree silhouette: a curved trunk and seven arcing fronds, all quadratic paths. */
export function drawPalm(ctx, x, y, height, lean, color) {
  const trunkTopX = x + lean * height;
  const trunkTopY = y - height;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, height * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * height * 0.3, y - height * 0.55, trunkTopX, trunkTopY);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, height * 0.05);
  for (let i = 0; i < 6; i++) {
    const spread = -1 + (i / 5) * 2;
    const reach = height * (0.36 - 0.07 * Math.abs(spread));
    const endX = trunkTopX + spread * reach;
    const endY = trunkTopY + reach * (0.34 + 0.13 * Math.abs(spread));
    const midX = trunkTopX + spread * reach * 0.45;
    const midY = trunkTopY - reach * 0.3;
    ctx.beginPath();
    ctx.moveTo(trunkTopX, trunkTopY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(trunkTopX - height * 0.03, trunkTopY + height * 0.03, height * 0.028, 0, Math.PI * 2);
  ctx.arc(trunkTopX + height * 0.035, trunkTopY + height * 0.045, height * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a retro sun disc: a circle sliced by horizontal slits that widen
 * toward the base. The disc is composed on a scratch canvas first, because
 * cutting the slits with destination-out on the cover itself would punch
 * holes through the photos underneath.
 */
export function drawSunDisc(ctx, cx, cy, radius, topColor, bottomColor) {
  const side = Math.max(2, Math.ceil(radius * 2));
  const disc = document.createElement('canvas');
  disc.width = side;
  disc.height = side;
  const d = disc.getContext('2d');
  const gradient = d.createLinearGradient(0, 0, 0, side);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  d.beginPath();
  d.arc(radius, radius, radius, 0, Math.PI * 2);
  d.clip();
  d.fillStyle = gradient;
  d.fillRect(0, 0, side, side);
  d.globalCompositeOperation = 'destination-out';
  let slitY = radius + radius * 0.08;
  let slitH = radius * 0.03;
  while (slitY < side) {
    d.fillRect(0, slitY, side, slitH);
    slitY += slitH + radius * 0.13;
    slitH *= 1.55;
  }
  ctx.drawImage(disc, cx - radius, cy - radius);
}

/** Shrinks a font size until `text` fits `maxWidth`, returning the size used. */
function fitFontSize(ctx, text, weight, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px Anton, 'Arial Black', sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px Anton, 'Arial Black', sans-serif`;
  }
  return size;
}

/**
 * Draws the caption block: subtitle in spaced capitals above a huge gradient
 * title, anchored to the foot of the cover, with a palm silhouette at each
 * lower corner and a gradient rule under the subtitle.
 */
export function drawLettering(ctx, w, h, caption, styleId) {
  const title = (caption.title ?? '').trim().toUpperCase();
  const subtitle = (caption.subtitle ?? '').trim().toUpperCase();
  const style = letterStyleById(styleId);
  const unit = Math.min(w, h);

  ctx.save();
  drawPalm(ctx, w * 0.03, h * 0.995, unit * 0.25, 0.16, 'rgba(16,4,28,0.5)');
  drawPalm(ctx, w * 0.97, h * 0.995, unit * 0.20, -0.2, 'rgba(16,4,28,0.45)');
  ctx.restore();

  if (!title && !subtitle) return;

  const titleSize = title ? fitFontSize(ctx, title, '', unit * 0.155, w * 0.9) : 0;
  const subSize = subtitle ? fitFontSize(ctx, subtitle, '', unit * 0.042, w * 0.8) : 0;
  const titleBaseline = h - unit * 0.055;
  const subBaseline = titleBaseline - titleSize * 1.08;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (subtitle) {
    // A short gradient rule under the subtitle stands in for a sun disc here:
    // a disc at cover centre kept landing on faces in the middle panels.
    const ruleWidth = Math.min(w * 0.34, ctx.measureText(subtitle).width + subSize * 4);
    const rule = ctx.createLinearGradient(w / 2 - ruleWidth / 2, 0, w / 2 + ruleWidth / 2, 0);
    rule.addColorStop(0, 'rgba(255,210,90,0)');
    rule.addColorStop(0.5, 'rgba(255,120,110,0.95)');
    rule.addColorStop(1, 'rgba(176,77,255,0)');
    ctx.fillStyle = rule;
    ctx.fillRect(w / 2 - ruleWidth / 2, subBaseline + subSize * 0.32, ruleWidth, Math.max(2, subSize * 0.09));
    ctx.font = `${subSize}px Anton, 'Arial Black', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.34)}px`; } catch { /* older engines draw it tight */ }
    ctx.lineWidth = subSize * 0.16;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20,6,36,0.9)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.shadowOffsetY = subSize * 0.08;
    ctx.strokeText(subtitle, w / 2, subBaseline);
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(subtitle, w / 2, subBaseline);
    try { ctx.letterSpacing = '0px'; } catch { /* reset only where supported */ }
  }

  if (title) {
    ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
    ctx.transform(1, 0, -0.055, 1, 0, 0);
    const originX = w / 2 + titleSize * 0.03;
    const fill = ctx.createLinearGradient(0, titleBaseline - titleSize, 0, titleBaseline);
    for (const [at, color] of style.stops) fill.addColorStop(at, color);
    ctx.lineWidth = titleSize * 0.15;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#180826';
    ctx.shadowColor = 'rgba(10,0,24,0.55)';
    ctx.shadowBlur = titleSize * 0.16;
    ctx.shadowOffsetY = titleSize * 0.055;
    ctx.strokeText(title, originX, titleBaseline);
    ctx.shadowBlur = 0;
    ctx.fillStyle = fill;
    ctx.fillText(title, originX, titleBaseline);
    ctx.lineWidth = Math.max(1.5, titleSize * 0.018);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.strokeText(title, originX, titleBaseline);
  }
  ctx.restore();
}
