# Performance Patterns for PixiJS v8

Reference for choosing and applying the right performance strategy in the D&D Map Editor.

## When to Use What

| Scenario | Pattern | Speedup |
|---|---|---|
| Static tiles (stone, dirt, dungeon) | `generateTexture` + `Sprite` | 10–100x |
| 100+ identical animated particles | `ParticleContainer` + object pool | 10x |
| Water distortion effect | `DisplacementFilter` on `Container` | N/A (quality gain) |
| Animated tiles (grass, lava) | `Graphics` redraw per frame | Baseline |
| UI elements (HUD, panel) | Separate `Container` above world | Avoids filter side-effects |

## Strategy 1: Texture Caching

```js
// At initialization — build cache once
const textureCache = {};

function cacheTileTexture(app, type) {
  const g = new Graphics();
  // Draw the tile statically (t=0, no animation)
  drawTile(g, 0, 0, type, 0);
  const tex = app.renderer.generateTexture(g);
  g.destroy();
  textureCache[type] = tex;
}

const STATIC_TYPES = ['dirt', 'stone', 'wall', 'sand', 'snow', 'dungeon'];
STATIC_TYPES.forEach(t => cacheTileTexture(app, t));

// When populating grid:
const sprite = new Sprite(textureCache[tileType] ?? textureCache['dirt']);
sprite.x = col * STEP;
sprite.y = row * STEP;
tileContainer.addChild(sprite);
```

**Rule**: Only `Graphics` should be used for tiles that change appearance frame-by-frame (grass wind, lava glow). Everything else → texture + sprite.

## Strategy 2: Object Pooling with ParticleContainer

```js
// Setup: generate micro-textures
function makeParticleTexture(app, drawFn) {
  const g = new Graphics();
  drawFn(g);
  const tex = app.renderer.generateTexture(g);
  g.destroy();
  return tex;
}

const rainTex = makeParticleTexture(app, g => {
  g.moveTo(0, 0); g.lineTo(2, 12);
  g.stroke({ color: 0xa0c8ff, width: 1.5, alpha: 0.65 });
});

const emberTex = makeParticleTexture(app, g => {
  g.circle(0, 0, 2);
  g.fill({ color: 0xff6600, alpha: 0.8 });
});

// ParticleContainer
const rainCont = new ParticleContainer(300, {
  position: true,
  alpha: true,
  scale: false,
  tint: false,
  uvs: false,
});
fxContainer.addChild(rainCont);

// Pool array — preallocated, never destroyed
const rainPool = Array.from({ length: 130 }, () => {
  const s = new Sprite(rainTex);
  s.x = Math.random() * boardW;
  s.y = Math.random() * boardH;
  rainCont.addChild(s);
  return { sprite: s, vy: 5 + Math.random() * 4 };
});
```

## Strategy 3: Render Texture for Dynamic Areas

When a section of the map needs to be composite-rendered and reused as a static image:

```js
const renderTex = RenderTexture.create({ width: TILE_SIZE * 10, height: TILE_SIZE * 10 });
app.renderer.render({ container: sourceContainer, target: renderTex });
const compositeSprite = new Sprite(renderTex);
tileContainer.addChild(compositeSprite);
```

Useful for: pre-rendering decorative areas, fog-of-war masks, lighting overlays.

## FPS Monitoring

Add to the animation loop for debugging:

```js
let frameCount = 0;
let lastFpsTime = performance.now();

// In RAF loop:
frameCount++;
const now = performance.now();
if (now - lastFpsTime >= 1000) {
  console.log(`FPS: ${frameCount}`);
  frameCount = 0;
  lastFpsTime = now;
}
```

## Display Object Count Guidelines

Target for 20×20 tile map (400 tiles):

| Layer | Max objects | Strategy |
|---|---|---|
| tileContainer | 400 Sprites | Texture cache |
| waterContainer | varies | Graphics + Filter |
| effectsContainer | 300–500 Sprites | ParticleContainer |
| Total draw calls | <10 | Batching via shared texture |
