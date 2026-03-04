import { create } from 'zustand';

// ─── Constants ───────────────────────────────────────────────────────────────
export const MIN_COLS = 10;
export const MAX_COLS = 100;
export const MIN_ROWS = 10;
export const MAX_ROWS = 100;
export const DEFAULT_COLS = 20;
export const DEFAULT_ROWS = 14;
export const HISTORY_LIMIT = 50;

// ─── Biomes & Tile Types ──────────────────────────────────────────────────────
export const BIOMES = {
  plains: { label: 'Plains', icon: '🌾', color: '#7db87e', ambient: 'wind' },
  forest: { label: 'Forest', icon: '🌲', color: '#2d6a2d', ambient: 'forest' },
  water: { label: 'Water', icon: '🌊', color: '#1a6b9a', ambient: 'rain' },
  dungeon: { label: 'Dungeon', icon: '🏚️', color: '#3a3040', ambient: 'dungeon' },
  lava: { label: 'Lava', icon: '🌋', color: '#8b2500', ambient: 'fire' },
  snow: { label: 'Snow', icon: '❄️', color: '#c8e0f0', ambient: 'wind' },
};

export const TILE_TYPES = [
  { id: 'grass', label: 'Grass', color: '#5a9e5c', icon: '🌿' },
  { id: 'dirt', label: 'Dirt', color: '#8b6340', icon: '🟫' },
  { id: 'stone', label: 'Stone', color: '#7a7a8a', icon: '⬜' },
  { id: 'water', label: 'Water', color: '#2980b9', icon: '💧' },
  { id: 'sand', label: 'Sand', color: '#c8a84b', icon: '🏜️' },
  { id: 'lava', label: 'Lava', color: '#e74c3c', icon: '🔥' },
  { id: 'snow', label: 'Snow', color: '#dceef8', icon: '❄️' },
  { id: 'forest', label: 'Forest', color: '#27ae60', icon: '🌲' },
  { id: 'dungeon', label: 'Dungeon', color: '#2c2c3c', icon: '⬛' },
  { id: 'wall', label: 'Wall', color: '#555577', icon: '🧱' },
];

// ─── Paint Modes ──────────────────────────────────────────────────────────────
export const PAINT_MODES = {
  BRUSH: 'brush',
  ERASER: 'eraser',
  FILL: 'fill',    // flood fill on a single contiguous region
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildEmptyGrid = (cols, rows, defaultTile = 'grass') => {
  const grid = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[`${c},${r}`] = defaultTile;
    }
  }
  return grid;
};

