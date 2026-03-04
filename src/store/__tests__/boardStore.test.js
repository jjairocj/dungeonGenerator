/**
 * EPIC 1 MVP — Unit Tests
 * Tests for boardStore covering G-01 through G-07
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore, PAINT_MODES, DEFAULT_COLS, DEFAULT_ROWS, MIN_COLS, MAX_COLS, MIN_ROWS, MAX_ROWS, HISTORY_LIMIT } from '../boardStore';


// Reset store before each test
beforeEach(() => {
    useBoardStore.setState({
        gridCols: DEFAULT_COLS,
        gridRows: DEFAULT_ROWS,
        tiles: Object.fromEntries(
            Array.from({ length: DEFAULT_ROWS }, (_, r) =>
                Array.from({ length: DEFAULT_COLS }, (_, c) => [`${c},${r}`, 'grass'])
            ).flat()
        ),
        selectedTile: 'grass',
        paintMode: PAINT_MODES.BRUSH,
        showGrid: true,
        history: [],
        future: [],
    });
});

// ─── G-01: Configurable Map Size ─────────────────────────────────────────────
describe('G-01: Configurable Map Size', () => {
    it('initializes with default grid size (20×14)', () => {
        const { gridCols, gridRows } = useBoardStore.getState();
        expect(gridCols).toBe(DEFAULT_COLS);
        expect(gridRows).toBe(DEFAULT_ROWS);
    });

    it('setGridSize changes the grid dimensions', () => {
        useBoardStore.getState().setGridSize(30, 20);
        const { gridCols, gridRows } = useBoardStore.getState();
        expect(gridCols).toBe(30);
        expect(gridRows).toBe(20);
    });

    it('setGridSize reinitializes tiles to match new dimensions', () => {
        useBoardStore.getState().setGridSize(10, 10);
        const { tiles } = useBoardStore.getState();
        // Should have exactly 10×10 = 100 tiles
        expect(Object.keys(tiles).length).toBe(100);
        expect(tiles['0,0']).toBe('grass');
        expect(tiles['9,9']).toBe('grass');
        expect(tiles['10,0']).toBeUndefined();
    });


    it('clamps cols to MIN_COLS when too small', () => {
        useBoardStore.getState().setGridSize(1, 20);
        expect(useBoardStore.getState().gridCols).toBe(MIN_COLS);
    });

    it('clamps cols to MAX_COLS when too large', () => {
        useBoardStore.getState().setGridSize(999, 20);
        expect(useBoardStore.getState().gridCols).toBe(MAX_COLS);
    });

    it('clamps rows to MIN_ROWS when too small', () => {
        useBoardStore.getState().setGridSize(20, 1);
        expect(useBoardStore.getState().gridRows).toBe(MIN_ROWS);
    });

    it('clamps rows to MAX_ROWS when too large', () => {
        useBoardStore.getState().setGridSize(20, 999);
        expect(useBoardStore.getState().gridRows).toBe(MAX_ROWS);
    });

    it('setGridSize clears history and future', () => {
        // Put something in history first
        useBoardStore.getState().placeTile(0, 0);
        useBoardStore.setState({ selectedTile: 'water' });
        useBoardStore.getState().placeTile(1, 0);
        // Now resize
        useBoardStore.getState().setGridSize(25, 16);
        const { history, future } = useBoardStore.getState();
        expect(history).toHaveLength(0);
        expect(future).toHaveLength(0);
    });
});

// ─── G-02: Grid Overlay Toggle ───────────────────────────────────────────────
describe('G-02: Grid Overlay Toggle', () => {
    it('showGrid defaults to true', () => {
        expect(useBoardStore.getState().showGrid).toBe(true);
    });

    it('setShowGrid(false) hides the grid', () => {
        useBoardStore.getState().setShowGrid(false);
        expect(useBoardStore.getState().showGrid).toBe(false);
    });

    it('setShowGrid(true) shows the grid again', () => {
        useBoardStore.getState().setShowGrid(false);
        useBoardStore.getState().setShowGrid(true);
        expect(useBoardStore.getState().showGrid).toBe(true);
    });
});

// ─── G-04: Paint Tiles (Brush mode) ──────────────────────────────────────────
describe('G-04: Brush Painting', () => {
    it('placeTile in brush mode sets the tile to selectedTile', () => {
        useBoardStore.setState({ selectedTile: 'water', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(0, 0);
        expect(useBoardStore.getState().tiles['0,0']).toBe('water');
    });

    it('placeTile pushes to history before making change', () => {
        useBoardStore.setState({ selectedTile: 'stone', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(2, 3);
        const { history } = useBoardStore.getState();
        expect(history.length).toBeGreaterThan(0);
        // Last history snapshot should have had grass at 2,3
        expect(history[history.length - 1]['2,3']).toBe('grass');
    });

    it('placeTile does not push history if tile type does not change', () => {
        useBoardStore.setState({ selectedTile: 'grass', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(0, 0); // already grass
        expect(useBoardStore.getState().history).toHaveLength(0);
    });

    it('placeTile does nothing in FILL mode (floodFillAt handles that)', () => {
        useBoardStore.setState({ selectedTile: 'water', paintMode: PAINT_MODES.FILL });
        useBoardStore.getState().placeTile(0, 0);
        // Tile should remain unchanged since placeTile does nothing in FILL mode
        expect(useBoardStore.getState().tiles['0,0']).toBe('grass');
    });
});

// ─── G-05: Flood Fill ────────────────────────────────────────────────────────
describe('G-05: Flood Fill', () => {
    it('floodFillAt fills an entire all-grass map with water', () => {
        useBoardStore.setState({ selectedTile: 'water' });
        useBoardStore.getState().floodFillAt(0, 0);
        const { tiles, gridCols, gridRows } = useBoardStore.getState();
        const allWater = Object.values(tiles).every((t) => t === 'water');
        expect(allWater).toBe(true);
    });

    it('floodFillAt only fills the contiguous region of the same type', () => {
        // Paint a wall of stone that divides the map
        const cols = DEFAULT_COLS;
        const rows = DEFAULT_ROWS;
        const stoneTiles = {};
        for (let r = 0; r < rows; r++) {
            stoneTiles[`${Math.floor(cols / 2)},${r}`] = 'stone';
        }
        useBoardStore.setState((s) => ({ tiles: { ...s.tiles, ...stoneTiles } }));

        useBoardStore.setState({ selectedTile: 'water' });
        useBoardStore.getState().floodFillAt(0, 0); // left side only

        const { tiles } = useBoardStore.getState();
        // Left side should be water
        expect(tiles['0,0']).toBe('water');
        // Right side should still be grass
        expect(tiles[`${cols - 1},0`]).toBe('grass');
        // The stone wall should be unchanged
        expect(tiles[`${Math.floor(cols / 2)},0`]).toBe('stone');
    });

    it('floodFillAt does nothing if target tile is already the selected tile', () => {
        useBoardStore.setState({ selectedTile: 'grass' }); // already grass everywhere
        const historyBefore = useBoardStore.getState().history.length;
        useBoardStore.getState().floodFillAt(0, 0);
        expect(useBoardStore.getState().history.length).toBe(historyBefore); // no history push
    });

    it('floodFillAt pushes to history', () => {
        useBoardStore.setState({ selectedTile: 'dirt' });
        useBoardStore.getState().floodFillAt(0, 0);
        expect(useBoardStore.getState().history.length).toBe(1);
    });
});

// ─── G-06: Eraser ────────────────────────────────────────────────────────────
describe('G-06: Eraser Mode', () => {
    it('eraser replaces any tile with grass', () => {
        // First paint a water tile
        useBoardStore.setState({ selectedTile: 'water', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(3, 4);
        expect(useBoardStore.getState().tiles['3,4']).toBe('water');

        // Now switch to eraser
        useBoardStore.setState({ paintMode: PAINT_MODES.ERASER });
        useBoardStore.getState().placeTile(3, 4);
        expect(useBoardStore.getState().tiles['3,4']).toBe('grass');
    });

    it('eraser does nothing if tile is already grass', () => {
        useBoardStore.setState({ paintMode: PAINT_MODES.ERASER });
        const historyBefore = useBoardStore.getState().history.length;
        useBoardStore.getState().placeTile(0, 0); // already grass
        expect(useBoardStore.getState().history.length).toBe(historyBefore);
    });
});

// ─── G-07: Undo / Redo ───────────────────────────────────────────────────────
describe('G-07: Undo/Redo History', () => {
    it('undo reverts the last tile placement', () => {
        useBoardStore.setState({ selectedTile: 'stone', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(0, 0);
        expect(useBoardStore.getState().tiles['0,0']).toBe('stone');

        useBoardStore.getState().undo();
        expect(useBoardStore.getState().tiles['0,0']).toBe('grass');
    });

    it('redo reapplies an undone action', () => {
        useBoardStore.setState({ selectedTile: 'lava', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(5, 5);
        useBoardStore.getState().undo();
        expect(useBoardStore.getState().tiles['5,5']).toBe('grass');
        useBoardStore.getState().redo();
        expect(useBoardStore.getState().tiles['5,5']).toBe('lava');
    });

    it('new action after undo clears the future (redo stack)', () => {
        useBoardStore.setState({ selectedTile: 'stone', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(0, 0);
        useBoardStore.getState().undo();
        // Now paint something new — redo should be gone
        useBoardStore.setState({ selectedTile: 'water' });
        useBoardStore.getState().placeTile(1, 1);
        expect(useBoardStore.getState().future).toHaveLength(0);
    });

    it('undo does nothing if history is empty', () => {
        const tilesBefore = { ...useBoardStore.getState().tiles };
        useBoardStore.getState().undo();
        expect(useBoardStore.getState().tiles).toEqual(tilesBefore);
    });

    it('redo does nothing if future stack is empty', () => {
        useBoardStore.setState({ selectedTile: 'stone', paintMode: PAINT_MODES.BRUSH });
        useBoardStore.getState().placeTile(0, 0);
        const tilesBefore = { ...useBoardStore.getState().tiles };
        useBoardStore.getState().redo(); // nothing in future
        expect(useBoardStore.getState().tiles).toEqual(tilesBefore);
    });

    it(`history is capped at ${HISTORY_LIMIT} entries`, () => {
        const tileKeys = Object.keys(useBoardStore.getState().tiles);
        for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
            const key = tileKeys[i % tileKeys.length];
            const [col, row] = key.split(',').map(Number);
            // Alternate between two different tile types to always cause a change
            const type = i % 2 === 0 ? 'water' : 'stone';
            useBoardStore.setState({ selectedTile: type });
            useBoardStore.getState().placeTile(col, row);
        }
        expect(useBoardStore.getState().history.length).toBeLessThanOrEqual(HISTORY_LIMIT);
    });

    it('undo/redo works with flood fill too', () => {
        useBoardStore.setState({ selectedTile: 'water' });
        useBoardStore.getState().floodFillAt(0, 0);
        const allWater = Object.values(useBoardStore.getState().tiles).every((t) => t === 'water');
        expect(allWater).toBe(true);

        useBoardStore.getState().undo();
        const allGrass = Object.values(useBoardStore.getState().tiles).every((t) => t === 'grass');
        expect(allGrass).toBe(true);

        useBoardStore.getState().redo();
        const allWaterAgain = Object.values(useBoardStore.getState().tiles).every((t) => t === 'water');
        expect(allWaterAgain).toBe(true);
    });

    it('multiple sequential undos work correctly', () => {
        useBoardStore.setState({ paintMode: PAINT_MODES.BRUSH });
        useBoardStore.setState({ selectedTile: 'stone' }); useBoardStore.getState().placeTile(0, 0);
        useBoardStore.setState({ selectedTile: 'water' }); useBoardStore.getState().placeTile(1, 0);
        useBoardStore.setState({ selectedTile: 'lava' }); useBoardStore.getState().placeTile(2, 0);

        useBoardStore.getState().undo(); // undo lava
        expect(useBoardStore.getState().tiles['2,0']).toBe('grass');
        useBoardStore.getState().undo(); // undo water
        expect(useBoardStore.getState().tiles['1,0']).toBe('grass');
        useBoardStore.getState().undo(); // undo stone
        expect(useBoardStore.getState().tiles['0,0']).toBe('grass');
    });
});

// ─── Paint mode switching ─────────────────────────────────────────────────────
describe('Paint mode (general)', () => {
    it('setPaintMode changes the active mode', () => {
        useBoardStore.getState().setPaintMode(PAINT_MODES.ERASER);
        expect(useBoardStore.getState().paintMode).toBe(PAINT_MODES.ERASER);

        useBoardStore.getState().setPaintMode(PAINT_MODES.FILL);
        expect(useBoardStore.getState().paintMode).toBe(PAINT_MODES.FILL);

        useBoardStore.getState().setPaintMode(PAINT_MODES.BRUSH);
        expect(useBoardStore.getState().paintMode).toBe(PAINT_MODES.BRUSH);
    });
});
