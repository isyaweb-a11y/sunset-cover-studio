// Sunset Cover Studio — editor wiring.
//
// Loads the built-in sample photos, keeps the cover state (photos, layout,
// grade, caption, per-panel assignments), paints the live preview through
// render.js, and exports full-resolution PNGs. Everything runs on the
// reader's own machine: picked photos are read as object URLs and never
// leave the browser. A `?shot=` query (see shots.js) pre-loads a fixed
// scene instead, for the maker's screenshots.

import { LAYOUTS, layoutById, pointInPolygon, polygonBounds } from './layouts.js';
import { GRADES } from './grades.js';
import { LETTER_STYLES, ensureLetteringFont } from './lettering.js';
import { EXPORT_SIZES, exportSizeById, renderCover } from './render.js';
import { markShotReady, readShotQuery } from './shots.js';

/** The built-in demo photos shipped in app/samples/ (made with an image model, free to use). */
const SAMPLES = [
  { id: 'driver', label: 'Sunset Driver' },
  { id: 'cruiser', label: 'Beach Cruiser' },
  { id: 'neon', label: 'Neon Pier' },
  { id: 'pier', label: 'The Pier' },
  { id: 'boulevard', label: 'Boulevard' },
];

/** The whole cover being edited. Panels are rebuilt whenever the layout changes. */
const state = {
  layoutId: 'collage5',
  gradeId: 'vice',
  intensity: 0.85,
  grain: true,
  vignette: true,
  caption: { title: 'Sunset Heist', subtitle: 'Vice Shores' },
  letterStyle: 'sunset',
  sizeId: 'wide',
  panels: [],
  selected: 0,
};

/** Loaded images, in load order; panel assignments index into this list. */
const photos = [];
/** Display names parallel to `photos`. */
const photoNames = [];

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

/** Notes a short message under the export buttons. */
function setStatus(message) {
  statusEl.textContent = message;
}

/** Loads an image from a URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** A fresh panel assignment: the photo at `index` (wrapping), centred, unzoomed, cover grade. */
function freshAssignment(index) {
  return {
    photoIndex: photos.length ? index % photos.length : 0,
    zoom: 1,
    ox: 0,
    oy: 0,
    gradeId: null,
  };
}

/** Rebuilds panel assignments for the current layout, keeping the ones that still fit by position. */
function syncPanels(keepExisting = true) {
  const count = layoutById(state.layoutId).panels.length;
  const next = [];
  for (let i = 0; i < count; i++) {
    next.push(keepExisting && state.panels[i] ? state.panels[i] : freshAssignment(i));
  }
  state.panels = next;
  if (state.selected >= count) state.selected = 0;
}

/** The selected panel's assignment. */
function selectedAssignment() {
  return state.panels[state.selected];
}

/** Paints the live preview at half export resolution (exports render separately, full size). */
function redraw() {
  const size = exportSizeById(state.sizeId);
  const pw = Math.round(size.w / 2);
  const ph = Math.round(size.h / 2);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  renderCover(ctx, pw, ph, state, photos, { highlight: state.selected });
}

/** Marks the active button in a generated button row. */
function markActive(container, activeId) {
  for (const button of container.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.value === activeId);
  }
}

/** Builds a row of option buttons; `onPick` receives the chosen value. */
function buildButtonRow(containerId, items, current, onPick) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = item.id;
    button.textContent = item.name ?? item.label;
    if (item.swatch) {
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = item.swatch;
      button.prepend(swatch);
    }
    if (item.blurb) button.title = item.blurb;
    button.classList.toggle('active', item.id === current);
    button.addEventListener('click', () => {
      onPick(item.id);
      markActive(container, item.id);
    });
    container.appendChild(button);
  }
  return container;
}

