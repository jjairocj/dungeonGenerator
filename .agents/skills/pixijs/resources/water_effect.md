# Water Effect: DisplacementFilter Setup

Full details for the water tile displacement effect implementation (RedStapler technique).

## Required Asset

`public/cloud.jpg` — Noise/cloud grayscale texture used as displacement map.
Source: https://github.com/8ctopotamus/pixi-water-effect-example

## Complete Setup Flow

```jsx
import { Application, Assets, Sprite, DisplacementFilter, Container, Graphics } from 'pixi.js';

// 1. During app.init(...) async setup — AFTER app.init() resolves
const dispTexture = await Assets.load('/cloud.jpg');
if (dispTexture.source) {
  dispTexture.source.addressMode = 'repeat'; // v8 API (was wrapMode in v5/v6)
}

// 2. Create water container BEFORE tile container so it renders behind
const waterContainer = new Container();
app.stage.addChildAt(waterContainer, 0);

// 3. Create invisible displacement sprite
const dispSprite = new Sprite(dispTexture);
dispSprite.scale.set(1.5);           // Scale of the noise pattern
dispSprite.renderable = false;       // CRITICAL: must be false or it renders on screen
app.stage.addChild(dispSprite);      // Must be on stage (not waterContainer) to work as filter

// 4. Apply filter to the water layer
const dispFilter = new DisplacementFilter({
  sprite: dispSprite,
  scale: { x: 20, y: 20 }, // Displacement intensity — lower = subtler
});
waterContainer.filters = [dispFilter];

// 5. Store refs for animation loop
effectsRef.current.displacementSprite = dispSprite;
effectsRef.current.waterCont = waterContainer;
```

## Animation (in ticker / RAF loop)

```js
// Moves the noise map diagonally — creates fluid ripple illusion
if (effectsRef.current.displacementSprite) {
  effectsRef.current.displacementSprite.x += 1;  // Speed: ~1px/frame
  effectsRef.current.displacementSprite.y -= 1;  // Adjust for desired direction
}
```

## Water Tile Base (Graphics drawing)

Water tiles use `Graphics` (not Sprites) because each tile needs to look slightly different:

```js
function drawWaterTile(gfx, col, row) {
  // Base fill
  gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
  gfx.fill({ color: 0x2b9ec2 }); // Deep cyan base

  // Shimmer highlights (caustics)
  gfx.roundRect(3, 3, TILE_SIZE - 6, TILE_SIZE - 6, 2);
  gfx.fill({ color: 0x3dc5e0, alpha: 0.5 });

  // Top bevel (foam edge)
  gfx.rect(0, 0, TILE_SIZE, 3);
  gfx.fill({ color: 0xaef0ff, alpha: 0.4 });

  // White caustic lines
  [[8, 12, 32, 12], [14, 24, 28, 24], [20, 36, 38, 36]].forEach(([x1, y1, x2, y2]) => {
    gfx.moveTo(x1, y1); gfx.lineTo(x2, y2);
    gfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.3 });
  });
}
```

## Displacement Scale Tuning

| `scale.x/y` | Effect |
|---|---|
| 5 | Very subtle shimmer — best for "clean" Zelda look |
| 20 | Clear distortion — shows displacement clearly |
| 50+ | Heavy distortion — breaks tile edges (avoid) |

## Known Limitations

- `DisplacementFilter` distorts the ENTIRE content of `waterContainer` including tile borders.
- Grid black lines between tiles will ripple/deform slightly. Reduce scale to minimize.
- `ParticleContainer` does NOT support DisplacementFilter. Water must stay in a regular `Container`.
