// Deterministic screenshot scenes for Sunset Cover Studio.
//
// A `?shot=` query turns the page into a fixed scene the maker screenshots:
//   ?shot=cover&photo=driver,neon,cruiser,pier,boulevard&caption=Sunset%20Heist
//     &subtitle=Vice%20Shores&layout=collage5&grade=vice&size=wide&style=sunset
// renders one cover full-bleed at the export size's aspect; `?shot=editor`
// opens the same scene inside the editor. `photo` is a comma list of sample
// names (files in app/samples/), assigned to the panels in order. When the
// scene is painted, window.__shotReady is set so the screenshot driver knows
// the frame is final.

/** Reads the shot query, returning null when the page was opened normally. */
export function readShotQuery() {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (!shot) return null;
  return {
    mode: shot === 'editor' ? 'editor' : 'cover',
    photos: (query.get('photo') ?? 'driver').split(',').map((name) => name.trim()).filter(Boolean),
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Vice Shores',
    layout: query.get('layout') ?? 'collage5',
    grade: query.get('grade') ?? 'vice',
    size: query.get('size') ?? 'square',
    style: query.get('style') ?? 'sunset',
    intensity: Number(query.get('intensity') ?? '0.85'),
  };
}

/** Flags the deterministic scene as painted, after two frames so fonts and grades settle. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
