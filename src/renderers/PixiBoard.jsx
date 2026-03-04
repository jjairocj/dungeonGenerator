import { useEffect, useRef, useCallback } from 'react';
import {
    Application, Graphics, Container, TilingSprite, Texture,
    DisplacementFilter, Assets, Sprite,
} from 'pixi.js';
import { useBoardStore, PAINT_MODES } from '../store/boardStore';

// ─── Layout constants ─────────────────────────────────────────────────────────
const TILE_SIZE = 50;
const TILE_GAP = 0;
const STEP = TILE_SIZE + TILE_GAP;

// ─── Tile color palette ───────────────────────────────────────────────────────
const TILE_COLORS = {
    grass: { base: 0x5a9e5c, detail: 0x3d7a3f, shade: 0x2d5e2f },
    dirt: { base: 0x8b6340, detail: 0x6e4e30, shade: 0x5a3d24 },
    stone: { base: 0x8a8a9a, detail: 0x6a6a7a, shade: 0x4a4a5a },
    water: { base: 0x2980b9, detail: 0x5ab4e6, shade: 0x0d4f7a },
    sand: { base: 0xd4a853, detail: 0xb8893a, shade: 0x9a7030 },
    lava: { base: 0xe74c3c, detail: 0xc0392b, shade: 0x922b21 },
    snow: { base: 0xdceef8, detail: 0xb8d8ee, shade: 0x90b8d4 },
    forest: { base: 0x27ae60, detail: 0x1e8449, shade: 0x145a32 },
    dungeon: { base: 0x2c2c3c, detail: 0x1c1c2c, shade: 0x0c0c1c },
    wall: { base: 0x5a5a7a, detail: 0x3a3a5a, shade: 0x2a2a4a },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ─── Camera class (G-03) ─────────────────────────────────────────────────────
class Camera {
    constructor(worldContainer, viewportW, viewportH, worldW, worldH, minZoom = 0.2, maxZoom = 4) {
        this.world = worldContainer;
        this.vpW = viewportW;
        this.vpH = viewportH;
        this.worldW = worldW;
        this.worldH = worldH;
        this.minZoom = minZoom;
        this.maxZoom = maxZoom;
        this._zoom = 1;
        this._panX = 0;
        this._panY = 0;
        this._dragging = false;
        this._lastDrag = null;
    }

    get zoom() { return this._zoom; }

    applyTransform() {
        this.world.x = this._panX;
        this.world.y = this._panY;
        this.world.scale.set(this._zoom);
    }

    clampPan() {
        const scaledW = this.worldW * this._zoom;
        const scaledH = this.worldH * this._zoom;
        // Allow pan so world always fills the viewport (or is centered if smaller)
        const minX = Math.min(0, this.vpW - scaledW);
        const minY = Math.min(0, this.vpH - scaledH);
        this._panX = clamp(this._panX, minX, 0);
        this._panY = clamp(this._panY, minY, 0);
    }

    /** Zoom toward a point (screenX, screenY) */
    zoomAt(screenX, screenY, factor) {
        const newZoom = clamp(this._zoom * factor, this.minZoom, this.maxZoom);
        const ratio = newZoom / this._zoom;
        this._panX = screenX - (screenX - this._panX) * ratio;
        this._panY = screenY - (screenY - this._panY) * ratio;
        this._zoom = newZoom;
        this.clampPan();
        this.applyTransform();
    }

    onPointerDown(x, y) {
        this._dragging = true;
        this._lastDrag = { x, y };
    }

    onPointerMove(x, y) {
        if (!this._dragging || !this._lastDrag) return;
        this._panX += x - this._lastDrag.x;
        this._panY += y - this._lastDrag.y;
        this._lastDrag = { x, y };
        this.clampPan();
        this.applyTransform();
    }

    onPointerUp() {
        this._dragging = false;
        this._lastDrag = null;
    }

    /** Screen-space → world-space position */
    screenToWorld(sx, sy) {
        return {
            x: (sx - this._panX) / this._zoom,
            y: (sy - this._panY) / this._zoom,
        };
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PixiBoard() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const appRef = useRef(null);
    const layersGfxRef = useRef([]);
    const effectsRef = useRef({
        clouds: [], rain: [], embers: [],
        cloudCont: null, rainCont: null, emberCont: null,
        waterCont: null, displacementSprite: null,
        gridOverlay: null,
    });
    const timeRef = useRef(0);
    const paintingRef = useRef(false);
    const dragStartRef = useRef(null);
    const shapePreviewRef = useRef(null);
    const stateRef = useRef({});
    const animFrameRef = useRef(null);
    const cameraRef = useRef(null);

    // ── Store ──
    const levels = useBoardStore((s) => s.levels);
    const activeLevelIndex = useBoardStore((s) => s.activeLevelIndex);
    const activeLayerIndex = useBoardStore((s) => s.activeLayerIndex);
    const gridCols = useBoardStore((s) => s.gridCols);
    const gridRows = useBoardStore((s) => s.gridRows);
    const effects = useBoardStore((s) => s.effects);
    const currentBiome = useBoardStore((s) => s.currentBiome);
    const paintMode = useBoardStore((s) => s.paintMode);
    const showGrid = useBoardStore((s) => s.showGrid);
    const selectedTile = useBoardStore((s) => s.selectedTile);
    const placeTile = useBoardStore((s) => s.placeTile);
    const floodFillAt = useBoardStore((s) => s.floodFillAt);
    const fillShape = useBoardStore((s) => s.fillShape);
    const undo = useBoardStore((s) => s.undo);
    const redo = useBoardStore((s) => s.redo);

    // Selection (G-13)
    const selectionCoords = useBoardStore((s) => s.selectionCoords);
    const setSelection = useBoardStore((s) => s.setSelection);
    const clearSelection = useBoardStore((s) => s.clearSelection);
    const copySelection = useBoardStore((s) => s.copySelection);
    const pasteClipboard = useBoardStore((s) => s.pasteClipboard);

    // Keep stateRef current for use inside closures
    stateRef.current = { levels, activeLevelIndex, activeLayerIndex, effects, currentBiome, paintMode, selectedTile, placeTile, floodFillAt, fillShape, selectionCoords, setSelection, clearSelection };

    // ─ Tile draw logic ─
    const drawTile = useCallback((gfx, col, row, tileType, t) => {
        const colors = TILE_COLORS[tileType] || TILE_COLORS.grass;
        gfx.clear();
        gfx.x = col * STEP;
        gfx.y = row * STEP;

        if (tileType === 'water') {
            const waterBase = 0x3ab3d5;
            const waterDeep = 0x2b9ec2;
            const waterCaustic = 0x88e8f9;
            gfx.rect(0, 0, TILE_SIZE, TILE_SIZE);
            gfx.fill({ color: waterBase });
            const waveSpeed1 = t * 1.2;
            const waveSpeed2 = t * 0.8;
            gfx.beginPath();
            for (let i = 0; i < 3; i++) {
                const y1 = ((i * 20 + waveSpeed1 * 15) % 60) - 10;
                gfx.moveTo(-5, y1 + Math.sin(col + i) * 6);
                gfx.lineTo(TILE_SIZE + 5, y1 + 10 + Math.cos(row + i) * 6);
                const x1 = ((i * 20 - waveSpeed2 * 10) % 60) - 10;
                gfx.moveTo(x1 + Math.cos(col + i) * 6, -5);
                gfx.lineTo(x1 + 10 + Math.sin(row + i) * 6, TILE_SIZE + 5);
            }
            gfx.stroke({ color: waterCaustic, width: 2, alpha: 0.6 });
            gfx.rect(0, TILE_SIZE - 6, TILE_SIZE, 6);
            gfx.fill({ color: waterDeep, alpha: 0.4 });
            const foamWave = Math.sin(t * 2.5 + col * 1.5) * 2;
            gfx.beginPath();
            gfx.moveTo(0, 4 + foamWave);
            gfx.bezierCurveTo(15, 6 + foamWave, 35, 2 + foamWave, TILE_SIZE, 4 + foamWave);
            gfx.stroke({ color: 0xffffff, width: 2.5, alpha: 0.85 });

        } else if (tileType === 'lava') {
            gfx.rect(0, 0, TILE_SIZE, TILE_SIZE);
            gfx.fill({ color: colors.shade });
            for (let b = 0; b < 5; b++) {
                const bx = 6 + b * 8 + Math.sin(t * 1.5 + b * 1.3) * 3;
                const by = 25 + Math.cos(t * 2.0 + b * 0.9) * 9;
                const bs = 7 + Math.sin(t + b) * 2;
                const heat = Math.sin(t * 3 + b) * 0.5 + 0.5;
                gfx.ellipse(bx, by, bs, bs * 0.6);
                gfx.fill({ color: heat > 0.5 ? 0xf39c12 : 0xe74c3c, alpha: 0.9 });
            }

        } else if (tileType === 'forest') {
            gfx.rect(0, 0, TILE_SIZE, TILE_SIZE);
            gfx.fill({ color: colors.base });
            const fx = stateRef.current.effects;
            const wind = fx.wind ? Math.sin(t * 2.0 + col * 0.8 + row * 0.5) * fx.windIntensity * 5 : 0;
            gfx.rect(21 + wind * 0.3, 33, 7, 12);
            gfx.fill({ color: 0x5a3320 });
            gfx.poly([25 + wind, 6, 10 + wind * 0.7, 28, 40 + wind * 0.7, 28]);
            gfx.fill({ color: 0x1e5c2a });
            gfx.poly([25 + wind, 4, 12 + wind * 0.6, 24, 38 + wind * 0.6, 24]);
            gfx.fill({ color: 0x27ae60 });

        } else if (tileType === 'grass') {
            gfx.rect(0, 0, TILE_SIZE, TILE_SIZE);
            gfx.fill({ color: colors.base });

            const fx = stateRef.current.effects;
            const wind = fx.wind ? Math.sin(t * 2.2 + col * 0.6 + row * 0.4) * fx.windIntensity * 3 : 0;
            [[8, 36], [14, 28], [24, 34], [34, 26], [42, 36]].forEach(([gx, gy]) => {
                gfx.moveTo(gx, gy);
                gfx.lineTo(gx + wind + 1, gy - 8);
                gfx.stroke({ color: 0x3d7a3f, width: 1.5, alpha: 0.8 });
            });
        } else {
            gfx.rect(0, 0, TILE_SIZE, TILE_SIZE);
            gfx.fill({ color: colors.base });

            if (tileType === 'stone') {
                [[10, 15, 22, 30], [28, 8, 40, 22], [12, 36, 28, 44]].forEach(([x1, y1, x2, y2]) => {
                    gfx.moveTo(x1, y1); gfx.lineTo(x2, y2);
                    gfx.stroke({ color: colors.shade, width: 1, alpha: 0.4 });
                });
            } else if (tileType === 'dungeon') {
                gfx.moveTo(0, TILE_SIZE / 2); gfx.lineTo(TILE_SIZE, TILE_SIZE / 2);
                gfx.moveTo(TILE_SIZE / 2, 0); gfx.lineTo(TILE_SIZE / 2, TILE_SIZE);
                gfx.stroke({ color: 0x3a3a5a, width: 1, alpha: 0.5 });
            } else if (tileType === 'wall') {
                const bh = TILE_SIZE / 4;
                for (let r = 0; r < 4; r++) {
                    const off = r % 2 === 0 ? 0 : TILE_SIZE / 4;
                    for (let c = 0; c < 3; c++) {
                        gfx.rect(c * (TILE_SIZE / 2) + off, r * bh + 1, TILE_SIZE / 2 - 2, bh - 2);
                        gfx.fill({ color: colors.shade, alpha: 0.35 });
                    }
                }
            } else if (tileType === 'sand') {
                for (let si = 0; si < 3; si++) {
                    gfx.ellipse(TILE_SIZE / 2, 14 + si * 12, TILE_SIZE / 3, 4);
                    gfx.stroke({ color: 0xb8893a, width: 1, alpha: 0.3 });
                }
            } else if (tileType === 'snow') {
                [[10, 10], [30, 8], [18, 26], [38, 30], [8, 36]].forEach(([sx, sy]) => {
                    gfx.circle(sx, sy, 2);
                    gfx.fill({ color: 0xffffff, alpha: 0.5 });
                });
            } else if (tileType === 'dirt') {
                [[12, 18], [28, 12], [36, 28], [16, 36]].forEach(([sx, sy]) => {
                    gfx.circle(sx, sy, 3);
                    gfx.fill({ color: colors.shade, alpha: 0.35 });
                });
            }
        }

        // Borde constante intrínseco (Grid sutil)
        // Se dibuja en todos los tiles en sus bordes derecho e inferior
        gfx.moveTo(0, TILE_SIZE - 1);
        gfx.lineTo(TILE_SIZE, TILE_SIZE - 1);
        gfx.stroke({ color: 0x000000, width: 1, alpha: 0.15 });

        gfx.moveTo(TILE_SIZE - 1, 0);
        gfx.lineTo(TILE_SIZE - 1, TILE_SIZE);
        gfx.stroke({ color: 0x000000, width: 1, alpha: 0.15 });

    }, []);

    // ─── Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+C / Ctrl+V ─────────────────
    useEffect(() => {
        const handleKey = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    redo();
                } else if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault();
                    copySelection();
                } else if (e.key === 'v' || e.key === 'V') {
                    e.preventDefault();
                    if (cameraRef.current && appRef.current) {
                        const { x, y } = cameraRef.current.screenToWorld(
                            appRef.current.screen.width / 2,
                            appRef.current.screen.height / 2
                        );
                        pasteClipboard(Math.floor(x / STEP), Math.floor(y / STEP));
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [undo, redo, copySelection, pasteClipboard]);

    // ─── PixiJS initialization ────────────────────────────────────────────────
    useEffect(() => {
        if (!canvasRef.current || appRef.current) return;

        const cols = gridCols;
        const rows = gridRows;
        const bW = cols * STEP + 2;
        const bH = rows * STEP + 2;

        const app = new Application();
        appRef.current = app;

        const initPixiApp = async () => {
            await app.init({
                canvas: canvasRef.current,
                width: containerRef.current?.clientWidth || window.innerWidth - 280,
                height: containerRef.current?.clientHeight || window.innerHeight,
                background: 0x0a0a0f,
                antialias: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                autoDensity: true,
                resizeTo: containerRef.current || undefined,
            });

            const vpW = app.screen.width;
            const vpH = app.screen.height;

            // ── World container (Camera moves this) ──────────────────────────
            const worldContainer = new Container();
            app.stage.addChild(worldContainer);

            // ── Camera (G-03) ─────────────────────────────────────────────────
            const camera = new Camera(worldContainer, app.screen.width, app.screen.height, bW, bH);
            cameraRef.current = camera;

            // ── Displacement map for water ─────────────────────────────────
            let dispTexture = null;
            try {
                dispTexture = await Assets.load('/cloud.jpg');
                if (dispTexture.source) dispTexture.source.addressMode = 'repeat';
            } catch (err) {
                console.warn('Could not load cloud.jpg', err);
            }

            // ── Efectos de Agua Centralizados ─────────────────────────────────────────
            // We create a master displacement sprite for all water layers to share the same texture memory
            let dispSprite = null;
            if (dispTexture) {
                dispSprite = new Sprite(dispTexture);
                dispSprite.scale.set(1.5);
                dispSprite.renderable = false;
                app.stage.addChild(dispSprite); // Must be on stage for filter to work
            }

            // ── Effects container ──────────────────────────────────────────
            const fxContainer = new Container();
            worldContainer.addChild(fxContainer);

            // ── Shape Preview Container (G-08) ────────
            const shapePreview = new Graphics();
            shapePreview.eventMode = 'none';
            worldContainer.addChild(shapePreview);
            shapePreviewRef.current = shapePreview;

            // ── Selection Box Container (G-13) ────────
            const selectionBox = new Graphics();
            selectionBox.eventMode = 'none';
            worldContainer.addChild(selectionBox);
            effectsRef.current.selectionBox = selectionBox;

            // ── Dynamic Level/Layer Containers (G-09, G-11) ────────
            // Instead of one flat tile container, we hold layered containers
            // structure: layersGfxRef.current[levelIndex][layerIndex] = { cont: Container, tiles: { "x,y": { gfx, type, waterCont... } } }
            layersGfxRef.current = [];
            const { levels } = stateRef.current;

            // We create containers for the first few possible levels to be safe, or just map the existing ones
            levels.forEach((level, lIndex) => {
                const levelCont = new Container();
                worldContainer.addChildAt(levelCont, lIndex); // Insert levels dynamically at the bottom of the stack
                layersGfxRef.current[lIndex] = {
                    container: levelCont,
                    layers: []
                };

                level.layers.forEach((layer, lyIndex) => {
                    const layerCont = new Container();
                    const wCont = new Container(); // Water container per layer if needed

                    if (lyIndex === 0 && lIndex === 0 && dispSprite) {
                        // Apply water shader only to base layer of base floor for now
                        const dispFilter = new DisplacementFilter({ sprite: dispSprite, scale: { x: 20, y: 20 } });
                        wCont.filters = [dispFilter];
                    }

                    layerCont.addChild(wCont);
                    levelCont.addChild(layerCont);

                    const layerTiles = {};
                    // Build initial graphic objects
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const key = `${c},${r}`;
                            const tileType = layer.tiles[key];
                            const gfx = new Graphics();

                            if (tileType) {
                                drawTile(gfx, c, r, tileType, 0);
                            } else {
                                gfx.clear(); // Transparent
                            }

                            if (tileType === 'water') {
                                wCont.addChild(gfx);
                            } else {
                                layerCont.addChild(gfx);
                            }

                            layerTiles[key] = {
                                gfx, col: c, row: r, type: tileType,
                                waterCont: wCont, tileCont: layerCont
                            };
                        }
                    }

                    layersGfxRef.current[lIndex].layers[lyIndex] = {
                        container: layerCont,
                        waterContainer: wCont,
                        tiles: layerTiles
                    };
                });
            });
            console.log(`[PixiBoard] Initialized ${levels.length} levels. Board Children total: ${worldContainer.children.length}`);

            // ── Pointer events on World Container (G-04 Paint) ──────────
            worldContainer.eventMode = 'static';
            // Use hitArea to bypass child hit testing (fixes issues with filters/scale)
            worldContainer.hitArea = { contains: (x, y) => x >= 0 && x <= bW && y >= 0 && y <= bH };

            const handlePaintEvent = (e, isDrag) => {
                // Ignore middle (1) and right (2) clicks, they are for panning
                if (e.button === 1 || e.button === 2 || e.buttons === 4 || e.buttons === 2) return;

                if (isDrag && !paintingRef.current) return;
                if (!isDrag) paintingRef.current = true;

                const { paintMode: pm, placeTile: pt, floodFillAt: ff } = stateRef.current;

                // Get local position in the world to find which tile was clicked
                const pos = worldContainer.toLocal(e.global);
                const c = Math.floor(pos.x / STEP);
                const r = Math.floor(pos.y / STEP);

                if (pm === PAINT_MODES.RECTANGLE || pm === PAINT_MODES.ELLIPSE) {
                    if (!isDrag) {
                        dragStartRef.current = { c, r };
                        if (shapePreviewRef.current) shapePreviewRef.current.clear();
                    } else if (dragStartRef.current && shapePreviewRef.current) {
                        const startC = Math.max(0, Math.min(cols - 1, dragStartRef.current.c));
                        const startR = Math.max(0, Math.min(rows - 1, dragStartRef.current.r));
                        const endC = Math.max(0, Math.min(cols - 1, c));
                        const endR = Math.max(0, Math.min(rows - 1, r));

                        const minC = Math.min(startC, endC);
                        const maxC = Math.max(startC, endC);
                        const minR = Math.min(startR, endR);
                        const maxR = Math.max(startR, endR);

                        const pGfx = shapePreviewRef.current;
                        pGfx.clear();

                        if (pm === PAINT_MODES.RECTANGLE) {
                            pGfx.rect(minC * STEP, minR * STEP, (maxC - minC + 1) * STEP, (maxR - minR + 1) * STEP);
                            pGfx.fill({ color: 0x3498db, alpha: 0.3 });
                            pGfx.stroke({ color: 0x2980b9, width: 2, alpha: 0.8 });
                        } else if (pm === PAINT_MODES.ELLIPSE) {
                            const wC = maxC - minC;
                            const hR = maxR - minR;
                            const cx = (minC + wC / 2) * STEP + STEP / 2;
                            const cy = (minR + hR / 2) * STEP + STEP / 2;
                            const rx = ((wC + 1) * STEP) / 2;
                            const ry = ((hR + 1) * STEP) / 2;
                            pGfx.ellipse(cx, cy, rx, ry);
                            pGfx.fill({ color: 0x3498db, alpha: 0.3 });
                            pGfx.stroke({ color: 0x2980b9, width: 2, alpha: 0.8 });
                        }
                    }
                    return; // Skip drawing tiles individually
                }

                if (c >= 0 && c < cols && r >= 0 && r < rows) {
                    if (pm === PAINT_MODES.FILL && !isDrag) {
                        ff(c, r);
                    } else if (pm === PAINT_MODES.STAMP && !isDrag) {
                        stateRef.current.pasteClipboard(c, r);
                    } else if (pm !== PAINT_MODES.FILL && pm !== PAINT_MODES.STAMP) {
                        pt(c, r);
                    }
                }
            };

            worldContainer.on('pointerdown', (e) => handlePaintEvent(e, false));
            worldContainer.on('pointermove', (e) => handlePaintEvent(e, true));

            // ── Pointer events on stage (G-03/G-04) ─────────────────────
            app.stage.eventMode = 'static';
            // hitArea must cover the FULL viewport (not the world canvas)
            app.stage.hitArea = app.screen;

            app.stage.on('pointerup', (e) => {
                const pm = stateRef.current.paintMode;
                if ((pm === PAINT_MODES.RECTANGLE || pm === PAINT_MODES.ELLIPSE || pm === PAINT_MODES.SELECT) && dragStartRef.current) {
                    const pos = worldContainer.toLocal(e.global);
                    const c = Math.floor(pos.x / STEP);
                    const r = Math.floor(pos.y / STEP);

                    if (pm === PAINT_MODES.SELECT) {
                        const startC = Math.max(0, Math.min(cols - 1, dragStartRef.current.c));
                        const startR = Math.max(0, Math.min(rows - 1, dragStartRef.current.r));
                        const endC = Math.max(0, Math.min(cols - 1, c));
                        const endR = Math.max(0, Math.min(rows - 1, r));
                        stateRef.current.setSelection({
                            minC: Math.min(startC, endC), maxC: Math.max(startC, endC),
                            minR: Math.min(startR, endR), maxR: Math.max(startR, endR)
                        });
                    } else {
                        stateRef.current.fillShape(dragStartRef.current.c, dragStartRef.current.r, c, r, pm);
                    }

                    dragStartRef.current = null;
                    if (shapePreviewRef.current) shapePreviewRef.current.clear();
                }
                paintingRef.current = false;
                camera.onPointerUp();
            });
            app.stage.on('pointerupoutside', (e) => {
                const pm = stateRef.current.paintMode;
                if ((pm === PAINT_MODES.RECTANGLE || pm === PAINT_MODES.ELLIPSE || pm === PAINT_MODES.SELECT) && dragStartRef.current) {
                    dragStartRef.current = null;
                    if (shapePreviewRef.current) shapePreviewRef.current.clear();
                }
                paintingRef.current = false;
                camera.onPointerUp();
            });

            // ── Clouds ────────────────────────────────────────────────────
            const cloudCont = new Container();
            fxContainer.addChild(cloudCont);
            effectsRef.current.cloudCont = cloudCont;
            const clouds = [];
            for (let i = 0; i < 10; i++) {
                const cg = new Graphics();
                cg.ellipse(0, 0, 55, 20); cg.fill({ color: 0xffffff, alpha: 0.5 });
                cg.ellipse(-18, -10, 32, 16); cg.fill({ color: 0xffffff, alpha: 0.45 });
                cg.ellipse(18, -8, 36, 14); cg.fill({ color: 0xffffff, alpha: 0.45 });
                cg.x = Math.random() * bW;
                cg.y = Math.random() * bH * 0.4;
                cg.alpha = 0.3 + Math.random() * 0.3;
                cloudCont.addChild(cg);
                clouds.push({ gfx: cg, speed: 0.25 + Math.random() * 0.3, baseAlpha: cg.alpha });
            }
            effectsRef.current.clouds = clouds;

            // ── Rain ──────────────────────────────────────────────────────
            const rainCont = new Container();
            rainCont.alpha = 0;
            fxContainer.addChild(rainCont);
            effectsRef.current.rainCont = rainCont;
            const rain = [];
            for (let i = 0; i < 130; i++) {
                const rg = new Graphics();
                rg.moveTo(0, 0); rg.lineTo(2, 11);
                rg.stroke({ color: 0xa0c8ff, width: 1, alpha: 0.65 });
                rg.x = Math.random() * bW;
                rg.y = Math.random() * bH;
                rainCont.addChild(rg);
                rain.push({ gfx: rg, vy: 5 + Math.random() * 4 });
            }
            effectsRef.current.rain = rain;

            // ── Embers ────────────────────────────────────────────────────
            const emberCont = new Container();
            emberCont.alpha = 0;
            fxContainer.addChild(emberCont);
            effectsRef.current.emberCont = emberCont;
            const embers = [];
            for (let i = 0; i < 45; i++) {
                const eg = new Graphics();
                eg.circle(0, 0, 2); eg.fill({ color: 0xff6600, alpha: 0.8 });
                eg.x = Math.random() * bW;
                eg.y = bH + Math.random() * 80;
                emberCont.addChild(eg);
                embers.push({
                    gfx: eg,
                    vy: -(0.8 + Math.random() * 1.5),
                    vx: (Math.random() - 0.5) * 0.7,
                    life: Math.random(),
                });
            }
            effectsRef.current.embers = embers;

            // ── Scroll-to-zoom (G-03) ─────────────────────────────────────
            canvasRef.current.addEventListener('wheel', (e) => {
                e.preventDefault();
                const rect = canvasRef.current.getBoundingClientRect();
                const sx = e.clientX - rect.left;
                const sy = e.clientY - rect.top;
                const factor = e.deltaY < 0 ? 1.1 : 0.9;
                camera.zoomAt(sx, sy, factor);
            }, { passive: false });

            // ── Right-click drag to pan (G-03) ────────────────────────────
            let panActive = false;
            canvasRef.current.addEventListener('contextmenu', (e) => e.preventDefault());
            canvasRef.current.addEventListener('pointerdown', (e) => {
                if (e.button === 2 || e.button === 1) {
                    panActive = true;
                    camera.onPointerDown(e.offsetX, e.offsetY);
                }
            });
            window.addEventListener('pointermove', (e) => {
                if (panActive && cameraRef.current) {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    cameraRef.current.onPointerMove(e.clientX - rect.left, e.clientY - rect.top);
                }
            });
            window.addEventListener('pointerup', (e) => {
                if (e.button === 2 || e.button === 1) {
                    panActive = false;
                    camera.onPointerUp();
                }
            });

            // ── Animation loop ─────────────────────────────────────────────
            const renderFrame = () => {
                timeRef.current += 0.016;
                const t = timeRef.current;
                const { effects: fx, currentBiome: biome } = stateRef.current;

                // Displacement filter animation (water)
                if (effectsRef.current.displacementSprite) {
                    effectsRef.current.displacementSprite.x += 1;
                    effectsRef.current.displacementSprite.y -= 1;
                }

                // Draw static selection box (G-13)
                const sb = effectsRef.current.selectionBox;
                if (sb) {
                    sb.clear();
                    const { selectionCoords: sel } = stateRef.current;
                    if (sel) {
                        const w = (sel.maxC - sel.minC + 1) * STEP;
                        const h = (sel.maxR - sel.minR + 1) * STEP;
                        sb.rect(sel.minC * STEP, sel.minR * STEP, w, h);
                        sb.fill({ color: 0xf1c40f, alpha: 0.15 });
                        const pulse = (Math.sin(t * 4) * 0.5 + 0.5) * 0.5 + 0.5;
                        sb.stroke({ color: 0xf39c12, width: 3, alpha: pulse });
                    }
                }

                // Animate dynamic tiles across all levels and layers
                const { levels: currentLevels, activeLevelIndex } = stateRef.current;

                currentLevels.forEach((level, lIndex) => {
                    const levelRefs = layersGfxRef.current[lIndex];
                    if (!levelRefs) return;

                    // Fade underlying levels
                    if (lIndex < activeLevelIndex) {
                        levelRefs.container.alpha = 0.3; // Make lower floors semi-transparent
                        levelRefs.container.visible = true;
                    } else if (lIndex > activeLevelIndex) {
                        levelRefs.container.visible = false; // Hide upper floors
                    } else {
                        levelRefs.container.alpha = 1.0;
                        levelRefs.container.visible = true;
                    }

                    level.layers.forEach((layer, lyIndex) => {
                        const layerRefs = levelRefs.layers[lyIndex];
                        if (!layerRefs) return;

                        layerRefs.container.visible = layer.visible;

                        for (let r = 0; r < rows; r++) {
                            for (let c = 0; c < cols; c++) {
                                const key = `${c},${r}`;
                                const tt = layer.tiles[key];
                                const tileRef = layerRefs.tiles[key];

                                // State reconciliation
                                if (tileRef.type !== tt) {
                                    tileRef.type = tt;
                                    tileRef.gfx.clear();

                                    // Move between standard and water containers based on type
                                    if (tt === 'water') {
                                        if (tileRef.gfx.parent !== layerRefs.waterContainer) {
                                            layerRefs.waterContainer.addChild(tileRef.gfx);
                                        }
                                    } else {
                                        if (tileRef.gfx.parent !== layerRefs.container) {
                                            layerRefs.container.addChild(tileRef.gfx);
                                        }
                                    }

                                    if (tt) {
                                        drawTile(tileRef.gfx, c, r, tt, t);
                                    }
                                } else if (tt && ['lava', 'forest', 'grass', 'water'].includes(tt)) {
                                    drawTile(tileRef.gfx, c, r, tt, t);
                                }
                            }
                        }
                    });
                });

                // Clouds
                const wantClouds = fx.clouds || ['plains', 'forest'].includes(biome);
                cloudCont.alpha += ((wantClouds ? 0.9 : 0) - cloudCont.alpha) * 0.03;
                clouds.forEach(({ gfx: cg, speed, baseAlpha }) => {
                    cg.x += speed * fx.cloudSpeed;
                    if (cg.x > bW + 120) { cg.x = -180; cg.y = Math.random() * bH * 0.4; }
                    cg.alpha = baseAlpha * (0.85 + Math.sin(t * 0.5 + cg.y) * 0.15);
                });

                // Rain
                const wantRain = fx.rain ? fx.rainIntensity : 0;
                rainCont.alpha += (wantRain - rainCont.alpha) * 0.04;
                rain.forEach(({ gfx: rg, vy }) => {
                    rg.y += vy; rg.x += 1.5;
                    if (rg.y > bH) { rg.y = -15; rg.x = Math.random() * bW; }
                });

                // Embers
                const wantEmbers = biome === 'lava' ? 0.85 : 0;
                emberCont.alpha += (wantEmbers - emberCont.alpha) * 0.025;
                embers.forEach((e) => {
                    e.gfx.x += e.vx + Math.sin(t * 2 + e.life * 6.28) * 0.25;
                    e.gfx.y += e.vy;
                    e.life -= 0.004;
                    e.gfx.alpha = Math.max(0, e.life * 0.85);
                    if (e.life <= 0 || e.gfx.y < -20) {
                        e.gfx.x = Math.random() * bW;
                        e.gfx.y = bH;
                        e.life = 0.8 + Math.random() * 0.2;
                        e.vy = -(0.7 + Math.random() * 1.4);
                        e.vx = (Math.random() - 0.5) * 0.7;
                    }
                });

                app.renderer.render(app.stage);
                animFrameRef.current = requestAnimationFrame(renderFrame);
            };
            animFrameRef.current = requestAnimationFrame(renderFrame);
        };

        initPixiApp();

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (appRef.current) {
                // Do not use removeView: true as React manages the DOM node.
                try {
                    appRef.current.destroy(false, { children: true });
                } catch (err) {
                    console.warn("PixiJS App cleanup warning:", err);
                }
                appRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridCols, gridRows]); // Reinitialize if grid size changes (G-01)

    // Tile reconciliation is now exclusively handled by renderFrame looping over stateRef.current.levels

    // ─── Cursor style based on paint mode ─────────────────────────────────────
    const getCursor = () => {
        switch (paintMode) {
            case PAINT_MODES.ERASER: return 'cell';
            case PAINT_MODES.FILL: return 'crosshair';
            default: return 'crosshair';
        }
    };

    // ─── Zoom Controls (G-03 UI) ──────────────────────────────────────────────
    const handleZoom = (factor) => {
        if (!containerRef.current || !cameraRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Zoom around the center of the viewport
        cameraRef.current.zoomAt(rect.width / 2, rect.height / 2, factor);
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                flex: 1,
                overflow: 'hidden',
                background: '#0a0a0f',
                borderRadius: 8,
                cursor: getCursor(),
            }}
            onPointerUp={() => { paintingRef.current = false; }}
        >
            <canvas key={`${gridCols}-${gridRows}`} ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

            {/* Zoom Controls Overlay */}
            <div style={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'rgba(20, 20, 30, 0.8)',
                backdropFilter: 'blur(8px)',
                padding: 6,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 10
            }}>
                <button
                    onClick={() => handleZoom(1.5)} // Zoom In
                    style={{
                        width: 36, height: 36,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 20,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    title="Zoom In"
                >
                    +
                </button>
                <button
                    onClick={() => handleZoom(1 / 1.5)} // Zoom Out
                    style={{
                        width: 36, height: 36,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 24,
                        lineHeight: 1,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    title="Zoom Out"
                >
                    −
                </button>
            </div>
        </div>
    );
}
