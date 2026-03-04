import { create } from 'zustand';

export const BIOMES = {
  plains: { label: 'Plains', icon: '🌾', color: '#7db87e', ambient: 'wind' },
  forest: { label: 'Forest', icon: '🌲', color: '#2d6a2d', ambient: 'forest' },
  water:  { label: 'Water',  icon: '🌊', color: '#1a6b9a', ambient: 'rain'   },
  dungeon:{ label: 'Dungeon',icon: '🏚️', color: '#3a3040', ambient: 'dungeon'},
  lava:   { label: 'Lava',   icon: '🌋', color: '#8b2500', ambient: 'fire'   },
  snow:   { label: 'Snow',   icon: '❄️', color: '#c8e0f0', ambient: 'wind'   },
};

export const TILE_TYPES = [
  { id: 'grass',   label: 'Grass',   color: '#5a9e5c', icon: '🌿' },
  { id: 'dirt',    label: 'Dirt',    color: '#8b6340', icon: '🟫' },
  { id: 'stone',   label: 'Stone',   color: '#7a7a8a', icon: '⬜' },
  { id: 'water',   label: 'Water',   color: '#2980b9', icon: '💧' },
  { id: 'sand',    label: 'Sand',    color: '#c8a84b', icon: '🏜️' },
  { id: 'lava',    label: 'Lava',    color: '#e74c3c', icon: '🔥' },
  { id: 'snow',    label: 'Snow',    color: '#dceef8', icon: '❄️' },
  { id: 'forest',  label: 'Forest',  color: '#27ae60', icon: '🌲' },
  { id: 'dungeon', label: 'Dungeon', color: '#2c2c3c', icon: '⬛' },
  { id: 'wall',    label: 'Wall',    color: '#555577', icon: '🧱' },
];

const GRID_COLS = 20;
const GRID_ROWS = 14;

const initGrid = () => {
  const grid = {};
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      grid[`${c},${r}`] = 'grass';
    }
  }
  return grid;
};

export const useBoardStore = create((set, get) => ({
  // Renderer
  rendererMode: '2d',
  setRendererMode: (mode) => set({ rendererMode: mode }),

  // Grid
  gridCols: GRID_COLS,
  gridRows: GRID_ROWS,
  tiles: initGrid(),
  selectedTile: 'grass',
  setSelectedTile: (tile) => set({ selectedTile: tile }),
  placeTile: (col, row) => {
    const key = `${col},${row}`;
    set((state) => ({
      tiles: { ...state.tiles, [key]: state.selectedTile },
    }));
  },
  fillBiome: (biomeId) => {
    const tileMap = {
      plains: 'grass', forest: 'forest', water: 'water',
      dungeon: 'dungeon', lava: 'lava', snow: 'snow',
    };
    const tileType = tileMap[biomeId] || 'grass';
    const grid = {};
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        grid[`${c},${r}`] = tileType;
      }
    }
    set({ tiles: grid, currentBiome: biomeId });
  },

  // Biome
  currentBiome: 'plains',
  setCurrentBiome: (biome) => set({ currentBiome: biome }),

  // Effects
  effects: {
    wind: true,
    clouds: true,
    rain: false,
    fog: false,
    dayTime: 0.6,  // 0 = night, 1 = noon
    windIntensity: 0.5,
    cloudSpeed: 0.3,
    fogDensity: 0.3,
    rainIntensity: 0.6,
  },
  setEffect: (key, value) =>
    set((state) => ({
      effects: { ...state.effects, [key]: value },
    })),

  // Audio
  audio: {
    enabled: false,
    volume: 0.5,
  },
  setAudio: (key, value) =>
    set((state) => ({
      audio: { ...state.audio, [key]: value },
    })),

  // Paint mode
  isPainting: false,
  setIsPainting: (v) => set({ isPainting: v }),
}));
