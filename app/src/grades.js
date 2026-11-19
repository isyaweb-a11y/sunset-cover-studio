// Colour grades for Sunset Cover Studio.
//
// A grade is two things: a canvas filter recipe (saturation, contrast,
// brightness, sepia and hue, each lerped from the identity by the intensity
// slider) and a light overlay — a gradient laid over the photo with a
// composite mode, the way a sunset or a neon sign would wash across a real
// poster. Grades are applied per panel, and a panel may override the cover's
// grade so one frame can sit in neon while the rest sit in sunset.

/** Linear interpolation between two numbers. */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** The grade list. Filter values are the recipe at full intensity. */
export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    swatch: 'linear-gradient(160deg,#ffd23e,#ff5e8a 55%,#7b2ff7)',
    filter: { sat: 1.38, con: 1.09, bri: 1.04, sep: 0.16, hue: -7 },
    overlay: {
      mode: 'soft-light',
      stops: [[0, 'rgba(70,0,140,0.85)'], [0.45, 'rgba(255,90,60,0.25)'], [1, 'rgba(255,45,130,0.9)']],
    },
    wash: { mode: 'source-over', stops: [[0, 'rgba(255,120,40,0)'], [1, 'rgba(255,60,120,0.16)']] },
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    swatch: 'linear-gradient(160deg,#00e5ff,#2979ff 45%,#ff2ec4)',
    filter: { sat: 1.52, con: 1.16, bri: 0.99, sep: 0.05, hue: 9 },
    overlay: {
      mode: 'overlay',
      stops: [[0, 'rgba(0,229,255,0.75)'], [0.55, 'rgba(20,20,80,0.15)'], [1, 'rgba(255,46,196,0.8)']],
    },
    wash: { mode: 'source-over', stops: [[0, 'rgba(0,40,90,0.14)'], [1, 'rgba(90,0,80,0.14)']] },
  },
  {
    id: 'noir',
    name: 'Noir',
    swatch: 'linear-gradient(160deg,#f5f5f5,#8a8a92 55%,#101014)',
    filter: { sat: 0.04, con: 1.28, bri: 1.01, sep: 0.08, hue: 0 },
    overlay: {
      mode: 'soft-light',
      stops: [[0, 'rgba(255,255,255,0.5)'], [0.6, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0.9)']],
    },
    wash: { mode: 'source-over', stops: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.22)']] },
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    swatch: 'linear-gradient(160deg,#fff3b0,#ffb703 55%,#fb8500)',
    filter: { sat: 1.22, con: 1.05, bri: 1.09, sep: 0.34, hue: -4 },
    overlay: {
      mode: 'soft-light',
      stops: [[0, 'rgba(255,190,60,0.8)'], [0.6, 'rgba(255,140,40,0.3)'], [1, 'rgba(160,60,10,0.7)']],
    },
    wash: { mode: 'source-over', stops: [[0, 'rgba(255,170,50,0.10)'], [1, 'rgba(255,120,30,0.10)']] },
  },
  {
    id: 'teal',
    name: 'Teal Chrome',
    swatch: 'linear-gradient(160deg,#a7f3ea,#0e9594 50%,#ff7b54)',
    filter: { sat: 1.27, con: 1.13, bri: 1.02, sep: 0.1, hue: 6 },
    overlay: {
      mode: 'soft-light',
      stops: [[0, 'rgba(0,150,150,0.85)'], [0.55, 'rgba(0,60,80,0.2)'], [1, 'rgba(255,110,60,0.75)']],
    },
    wash: { mode: 'source-over', stops: [[0, 'rgba(0,120,120,0.10)'], [1, 'rgba(255,110,60,0.08)']] },
  },
  {
    id: 'clean',
    name: 'Clean',
    swatch: 'linear-gradient(160deg,#ffffff,#cfd8e3 60%,#7d8ea3)',
    filter: { sat: 1.06, con: 1.03, bri: 1.02, sep: 0, hue: 0 },
    overlay: null,
    wash: null,
  },
];

/** Looks a grade up by id, falling back to Vice Sunset. */
export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}

/** The CSS filter string for a grade at an intensity (0..1), identity at 0. */
export function filterString(grade, intensity) {
  const f = grade.filter;
  const t = Math.min(1, Math.max(0, intensity));
  return [
    `saturate(${lerp(1, f.sat, t).toFixed(3)})`,
    `contrast(${lerp(1, f.con, t).toFixed(3)})`,
    `brightness(${lerp(1, f.bri, t).toFixed(3)})`,
    `sepia(${lerp(0, f.sep, t).toFixed(3)})`,
    `hue-rotate(${lerp(0, f.hue, t).toFixed(1)}deg)`,
  ].join(' ');
}

/** Paints one gradient overlay of a grade across a rect, its strength scaled by intensity. */
function paintOverlay(ctx, overlay, x, y, w, h, intensity) {
  const gradient = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  for (const [at, color] of overlay.stops) gradient.addColorStop(at, color);
  ctx.save();
  ctx.globalCompositeOperation = overlay.mode;
  ctx.globalAlpha = Math.min(1, Math.max(0, intensity));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Paints a grade's light inside the current clip. The caller draws the photo
 * itself first, with ctx.filter set from filterString(); this adds the two
 * light passes over it (a blend-mode gradient, then a plain colour wash),
 * which keeps skin tones alive under strong grades.
 */
export function paintGradeLight(ctx, grade, x, y, w, h, intensity) {
  if (grade.overlay) paintOverlay(ctx, grade.overlay, x, y, w, h, intensity);
  if (grade.wash) paintOverlay(ctx, grade.wash, x, y, w, h, intensity);
}