/** Rebuilds the panel picker and the selected panel's controls after any structural change. */
function refreshPanelControls() {
  const layout = layoutById(state.layoutId);
  const container = document.getElementById('panelRow');
  container.innerHTML = '';
  layout.panels.forEach((panelDef, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${index + 1} · ${panelDef.name}`;
    button.classList.toggle('active', index === state.selected);
    button.addEventListener('click', () => {
      state.selected = index;
      refreshPanelControls();
      redraw();
    });
    container.appendChild(button);
  });

  const assignment = selectedAssignment();
  const photoSelect = document.getElementById('panelPhoto');
  photoSelect.innerHTML = '';
  photos.forEach((photo, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = photoNames[index];
    photoSelect.appendChild(option);
  });
  if (assignment) photoSelect.value = String(Math.min(assignment.photoIndex, Math.max(0, photos.length - 1)));
  document.getElementById('panelZoom').value = assignment ? String(assignment.zoom) : '1';
  document.getElementById('panelGrade').value = assignment?.gradeId ?? '';
  document.getElementById('panelLabel').textContent =
    `Panel ${state.selected + 1} of ${layout.panels.length} — ${layout.panels[state.selected].name}`;
}

/** Rebuilds the strip of loaded photo thumbnails. */
function refreshPhotoStrip() {
  const strip = document.getElementById('photoStrip');
  strip.innerHTML = '';
  photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = `${photoNames[index]} — send to the selected panel`;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photoNames[index];
    button.appendChild(img);
    button.addEventListener('click', () => {
      const assignment = selectedAssignment();
      if (assignment) assignment.photoIndex = index;
      refreshPanelControls();
      redraw();
    });
    strip.appendChild(button);
  });
}

/** Adds one loaded image to the photo list and, when asked, to the selected panel. */
function addPhoto(img, name, assignToSelected) {
  photos.push(img);
  photoNames.push(name);
  if (assignToSelected && selectedAssignment()) selectedAssignment().photoIndex = photos.length - 1;
  refreshPhotoStrip();
  refreshPanelControls();
}

/** Reads every file of a file list as an image and adds it. */
async function addPhotoFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith('image/'));
  if (!files.length) {
    setStatus('Those files were not images — pick JPG or PNG photos.');
    return;
  }
  let first = true;
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      addPhoto(img, file.name.replace(/\.[^.]+$/, ''), first);
      first = false;
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added — drag on the cover to position, scroll to zoom.`);
  redraw();
}

/** Wires the photo inputs: picker, drag-and-drop onto the stage, and the sample chips. */
function wirePhotoInputs() {
  const input = document.getElementById('fileInput');
  input.addEventListener('change', () => {
    addPhotoFiles(input.files ?? []);
    input.value = '';
  });
  const stage = document.getElementById('stage');
  for (const eventName of ['dragenter', 'dragover']) {
    stage.addEventListener(eventName, (event) => {
      event.preventDefault();
      stage.classList.add('dropping');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    stage.addEventListener(eventName, (event) => {
      event.preventDefault();
      stage.classList.remove('dropping');
    });
  }
  stage.addEventListener('drop', (event) => addPhotoFiles(event.dataTransfer?.files ?? []));

  const sampleRow = document.getElementById('sampleRow');
  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = sample.label;
    button.addEventListener('click', async () => {
      const existing = photoNames.indexOf(sample.label);
      if (existing >= 0) {
        if (selectedAssignment()) selectedAssignment().photoIndex = existing;
      } else {
        addPhoto(await loadImage(`samples/${sample.id}.jpg`), sample.label, true);
      }
      refreshPanelControls();
      redraw();
    });
    sampleRow.appendChild(button);
  }
}

/** Wires layout, grade, caption, lettering and panel controls. */
function wireControls() {
  buildButtonRow('layoutRow', LAYOUTS, state.layoutId, (id) => {
    state.layoutId = id;
    syncPanels();
    refreshPanelControls();
    redraw();
  });
  buildButtonRow('gradeRow', GRADES, state.gradeId, (id) => {
    state.gradeId = id;
    redraw();
  });
  buildButtonRow('styleRow', LETTER_STYLES, state.letterStyle, (id) => {
    state.letterStyle = id;
    redraw();
  });
  buildButtonRow('sizeRow', EXPORT_SIZES.map((s) => ({ id: s.id, name: `${s.name} ${s.w}×${s.h}` })), state.sizeId, (id) => {
    state.sizeId = id;
    redraw();
  });

  document.getElementById('intensity').addEventListener('input', (event) => {
    state.intensity = Number(event.target.value);
    redraw();
  });
  document.getElementById('grainToggle').addEventListener('change', (event) => {
    state.grain = event.target.checked;
    redraw();
  });
  document.getElementById('vignetteToggle').addEventListener('change', (event) => {
    state.vignette = event.target.checked;
    redraw();
  });
  document.getElementById('titleInput').addEventListener('input', (event) => {
    state.caption.title = event.target.value;
    redraw();
  });
  document.getElementById('subtitleInput').addEventListener('input', (event) => {
    state.caption.subtitle = event.target.value;
    redraw();
  });
  document.getElementById('panelPhoto').addEventListener('change', (event) => {
    if (selectedAssignment()) selectedAssignment().photoIndex = Number(event.target.value);
    redraw();
  });
  document.getElementById('panelZoom').addEventListener('input', (event) => {
    if (selectedAssignment()) selectedAssignment().zoom = Number(event.target.value);
    redraw();
  });
  const gradeSelect = document.getElementById('panelGrade');
  const coverOption = document.createElement('option');
  coverOption.value = '';
  coverOption.textContent = 'Cover grade';
  gradeSelect.appendChild(coverOption);
  for (const grade of GRADES) {
    const option = document.createElement('option');
    option.value = grade.id;
    option.textContent = grade.name;
    gradeSelect.appendChild(option);
  }
  gradeSelect.addEventListener('change', (event) => {
    if (selectedAssignment()) selectedAssignment().gradeId = event.target.value || null;
    redraw();
  });
  document.getElementById('fillAll').addEventListener('click', () => {
    const source = selectedAssignment();
    if (!source) return;
    for (const assignment of state.panels) assignment.photoIndex = source.photoIndex;
    setStatus(`Every panel now shows ${photoNames[source.photoIndex]} — vary the zoom per panel for the poster look.`);
    redraw();
  });
  document.getElementById('resetPanel').addEventListener('click', () => {
    const assignment = selectedAssignment();
    if (!assignment) return;
    assignment.zoom = 1;
    assignment.ox = 0;
    assignment.oy = 0;
    refreshPanelControls();
    redraw();
  });
}

/** Wires dragging and wheel zoom on the preview canvas. */
function wireCanvasGestures() {
  let drag = null;
  const toUnit = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      px: (event.clientX - rect.left) * (canvas.width / rect.width),
      py: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const at = toUnit(event);
    const layout = layoutById(state.layoutId);
    const hit = layout.panels.findIndex((panelDef) => pointInPolygon(panelDef.points, at.x, at.y));
    if (hit >= 0 && hit !== state.selected) {
      state.selected = hit;
      refreshPanelControls();
    }
    drag = { lastX: at.px, lastY: at.py };
    canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const assignment = selectedAssignment();
    if (!assignment) return;
    const at = toUnit(event);
    const layout = layoutById(state.layoutId);
    const bounds = polygonBounds(layout.panels[state.selected].points);
    assignment.ox += (at.px - drag.lastX) / (bounds.w * canvas.width);
    assignment.oy += (at.py - drag.lastY) / (bounds.h * canvas.height);
    drag.lastX = at.px;
    drag.lastY = at.py;
    redraw();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const assignment = selectedAssignment();
    if (!assignment) return;
    assignment.zoom = Math.min(4, Math.max(0.4, assignment.zoom * Math.exp(-event.deltaY * 0.0012)));
    document.getElementById('panelZoom').value = String(assignment.zoom);
    redraw();
  }, { passive: false });
}

