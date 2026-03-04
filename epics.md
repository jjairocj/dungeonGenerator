# DNDTiles — User Epic
*D&D Interactive Map Editor & Live Board for TV Display*

> **Visión**: Una aplicación web que permite al Dungeon Master diseñar, animar y mostrar mapas de D&D en una TV en tiempo real, con controles en una segunda pantalla/tab y efectos atmosféricos cinematográficos.

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│     DM Panel (control tab)      │  WS /  │     Game Board (TV screen)       │
│  - Herramientas de mapa          │ store  │  - PixiJS 2D canvas (default)    │
│  - Paleta de tiles/texturas      │──────▶ │  - Three.js 3D (opcional)        │
│  - Tokens & NPCs                 │        │  - Fog of War overlay            │
│  - Efectos atmosféricos          │        │  - Shaders GLSL (agua/fuego)     │
│  - Generadores de nombres        │        │  - Partículas ambientales        │
│  - Audio/ambiente                │        │  - Tokens de personajes          │
│  - Exportar / importar           │        │                                  │
└─────────────────────────────────┘        └──────────────────────────────────┘
```

---

## EPIC 1 — Lienzo y Sistema de Grid 🗺️

### MVP

| ID | Historia de usuario |
|----|---------------------|
| G-01 | Como DM, quiero un canvas de mapa configurable (tamaño en tiles: 20×20 hasta 100×100) para adaptarlo a escenas pequeñas o grandes. |
| G-02 | Como DM, quiero un grid cuadrado visible con opción de ocultarlo en la pantalla del jugador, para referencia de posicionamiento. |
| G-03 | Como DM, quiero hacer zoom y pan en el mapa con scroll + arrastre, para trabajar en mapas grandes. |
| G-04 | Como DM, quiero pintar tiles con click + drag (modo brocha), para crear terreno rápidamente. |
| G-05 | Como DM, quiero usar flood fill (balde de pintura) en una región contigua, para rellenar áreas grandes en un clic. |
| G-06 | Como DM, quiero un modo borrador para eliminar tiles del mapa. |
| G-07 | Como DM, quiero deshacer/rehacer acciones (Ctrl+Z / Ctrl+Y) con historial de al menos 50 pasos. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| G-08 | Como DM, quiero una herramienta rectangulo/elipse para dibujar regiones geométricas con un solo gesto. |
| G-09 | Como DM, quiero layers/capas (terreno base, decoraciones, objetos, tokens) para organizar el mapa. |
| G-10 | Como DM, quiero un grid hexagonal como alternativa al grid cuadrado. |
| G-11 | Como DM, quiero mapas multi-nivel (planta baja, 1er piso, subterráneo) con transición visual. |
| G-12 | Como DM, quiero guardar y cargar "stamps" (selecciones de tiles) para reutilizar habitaciones. |
| G-13 | Como DM, quiero una herramienta de selección de área para copiar/pegar secciones del mapa. |

---

## EPIC 2 — Tiles, Texturas y Biomas 🌿

### MVP

| ID | Historia de usuario |
|----|---------------------|
| T-01 | Como DM, quiero una paleta de tiles dividida por bioma (Plains, Forest, Water, Dungeon, Lava, Cave, Snow, Desert) para pintar el escenario. |
| T-02 | Como DM, quiero tiles con animaciones procedurales integradas (agua ondeante, lava pulsante, viento en hierba) para dar vida al mapa sin assets externos. |
| T-03 | Como DM, quiero seleccionar un bioma y que el tablero se llene completamente con ese tile de base (flood-fill global). |
| T-04 | Como DM, quiero ver una miniatura del tile antes de pintarlo para saber qué estoy seleccionando. |
| T-05 | Como DM, quiero tiles de transición automática entre biomas para que los bordes no se vean abruptos. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| T-06 | Como DM, quiero importar mis propias texturas/sprites (PNG/WEBP jusqu'à 512×512) para personalizar completamente el mapa. |
| T-07 | Como DM, quiero un sistema de texturas con variantes aleatorias por tile (3-4 variantes de hierba) para evitar patrones repetitivos. |
| T-08 | Como DM, quiero tiles de objetos decorativos (árboles, rocas, columnas, fogatas, barriles) como capa separada. |
| T-09 | Como DM, quiero tiles de muro con detección automática de borde (auto-tile Wall system) para que las paredes del dungeon se conecten correctamente. |
| T-10 | Como DM, quiero un sistema de preset "Room Templates" (habitación del trono, calabozo, taberna) para construir dungeons rápidamente. |
| T-11 | Como DM, quiero acceso a un catálogo de assets de comunidad (RPG Maker compatible) para enriquecer la biblioteca. |

---

## EPIC 3 — Efectos Atmosféricos y Shaders 🌧️

### MVP

| ID | Historia de usuario |
|----|---------------------|
| A-01 | Como DM, quiero activar/desactivar lluvia con un toggle, para crear ambiente dramático durante combates. |
| A-02 | Como DM, quiero activar nubes drifting y controlar su velocidad/densidad con un slider. |
| A-03 | Como DM, quiero activar niebla/fog y controlar su densidad, para dungeons oscuros o escenas místicas. |
| A-04 | Como DM, quiero un slider de intensidad de viento que afecte el movimiento de árboles/hierba en el canvas. |
| A-05 | Como DM, quiero efectos de partículas de fuego/llamas posicionables en el mapa (antorchas, fogatas). |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| A-06 | Como DM, quiero un ciclo de tiempo (amanecer/día/atardecer/noche) que cambie automáticamente el color ambiente del mapa. |
| A-07 | Como DM, quiero efectos de tormenta eléctrica (relámpagos procedurales + oscilación de luz). |
| A-08 | Como DM, quiero nieve cayendo con acumulación visual en tiles (shader de whitening gradual). |
| A-09 | Como DM, quiero cenizas/embers flotando en zonas de lava o post-batalla. |
| A-10 | Como DM, quiero ondas de calor (heat haze shader) en zonas de desierto y lava. |
| A-11 | Como DM, quiero efectos de agua submarina (caustics, bubbles) para mapas acuáticos. |
| A-12 | Como DM, quiero transiciones de efecto cinematográfico entre escenas (fade to black, wipe, iris). |

---

## EPIC 4 — Iluminación y Visibilidad 💡

### MVP

| ID | Historia de usuario |
|----|---------------------|
| L-01 | Como DM, quiero un Fog of War global que cubra todo el mapa en negro, para ocultar información a los jugadores en la TV. |
| L-02 | Como DM, quiero revelar tiles del mapa (click/brush) para ir mostrando el dungeon a medida que los jugadores exploran. |
| L-03 | Como DM, quiero definir el radio de visión de cada token en tiles y que el FOW se revele automáticamente alrededor de él. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| L-04 | Como DM, quiero fuentes de luz posicionables (antorcha = 3 tiles, linterna = 5 tiles, luz mágica = 8 tiles) con gradiente de iluminación circular. |
| L-05 | Como DM, quiero que las paredes bloqueen la visión (Line of Sight / LOS) de forma dinámica. |
| L-06 | Como DM, quiero un control de brillo/contraste global para ajustar el look del mapa (dungeon oscuro vs exterior soleado). |
| L-07 | Como DM, quiero efectos de luz dinámicos: antorchas que parpadean (flicker shader), luz mágica que pulsa. |
| L-08 | Como DM, quiero definir zonas de "luz siempre revelada" (áreas públicas) y "siempre oscuras" (trampas ocultas). |

---

## EPIC 5 — Tokens y Personajes 🧙

### MVP

| ID | Historia de usuario |
|----|---------------------|
| K-01 | Como DM, quiero colocar tokens (círculos coloreados con iniciales o avatar) sobre el mapa y moverlos entre tiles con drag & drop. |
| K-02 | Como DM, quiero tokens diferenciados por tipo: Jugador (color por personaje), NPC (tono neutro), Enemigo (rojo). |
| K-03 | Como DM, quiero un panel de tokens que muestre la lista de personajes activos con sus HP actuales. |
| K-04 | Como DM, quiero asignar un nombre y HP máximo a cada token para seguimiento en combate. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| K-05 | Como DM, quiero importar un PNG como avatar de token para personalización visual. |
| K-06 | Como DM, quiero una barra de HP visual bajo cada token (verde/amarillo/rojo según porcentaje). |
| K-07 | Como DM, quiero condiciones visuales sobre tokens: Poisoned (ícono verde), Stunned (estrellitas), Dead (X). |
| K-08 | Como DM, quiero tamaños de token configurables (Small/Medium/Large/Huge/Gargantuan) con footprint de tiles correspondiente. |
| K-09 | Como DM, quiero anclar un token a un tile para que no se mueva accidentalmente. |
| K-10 | Como DM, quiero que los tokens tengan aura visual configurable (radio de aura + color) para marcar spells o amenazas. |
| K-11 | Como DM, quiero un modo "jugador ve su token" donde los jugadores controlan solo su propio token desde sus dispositivos. |

---

## EPIC 6 — Iniciativa y Combate ⚔️

### MVP

| ID | Historia de usuario |
|----|---------------------|
| C-01 | Como DM, quiero un tracker de Iniciativa que liste a todos los combatientes en orden de turno. |
| C-02 | Como DM, quiero avanzar al siguiente turno con un botón, resaltando visualmente al token activo en el mapa. |
| C-03 | Como DM, quiero ingresar manualmente el roll de iniciativa de cada personaje/enemigo. |
| C-04 | Como DM, quiero modificar el HP de un token (+/−) durante el combate con un input rápido. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| C-05 | Como DM, quiero que el tracker de iniciativa muestre el AC y speed de cada combatiente. |
| C-06 | Como DM, quiero medir distancias en el mapa (en ft, asumiendo 5ft/tile) con una herramienta de regla. |
| C-07 | Como DM, quiero mostrar/ocultar el cono de ataque o rango de hechizos (radius template) en el mapa. |
| C-08 | Como DM, quiero lanzar dados directamente desde el tracker (d4–d20) con animación visual en el panel. |
| C-09 | Como DM, quiero auto-roll de iniciativa (d20 + modifier) para todos los tokens al inicio del combate. |

---

## EPIC 7 — Generadores de Nombres y Procedural 🎲

*Basado en donjon.bin.sh — Markov chain generators*

### MVP

| ID | Historia de usuario |
|----|---------------------|
| N-01 | Como DM, quiero un generador de nombres de personaje por raza (Humano, Elfo, Enano, Halfling, Orco, Tiefling, Draconiano) para crear NPCs al instante. |
| N-02 | Como DM, quiero generar nombres de lugar (ciudades, tabernas, ríos, montañas) para enriquecer el worldbuilding. |
| N-03 | Como DM, quiero generar nombres de dioses/deidades con estilo épico para religiones del mundo. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| N-04 | Como DM, quiero generación procedural de dungeons completos (habitaciones conectadas por corredores) exportable como mapa base. |
| N-05 | Como DM, quiero generación de town maps con distritos (mercado, noble, slums, harbor) y calles. |
| N-06 | Como DM, quiero generar una "Random Encounter Table" contextual al bioma activo. |
| N-07 | Como DM, quiero loot tables generativas por nivel de desafío (Challenge Rating). |
| N-08 | Como DM, quiero generar un NPC completo (nombre, raza, profesión, rasgo, motivación) con un clic. |
| N-09 | Como DM, quiero crear diccionarios de names personalizados para mis campañas homebrew. |

---

## EPIC 8 — Audio y Ambiente 🎵

### MVP

| ID | Historia de usuario |
|----|---------------------|
| S-01 | Como DM, quiero soundscapes de ambiente por bioma (forest: pájaros/viento, dungeon: gotas/pasos, tavern: voces/música) que suenen automáticamente al cambiar bioma. |
| S-02 | Como DM, quiero un control de volumen maestro y por categoría (ambiente, efectos, música). |
| S-03 | Como DM, quiero efectos de sonido instantáneos (combat: espadas, spell: explosión mágica, door: puerta pesada) activables con un botón. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| S-04 | Como DM, quiero crossfade automático entre soundscapes al cambiar de escena. |
| S-05 | Como DM, quiero un mixer de capas de audio (capa de ambiente + capa de música + capa de efectos) independientes. |
| S-06 | Como DM, quiero importar mis propios archivos de audio (MP3/OGG) para soundscapes personalizados. |
| S-07 | Como DM, quiero que los efectos de sonido se sincronicen con animaciones del mapa (trueno cuando aparece relámpago). |
| S-08 | Como DM, quiero un modo "Spotify Connect" para controlar música de Spotify sin salir de la app. |

---

## EPIC 9 — DM Notes y Gestión de Campaña 📖

### MVP

| ID | Historia de usuario |
|----|---------------------|
| D-01 | Como DM, quiero un panel de notas con texto enriquecido (MD) para apuntar info de la sesión. |
| D-02 | Como DM, quiero adjuntar notas a tiles específicos del mapa (hover revela la nota). |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| D-03 | Como DM, quiero una base de datos de NPCs de la campaña (nombre, descripción, relación con jugadores). |
| D-04 | Como DM, quiero una timeline de campaña donde registrar eventos clave por sesión. |
| D-05 | Como DM, quiero un sistema de "Secret Notes" visibles solo para el DM, no en la TV. |
| D-06 | Como DM, quiero integración con D&D Beyond (importar personajes/stats desde el API). |

---

## EPIC 10 — Export, Import y Sharing 📤

### MVP

| ID | Historia de usuario |
|----|---------------------|
| E-01 | Como DM, quiero exportar el mapa como PNG de alta resolución para imprimirlo o compartirlo. |
| E-02 | Como DM, quiero guardar y cargar proyectos de mapa en formato JSON (save/load local). |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| E-03 | Como DM, quiero exportar en formato compatible con Roll20 (JSON + image export para import directo). |
| E-04 | Como DM, quiero exportar en formato Foundry VTT module. |
| E-05 | Como DM, quiero compartir el mapa via URL corta para que otros DMs lo vean en modo "view-only". |
| E-06 | Como DM, quiero exportar el mapa como GIF animado (con efectos de viento/agua) para compartir en redes. |
| E-07 | Como DM, quiero exportar como PDF con leyenda de tiles y notas de mapa. |
| E-08 | Como DM, quiero importar mapas desde imágenes existentes (JPEG/PNG) como capa de fondo, encima de la cual colocar tiles digitales. |

---

## EPIC 11 — Modo TV y Pantalla del Jugador 📺

### MVP

| ID | Historia de usuario |
|----|---------------------|
| V-01 | Como DM, quiero un modo "Player View" que muestre el mapa limpio (sin UI de DM) para proyectar en TV. |
| V-02 | Como DM, quiero que los cambios que hago en el DM Panel (revelar FOW, mover tokens) se reflejen instantáneamente en la TV. |
| V-03 | Como DM, quiero abrir la Player View en una segunda ventana/monitor independiente. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| V-04 | Como DM, quiero un overlay de "scene transition" en la TV (fade, wipe, iris) cuando cambio de mapa. |
| V-05 | Como DM, quiero mostrar mensajes de texto dramáticos en la TV ("A SHADOW FALLS...") con tipografía épica y animada. |
| V-06 | Como DM, quiero controlar el zoom de la TV independientemente del zoom del panel DM. |
| V-07 | Como DM, quiero un modo "Theater" que atenúa los bordes del mapa con vignette para foco cinematográfico. |

---

## EPIC 12 — Colaboración Multijugador 🌐

### V2+

| ID | Historia de usuario |
|----|---------------------|
| M-01 | Como DM, quiero crear una sesión compartida via código de sala para jugar en línea. |
| M-02 | Como DM, quiero que los jugadores vean el mapa en sus dispositivos en tiempo real (WebSocket sync). |
| M-03 | Como jugador, quiero mover mi propio token en el mapa desde mi dispositivo. |
| M-04 | Como DM, quiero un chat de texto integrado visible para todos los participantes. |
| M-05 | Como DM, quiero compartir tiradas de dado en tiempo real (visible para todos). |

---

## EPIC 13 — Renderer 3D (Three.js) 🎮

### MVP (ya construido en POC)

| ID | Historia de usuario |
|----|---------------------|
| R-01 | Como DM, quiero alternar entre vista 2D (top-down PixiJS) y vista 3D (Three.js perspectiva) con un toggle. |
| R-02 | Como DM, quiero que el estado del mapa sea idéntico en ambos modos (mismos tiles, misma posición). |
| R-03 | Como DM, quiero OrbitControls en 3D para rotar/hacer pan de la cámara. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| R-04 | Como DM, quiero tiles en 3D con materiales PBR (normal maps, roughness, metalness) para apariencia cinematográfica. |
| R-05 | Como DM, quiero sombras dinámicas en 3D (token casting shadows sobre el terreno). |
| R-06 | Como DM, quiero animaciones de cámara automáticas en 3D (slow orbit, dramatic reveal). |

---

## Priorización — Roadmap

### 🟢 MVP (v1.0) — Lanzamiento inicial

```
EPIC 1 — Grid & Canvas (G-01 a G-07)
EPIC 2 — Tiles & Biomas (T-01 a T-05)
EPIC 3 — Efectos Atmosféricos (A-01 a A-05)
EPIC 4 — FOW básico (L-01 a L-03)
EPIC 5 — Tokens básicos (K-01 a K-04)
EPIC 6 — Initiative Tracker (C-01 a C-04)
EPIC 7 — Generadores de nombres (N-01 a N-03)
EPIC 8 — Audio básico (S-01 a S-03)
EPIC 9 — DM Notes (D-01 a D-02)
EPIC 10 — Save/Load + PNG export (E-01 a E-02)
EPIC 11 — Player View / TV Mode (V-01 a V-03)
EPIC 13 — 2D/3D toggle (R-01 a R-03)
```

### 🟡 V1.5 — Post-lanzamiento rápido

```
EPIC 4 — Light sources + LOS (L-04 a L-06)
EPIC 5 — Token avatars + HP bars (K-05 a K-07)
EPIC 6 — Spell templates + ruler (C-06 a C-07)
EPIC 7 — Dungeon generator (N-04 a N-05)
EPIC 10 — Roll20 export (E-03)
EPIC 11 — Scene transitions (V-04 a V-05)
```

### 🔵 V2.0 — Feature completo

```
EPIC 2 — Custom textures + auto-tile (T-06 a T-11)
EPIC 3 — Storm + snow + heat haze (A-06 a A-12)
EPIC 4 — Dynamic light flicker + LOS full (L-07 a L-08)
EPIC 5 — Auras + player-controlled tokens (K-10 a K-11)
EPIC 8 — Audio mixer + custom import (S-04 a S-08)
EPIC 9 — NPC DB + campaign timeline (D-03 a D-06)
EPIC 10 — Foundry + URL share + GIF export (E-04 a E-08)
EPIC 12 — Multiplayer full (M-01 a M-05)
EPIC 13 — PBR 3D + shadows (R-04 a R-06)
```

---

## Stack Técnico Recomendado

| Capa | Tecnología | Razón |
|------|-----------|-------|
| UI / DM Panel | React 18 + Vite | Componentes reactivos, hot reload |
| Estado global | Zustand | Simple, sin boilerplate |
| Renderer 2D | **PixiJS 8** ✅ | WebGL acelerado, shaders, partículas |
| Shaders | GLSL inline | Agua, fuego, viento, FOW |
| Renderer 3D | Three.js | Escenas 3D bajo demanda |
| Audio | Howler.js | Cross-browser, sprite support |
| Animaciones | GSAP | Tweens suaves (tokens, transiciones) |
| Networking | Socket.io | Multiplayer en V2 |
| Persistencia | IndexedDB / localStorage | Guardado local offline-first |
| Export | html2canvas + jsPDF | PNG/PDF export |
| Estilo | Vanilla CSS (dark gold theme) | Control total, sin deps extra |

---

## Referencias de Investigación

- **donjon.bin.sh** — Markov chain name generators (persona, lugar, deidad), dungeon generator, encounter tables, loot tables.
- **app.dungeonscrawl.com** — Top-down 2D map editor, multi-layer system, wall auto-tile, texture library, Fog of War, lighting con LOS, export PNG/PDF, Roll20 compatible, plugins system.

---

*Última actualización: Marzo 2026 — v1.0 Draft*
