import { useEffect, useRef, useCallback } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { useBoardStore } from '../store/boardStore';

const TILE_SIZE = 50;
const TILE_GAP = 2;
const STEP = TILE_SIZE + TILE_GAP;

// Tile color palette
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

export default function PixiBoard() {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const tilesGfxRef = useRef({});
    const effectsRef = useRef({ clouds: [], rain: [], embers: [], cloudCont: null, rainCont: null, emberCont: null });
    const timeRef = useRef(0);
    const paintingRef = useRef(false);
    const stateRef = useRef({});
    const animFrameRef = useRef(null);
    const boardWRef = useRef(0);
    const boardHRef = useRef(0);

    const tiles = useBoardStore((s) => s.tiles);
    const gridCols = useBoardStore((s) => s.gridCols);
    const gridRows = useBoardStore((s) => s.gridRows);
    const effects = useBoardStore((s) => s.effects);
    const currentBiome = useBoardStore((s) => s.currentBiome);
    const placeTile = useBoardStore((s) => s.placeTile);
    const setIsPainting = useBoardStore((s) => s.setIsPainting);

    stateRef.current = { tiles, effects, currentBiome, placeTile };

    // PixiJS v8 Graphics drawing helper
    const drawTile = useCallback((gfx, col, row, tileType, t) => {
        const x = col * STEP;
        const y = row * STEP;
        const colors = TILE_COLORS[tileType] || TILE_COLORS.grass;

        gfx.clear();
        gfx.x = x;
        gfx.y = y;

        const { effects: fx, currentBiome: biome } = stateRef.current;

        if (tileType === 'water') {
            // Base
            gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
            gfx.fill({ color: colors.base });
            // Animated waves
            for (let w = 0; w < 3; w++) {
                const wy = 10 + w * 13;
                const off = Math.sin(t * 2.0 + w * 1.2 + col * 0.5) * 4;
                gfx.moveTo(4, wy + off);
                gfx.bezierCurveTo(15, wy + off - 4, 30, wy + off + 4, TILE_SIZE - 4, wy - off);
                gfx.stroke({ color: colors.detail, width: 1.5, alpha: 0.7 });
            }
            // Shimmer dot
            const sx = ((Math.sin(t * 1.5 + col * 0.7) * 0.5 + 0.5) * (TILE_SIZE - 12)) + 6;
            const sy = ((Math.cos(t * 1.8 + row * 0.9) * 0.5 + 0.5) * (TILE_SIZE - 12)) + 6;
            gfx.ellipse(sx, sy, 4, 2);
            gfx.fill({ color: 0xffffff, alpha: 0.3 });

        } else if (tileType === 'lava') {
            gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
            gfx.fill({ color: colors.shade });
            // Lava blobs
            for (let b = 0; b < 5; b++) {
                const bx = 6 + b * 8 + Math.sin(t * 1.5 + b * 1.3) * 3;
                const by = 25 + Math.cos(t * 2.0 + b * 0.9) * 9;
                const bs = 7 + Math.sin(t + b) * 2;
                const heat = Math.sin(t * 3 + b) * 0.5 + 0.5;
                gfx.ellipse(bx, by, bs, bs * 0.6);
                gfx.fill({ color: heat > 0.5 ? 0xf39c12 : 0xe74c3c, alpha: 0.9 });
            }

        } else if (tileType === 'forest') {
            gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
            gfx.fill({ color: colors.base });
            const wind = fx.wind ? Math.sin(t * 2.0 + col * 0.8 + row * 0.5) * fx.windIntensity * 5 : 0;
            // Trunk
            gfx.rect(21 + wind * 0.3, 33, 7, 12);
            gfx.fill({ color: 0x5a3320 });
            // Canopy
            gfx.poly([25 + wind, 6, 10 + wind * 0.7, 28, 40 + wind * 0.7, 28]);
            gfx.fill({ color: 0x1e5c2a });
            gfx.poly([25 + wind, 4, 12 + wind * 0.6, 24, 38 + wind * 0.6, 24]);
            gfx.fill({ color: 0x27ae60 });

        } else if (tileType === 'grass') {
            gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
            gfx.fill({ color: colors.base });
            // Bevel top
            gfx.rect(0, 0, TILE_SIZE, 3);
            gfx.fill({ color: 0x7ac47c, alpha: 0.4 });
            // Grass tufts
            const wind = fx.wind ? Math.sin(t * 2.2 + col * 0.6 + row * 0.4) * fx.windIntensity * 3 : 0;
            [[8, 36], [14, 28], [24, 34], [34, 26], [42, 36]].forEach(([gx, gy]) => {
                gfx.moveTo(gx, gy);
                gfx.lineTo(gx + wind + 1, gy - 8);
                gfx.stroke({ color: 0x3d7a3f, width: 1.5, alpha: 0.8 });
            });

        } else {
            // Generic
            gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
            gfx.fill({ color: colors.base });
            // Bevel
            gfx.rect(0, 0, TILE_SIZE, 3);
            gfx.fill({ color: 0xffffff, alpha: 0.08 });
            gfx.rect(0, TILE_SIZE - 3, TILE_SIZE, 3);
            gfx.fill({ color: 0x000000, alpha: 0.12 });

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
    }, []);

    useEffect(() => {
        if (!canvasRef.current || appRef.current) return;

        const app = new Application();
        appRef.current = app;

        const cols = gridCols;
        const rows = gridRows;
        const bW = cols * STEP + 2;
        const bH = rows * STEP + 2;
        boardWRef.current = bW;
        boardHRef.current = bH;

        app.init({
            canvas: canvasRef.current,
            width: bW,
            height: bH,
            background: 0x0a0a0f,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
        }).then(() => {
            // Tile layer
            const tileContainer = new Container();
            app.stage.addChild(tileContainer);

            // Effects layer
            const fxContainer = new Container();
            app.stage.addChild(fxContainer);

            // Build tile graphics
            const { tiles } = stateRef.current;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const key = `${c},${r}`;
                    const gfx = new Graphics();
                    drawTile(gfx, c, r, tiles[key] || 'grass', 0);
                    gfx.eventMode = 'static';
                    gfx.cursor = 'crosshair';
                    tileContainer.addChild(gfx);
                    tilesGfxRef.current[key] = { gfx, col: c, row: r };

                    gfx.on('pointerdown', () => {
                        paintingRef.current = true;
                        stateRef.current.placeTile(c, r);
                    });
                    gfx.on('pointerover', () => {
                        if (paintingRef.current) stateRef.current.placeTile(c, r);
                    });
                }
            }

            app.stage.eventMode = 'static';
            app.stage.on('pointerup', () => { paintingRef.current = false; });
            app.stage.on('pointerupoutside', () => { paintingRef.current = false; });

            // --- Clouds ---
            const cloudCont = new Container();
            fxContainer.addChild(cloudCont);
            effectsRef.current.cloudCont = cloudCont;
            const clouds = [];
            for (let i = 0; i < 10; i++) {
                const cg = new Graphics();
                // Draw cloud shape
                cg.ellipse(0, 0, 55, 20);
                cg.fill({ color: 0xffffff, alpha: 0.5 });
                cg.ellipse(-18, -10, 32, 16);
                cg.fill({ color: 0xffffff, alpha: 0.45 });
                cg.ellipse(18, -8, 36, 14);
                cg.fill({ color: 0xffffff, alpha: 0.45 });
                cg.x = Math.random() * bW;
                cg.y = Math.random() * bH * 0.4;
                cg.alpha = 0.3 + Math.random() * 0.3;
                cloudCont.addChild(cg);
                clouds.push({ gfx: cg, speed: 0.25 + Math.random() * 0.3, baseAlpha: cg.alpha });
            }
            effectsRef.current.clouds = clouds;

            // --- Rain ---
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

            // --- Embers ---
            const emberCont = new Container();
            emberCont.alpha = 0;
            fxContainer.addChild(emberCont);
            effectsRef.current.emberCont = emberCont;
            const embers = [];
            for (let i = 0; i < 45; i++) {
                const eg = new Graphics();
                eg.circle(0, 0, 2);
                eg.fill({ color: 0xff6600, alpha: 0.8 });
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

            // --- Animation loop (manual RAF, skip PixiJS ticker to avoid StrictMode issues) ---
            let lastTime = performance.now();
            const animate = (now) => {
                const dt = Math.min((now - lastTime) / 1000, 0.05);
                lastTime = now;
                timeRef.current += dt;
                const t = timeRef.current;
                const { tiles, effects: fx, currentBiome: biome } = stateRef.current;

                // Redraw animated tiles
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const key = `${c},${r}`;
                        const tt = tiles[key] || 'grass';
                        if (['water', 'lava', 'forest', 'grass'].includes(tt)) {
                            drawTile(tilesGfxRef.current[key].gfx, c, r, tt, t);
                        }
                    }
                }

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

                // Embers (lava biome)
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

                // Render
                app.renderer.render(app.stage);
                animFrameRef.current = requestAnimationFrame(animate);
            };
            animFrameRef.current = requestAnimationFrame(animate);
        });

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            // Don't destroy app on StrictMode unmount; check flag
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync non-animated tile changes immediately
    useEffect(() => {
        if (!tilesGfxRef.current) return;
        Object.entries(tilesGfxRef.current).forEach(([key, { gfx, col, row }]) => {
            const tileType = tiles[key] || 'grass';
            if (!['water', 'lava', 'forest', 'grass'].includes(tileType)) {
                drawTile(gfx, col, row, tileType, timeRef.current);
            }
        });
    }, [tiles, drawTile]);

    const boardW = gridCols * STEP;
    const boardH = gridRows * STEP;

    return (
        <div style={{
            position: 'relative',
            width: boardW,
            height: boardH,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 0 40px rgba(200,168,75,0.3), 0 0 80px rgba(0,0,0,0.8)',
            flexShrink: 0,
        }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}