/** Renders one export size offscreen at full resolution and downloads it as a PNG. */
async function exportPng(sizeId) {
  await ensureLetteringFont();
  const size = exportSizeById(sizeId);
  const offscreen = document.createElement('canvas');
  offscreen.width = size.w;
  offscreen.height = size.h;
  renderCover(offscreen.getContext('2d'), size.w, size.h, state, photos, { highlight: -1 });
  offscreen.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sunset-cover-${size.w}x${size.h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    setStatus(`Saved sunset-cover-${size.w}x${size.h}.png — post it anywhere.`);
  }, 'image/png');
}

/** Wires the three export buttons. */
function wireExports() {
  for (const size of EXPORT_SIZES) {
    document.getElementById(`export-${size.id}`).addEventListener('click', () => exportPng(size.id));
  }
}

/** Applies a shot scene to the state: listed samples in order, caption, layout, grade, size. */
async function applyShot(shot) {
  state.layoutId = shot.layout;
  state.gradeId = shot.grade;
  state.sizeId = shot.size;
  state.letterStyle = shot.style;
  state.intensity = Number.isFinite(shot.intensity) ? shot.intensity : state.intensity;
  state.caption.title = shot.title;
  state.caption.subtitle = shot.subtitle;
  for (const name of shot.photos) {
    const sample = SAMPLES.find((entry) => entry.id === name);
    addPhoto(await loadImage(`samples/${name}.jpg`), sample?.label ?? name, false);
  }
  syncPanels(false);
  state.panels.forEach((assignment, index) => {
    assignment.photoIndex = Math.min(index, photos.length - 1);
  });
  document.getElementById('titleInput').value = shot.title;
  document.getElementById('subtitleInput').value = shot.subtitle;
  document.getElementById('intensity').value = String(state.intensity);
}

/** Boots the studio: controls first, then the default samples, then the first paint. */
async function boot() {
  wirePhotoInputs();
  wireControls();
  wireCanvasGestures();
  wireExports();
  syncPanels(false);

  const shot = readShotQuery();
  await ensureLetteringFont();
  if (shot) {
    await applyShot(shot);
    if (shot.mode === 'cover') {
      document.body.classList.add('shot-cover');
      const size = exportSizeById(state.sizeId);
      canvas.width = size.w;
      canvas.height = size.h;
      renderCover(ctx, size.w, size.h, state, photos, { highlight: -1 });
    } else {
      // The option rows were built with the default state; re-mark them for the scene's choices.
      markActive(document.getElementById('layoutRow'), state.layoutId);
      markActive(document.getElementById('gradeRow'), state.gradeId);
      markActive(document.getElementById('styleRow'), state.letterStyle);
      markActive(document.getElementById('sizeRow'), state.sizeId);
      refreshPanelControls();
      refreshPhotoStrip();
      redraw();
    }
    markShotReady();
    return;
  }

  for (const sample of SAMPLES) {
    addPhoto(await loadImage(`samples/${sample.id}.jpg`), sample.label, false);
  }
  syncPanels(false);
  refreshPanelControls();
  setStatus('Samples loaded — add your own photos, pick a layout, export a PNG.');
  redraw();
}

boot().catch((error) => {
  setStatus(`Something failed to start: ${error.message}`);
});