/** BFS flood-fill: returns a new tiles map with contiguous region changed */
const floodFill = (tiles, startCol, startRow, targetTile, cols, rows) => {
  const key = (c, r) => `${c},${r}`;
  const originType = tiles[key(startCol, startRow)];
  if (originType === targetTile) return tiles; // nothing to do

  const newTiles = { ...tiles };
  const queue = [[startCol, startRow]];
  const visited = new Set([key(startCol, startRow)]);

  while (queue.length > 0) {
    const [c, r] = queue.shift();
    newTiles[key(c, r)] = targetTile;

    const neighbors = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]];
    for (const [nc, nr] of neighbors) {
      const nk = key(nc, nr);
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      if (visited.has(nk)) continue;
      if (tiles[nk] !== originType) continue;
      visited.add(nk);
      queue.push([nc, nr]);
    }
  }
  return newTiles;
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useBoardStore = create((set, get) => ({
  // ── Renderer ──
  rendererMode: '2d',
  setRendererMode: (mode) => set({ rendererMode: mode }),

  // ── Grid size (G-01) ──
  gridCols: DEFAULT_COLS,
  gridRows: DEFAULT_ROWS,
  setGridSize: (cols, rows) => {
    const c = Math.max(MIN_COLS, Math.min(MAX_COLS, cols));
    const r = Math.max(MIN_ROWS, Math.min(MAX_ROWS, rows));
    set({ gridCols: c, gridRows: r, tiles: buildEmptyGrid(c, r), history: [], future: [] });
  },

  // ── Grid overlay toggle (G-02) ──
  showGrid: true,
  setShowGrid: (v) => set({ showGrid: v }),

  // ── Tiles ──
  tiles: buildEmptyGrid(DEFAULT_COLS, DEFAULT_ROWS),
  selectedTile: 'grass',
  setSelectedTile: (tile) => set({ selectedTile: tile }),

  // ── Paint mode (G-04/G-06) ──
  paintMode: PAINT_MODES.BRUSH,
  setPaintMode: (mode) => set({ paintMode: mode }),

  // ── Undo / Redo history (G-07) ──
  history: [],  // stack of past tiles snapshots
  future: [],   // stack of undone snapshots (for redo)

  /** Commit current tiles to history before a mutation */
  _pushHistory: () => {
    const { tiles, history } = get();
    const newHistory = [...history, { ...tiles }].slice(-HISTORY_LIMIT);
    set({ history: newHistory, future: [] });
  },

  undo: () => {
    const { history, tiles } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      tiles: prev,
      history: history.slice(0, -1),
      future: [{ ...tiles }, ...get().future].slice(0, HISTORY_LIMIT),
    });
  },

  redo: () => {
    const { future, tiles } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      tiles: next,
      future: future.slice(1),
      history: [...get().history, { ...tiles }].slice(-HISTORY_LIMIT),
    });
  },

  // ── Place tile / eraser (G-04/G-06) ──
  placeTile: (col, row) => {
    const { paintMode, selectedTile, tiles, gridCols, gridRows, _pushHistory } = get();
    const key = `${col},${row}`;
    if (!tiles.hasOwnProperty(key)) return;

    if (paintMode === PAINT_MODES.FILL) {
      // Flood fill — handled separately by floodFillAt
      return;
    }

    const newTileType = paintMode === PAINT_MODES.ERASER ? 'grass' : selectedTile;
    if (tiles[key] === newTileType) return; // no change, skip history push

    _pushHistory();
    set((state) => ({ tiles: { ...state.tiles, [key]: newTileType } }));
  },

  // ── Flood fill at position (G-05) ──
  floodFillAt: (col, row) => {
    const { tiles, selectedTile, gridCols, gridRows, _pushHistory } = get();
    const newTiles = floodFill(tiles, col, row, selectedTile, gridCols, gridRows);
    if (newTiles === tiles) return; // nothing changed
    _pushHistory();
    set({ tiles: newTiles });
  },

  // ── Fill entire board with biome tile (T-03) ──
  fillBiome: (biomeId) => {
    const tileMap = {
      plains: 'grass', forest: 'forest', water: 'water',
      dungeon: 'dungeon', lava: 'lava', snow: 'snow',
    };
    const tileType = tileMap[biomeId] || 'grass';
    const { gridCols, gridRows, _pushHistory } = get();
    _pushHistory();
    set({ tiles: buildEmptyGrid(gridCols, gridRows, tileType), currentBiome: biomeId });
  },

  // ── Biome ──
  currentBiome: 'plains',
  setCurrentBiome: (biome) => set({ currentBiome: biome }),

  // ── Effects ──
  effects: {
    wind: true,
    clouds: true,
    rain: false,
    fog: false,
    dayTime: 0.6,
    windIntensity: 0.5,
    cloudSpeed: 0.3,
    fogDensity: 0.3,
    rainIntensity: 0.6,
  },
  setEffect: (key, value) =>
    set((state) => ({ effects: { ...state.effects, [key]: value } })),

  // ── Audio ──
  audio: { enabled: false, volume: 0.5 },
  setAudio: (key, value) =>
    set((state) => ({ audio: { ...state.audio, [key]: value } })),

  // ── Zoom & Pan (G-03) — managed by PixiBoard via Camera, stored here for TV sync ──
  zoom: 1,
  panX: 0,
  panY: 0,
  setZoomPan: (zoom, panX, panY) => set({ zoom, panX, panY }),
}));
