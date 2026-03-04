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
  FILL: 'fill',         // flood fill on a single contiguous region
  RECTANGLE: 'rectangle', // fill a rectangular area (G-08)
  ELLIPSE: 'ellipse',     // fill an elliptical area (G-08)
  SELECT: 'select',       // select area for copy/paste (G-13)
  STAMP: 'stamp',         // paste saved clipboard (G-12)
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

const buildEmptyLevels = (cols, rows, defaultTile = 'grass') => {
  return [
    {
      id: 'level-0',
      name: 'Terreno Principal',
      layers: [
        { id: 'layer-bg', name: 'Suelo', visible: true, locked: false, tiles: buildEmptyGrid(cols, rows, defaultTile) },
        { id: 'layer-dec', name: 'Decoración', visible: true, locked: false, tiles: {} },
        { id: 'layer-obj', name: 'Objetos', visible: true, locked: false, tiles: {} }
      ]
    }
  ];
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
      if (tiles[nk] !== originType) continue; // Note: if tile is undefined (transparent), matches undefined
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
    set({ gridCols: c, gridRows: r, levels: buildEmptyLevels(c, r), history: [], future: [] });
  },

  // ── Grid overlay toggle (G-02) ──
  showGrid: true,
  setShowGrid: (v) => set({ showGrid: v }),

  // ── Map Architecture (G-09, G-11) ──
  levels: buildEmptyLevels(DEFAULT_COLS, DEFAULT_ROWS),
  activeLevelIndex: 0,
  activeLayerIndex: 0,

  setActiveLevel: (idx) => set({ activeLevelIndex: idx }),
  setActiveLayer: (idx) => set({ activeLayerIndex: idx }),

  toggleLayerVisibility: (levelIdx, layerIdx) => set((state) => {
    state._pushHistory();
    const newLevels = JSON.parse(JSON.stringify(state.levels));
    newLevels[levelIdx].layers[layerIdx].visible = !newLevels[levelIdx].layers[layerIdx].visible;
    return { levels: newLevels };
  }),

  toggleLayerLock: (levelIdx, layerIdx) => set((state) => {
    state._pushHistory();
    const newLevels = JSON.parse(JSON.stringify(state.levels));
    newLevels[levelIdx].layers[layerIdx].locked = !newLevels[levelIdx].layers[layerIdx].locked;
    return { levels: newLevels };
  }),

  addLevel: () => set((state) => {
    state._pushHistory();
    const newLevels = JSON.parse(JSON.stringify(state.levels));
    const newLevelIdx = newLevels.length;
    newLevels.push({
      id: `level-${Date.now()}`,
      name: `Floor ${newLevelIdx}`,
      layers: [
        { id: `layer-${Date.now()}-bg`, name: 'Base', visible: true, locked: false, tiles: {} }
      ]
    });
    return { levels: newLevels, activeLevelIndex: newLevelIdx, activeLayerIndex: 0 };
  }),

  addLayer: (levelIdx) => set((state) => {
    state._pushHistory();
    const newLevels = JSON.parse(JSON.stringify(state.levels));
    const newLayerIdx = newLevels[levelIdx].layers.length;
    newLevels[levelIdx].layers.push({
      id: `layer-${Date.now()}`,
      name: `Layer ${newLayerIdx}`,
      visible: true,
      locked: false,
      tiles: {}
    });
    return { levels: newLevels, activeLayerIndex: newLevels[levelIdx].layers.length - 1 };
  }),

  // ── Tiles Config ──
  selectedTile: 'grass',
  setSelectedTile: (tile) => set({ selectedTile: tile }),

  // ── Paint mode (G-04/G-06) ──
  paintMode: PAINT_MODES.BRUSH,
  setPaintMode: (mode) => set({ paintMode: mode }),

  // ── Undo / Redo history (G-07) ──
  history: [],  // stack of past levels snapshots
  future: [],   // stack of undone snapshots (for redo)

  /** Commit current levels to history before a mutation */
  _pushHistory: () => {
    const { levels, history } = get();
    // Deep clone levels to avoid reference mutation issues
    const levelsClone = JSON.parse(JSON.stringify(levels));
    const newHistory = [...history, levelsClone].slice(-HISTORY_LIMIT);
    set({ history: newHistory, future: [] });
  },

  undo: () => {
    const { history, levels } = get();
    if (history.length === 0) return;
    const prevLevels = history[history.length - 1];
    set({
      levels: prevLevels,
      history: history.slice(0, -1),
      future: [JSON.parse(JSON.stringify(levels)), ...get().future].slice(0, HISTORY_LIMIT),
    });
  },

  redo: () => {
    const { future, levels } = get();
    if (future.length === 0) return;
    const nextLevels = future[0];
    set({
      levels: nextLevels,
      future: future.slice(1),
      history: [...get().history, JSON.parse(JSON.stringify(levels))].slice(-HISTORY_LIMIT),
    });
  },

  // ── Place tile / eraser (G-04/G-06) ──
  placeTile: (col, row) => {
    const state = get();
    const { paintMode, selectedTile, levels, activeLevelIndex, activeLayerIndex, _pushHistory } = state;

    // Bounds check
    if (col < 0 || col >= state.gridCols || row < 0 || row >= state.gridRows) return;

    if (paintMode === PAINT_MODES.FILL) return;
    if (paintMode === PAINT_MODES.SELECT) return;
    if (paintMode === PAINT_MODES.STAMP) return; // handled by PixiBoard directly

    const layer = levels[activeLevelIndex].layers[activeLayerIndex];
    if (layer.locked || !layer.visible) return;

    const key = `${col},${row}`;

    // Eraser on top layers simply deletes the tile key to show underlying layers.
    let newTileType = selectedTile;
    if (paintMode === PAINT_MODES.ERASER) {
      if (activeLayerIndex === 0) {
        newTileType = 'grass'; // Bottom layer retains a default floor
      } else {
        newTileType = undefined;
      }
    }

    if (layer.tiles[key] === newTileType) return; // no change

    _pushHistory();

    const newLevels = [...levels];
    const targetLayer = { ...newLevels[activeLevelIndex].layers[activeLayerIndex] };
    targetLayer.tiles = { ...targetLayer.tiles };

    if (newTileType === undefined) {
      delete targetLayer.tiles[key];
    } else {
      targetLayer.tiles[key] = newTileType;
    }

    newLevels[activeLevelIndex].layers[activeLayerIndex] = targetLayer;
    set({ levels: newLevels });
  },

  // ── Flood fill at position (G-05) ──
  floodFillAt: (col, row) => {
    const { levels, activeLevelIndex, activeLayerIndex, selectedTile, gridCols, gridRows, _pushHistory } = get();
    const layer = levels[activeLevelIndex].layers[activeLayerIndex];
    if (layer.locked || !layer.visible) return;

    const newTiles = floodFill(layer.tiles, col, row, selectedTile, gridCols, gridRows);
    if (newTiles === layer.tiles) return; // nothing changed

    _pushHistory();
    const newLevels = [...levels];
    newLevels[activeLevelIndex].layers[activeLayerIndex] = {
      ...layer,
      tiles: newTiles
    };
    set({ levels: newLevels });
  },

  // ── Fill geometric shape (G-08) ──
  fillShape: (startCol, startRow, endCol, endRow, shapeType) => {
    const { selectedTile, levels, activeLevelIndex, activeLayerIndex, gridCols, gridRows, _pushHistory } = get();
    const layer = levels[activeLevelIndex].layers[activeLayerIndex];
    if (layer.locked || !layer.visible) return;

    const minC = Math.max(0, Math.min(startCol, endCol));
    const maxC = Math.min(gridCols - 1, Math.max(startCol, endCol));
    const minR = Math.max(0, Math.min(startRow, endRow));
    const maxR = Math.min(gridRows - 1, Math.max(startRow, endRow));

    let changed = false;
    const newTiles = { ...layer.tiles };

    if (shapeType === 'rectangle') {
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${c},${r}`;
          if (newTiles[key] !== selectedTile) {
            newTiles[key] = selectedTile;
            changed = true;
          }
        }
      }
    } else if (shapeType === 'ellipse') {
      // Ellipse algorithm based on center and radii
      const w = endCol - startCol;
      const h = endRow - startRow;
      const cx = startCol + w / 2;
      const cy = startRow + h / 2;
      const rx = Math.max(0.5, Math.abs(w / 2) + 0.3);
      const ry = Math.max(0.5, Math.abs(h / 2) + 0.3);

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const dx = c - cx;
          const dy = r - cy;
          if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
            const key = `${c},${r}`;
            if (newTiles[key] !== selectedTile) {
              newTiles[key] = selectedTile;
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      _pushHistory();
      const newLevels = [...levels];
      newLevels[activeLevelIndex].layers[activeLayerIndex] = { ...layer, tiles: newTiles };
      set({ levels: newLevels });
    }
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
    set({ levels: buildEmptyLevels(gridCols, gridRows, tileType), currentBiome: biomeId, activeLevelIndex: 0, activeLayerIndex: 0 });
  },

  // ── Selection & Clipboard (G-13) ──
  selectionCoords: null, // { minC, minR, maxC, maxR }
  setSelection: (coords) => set({ selectionCoords: coords }),
  clearSelection: () => set({ selectionCoords: null }),

  clipboard: null, // Array of { dx, dy, type }
  copySelection: () => {
    const { levels, activeLevelIndex, activeLayerIndex, selectionCoords } = get();
    if (!selectionCoords) return;

    // Copy strictly from active layer
    const tiles = levels[activeLevelIndex].layers[activeLayerIndex].tiles;

    const { minC, minR, maxC, maxR } = selectionCoords;
    const clip = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const key = `${c},${r}`;
        if (tiles[key]) {
          clip.push({ dx: c - minC, dy: r - minR, type: tiles[key] });
        }
      }
    }
    set({ clipboard: clip });
  },

  pasteClipboard: (targetCol, targetRow) => {
    const { clipboard, levels, activeLevelIndex, activeLayerIndex, gridCols, gridRows, _pushHistory } = get();
    if (!clipboard || clipboard.length === 0) return;

    const layer = levels[activeLevelIndex].layers[activeLayerIndex];
    if (layer.locked || !layer.visible) return;

    let changed = false;
    const newTiles = { ...layer.tiles };

    for (const cell of clipboard) {
      const c = targetCol + cell.dx;
      const r = targetRow + cell.dy;
      if (c >= 0 && c < gridCols && r >= 0 && r < gridRows) {
        const key = `${c},${r}`;
        if (newTiles[key] !== cell.type) {
          newTiles[key] = cell.type;
          changed = true;
        }
      }
    }

    if (changed) {
      _pushHistory();
      const newLevels = [...levels];
      newLevels[activeLevelIndex].layers[activeLayerIndex] = { ...layer, tiles: newTiles };
      set({ levels: newLevels });
    }
  },

  // ── Stamps Gallery (G-12) ──
  stamps: [], // Array of { id, name, tiles: [{dx, dy, type}] }
  saveStamp: (name) => {
    const { clipboard, stamps } = get();
    if (!clipboard || clipboard.length === 0) return;
    set({
      stamps: [...stamps, {
        id: `stamp-${Date.now()}`,
        name: name || `Sello ${stamps.length + 1}`,
        tiles: [...clipboard]
      }]
    });
  },
  deleteStamp: (id) => {
    set({ stamps: get().stamps.filter(s => s.id !== id) });
  },
  loadStampToClipboard: (stampId) => {
    const stamp = get().stamps.find(s => s.id === stampId);
    if (stamp) {
      set({ clipboard: [...stamp.tiles], paintMode: PAINT_MODES.STAMP });
    }
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
