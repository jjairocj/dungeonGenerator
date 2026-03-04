import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useBoardStore } from '../store/boardStore';

const TILE_W = 1.05;
const TILE_H = 0.18;
const GAP = 0.05;
const STEP = TILE_W + GAP;

const TILE_MATERIAL_PROPS = {
    grass: { color: '#5a9e5c', roughness: 0.85, metalness: 0.0 },
    dirt: { color: '#8b6340', roughness: 0.9, metalness: 0.0 },
    stone: { color: '#8a8a9a', roughness: 0.7, metalness: 0.15 },
    water: { color: '#2980b9', roughness: 0.05, metalness: 0.0 },
    sand: { color: '#d4a853', roughness: 0.9, metalness: 0.0 },
    lava: { color: '#e74c3c', roughness: 0.4, metalness: 0.0, emissive: '#9b1a0a', emissiveIntensity: 1.0 },
    snow: { color: '#dceef8', roughness: 0.7, metalness: 0.05 },
    forest: { color: '#27ae60', roughness: 0.85, metalness: 0.0 },
    dungeon: { color: '#2c2c3c', roughness: 0.8, metalness: 0.1 },
    wall: { color: '#5a5a7a', roughness: 0.75, metalness: 0.2 },
};

export default function ThreeBoard() {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const tilesRef = useRef({});
    const meshesRef = useRef({});
    const lightsRef = useRef({});
    const frameRef = useRef(null);
    const stateRef = useRef({});
    const timeRef = useRef(0);

    const tiles = useBoardStore((s) => s.tiles);
    const gridCols = useBoardStore((s) => s.gridCols);
    const gridRows = useBoardStore((s) => s.gridRows);
    const effects = useBoardStore((s) => s.effects);
    const currentBiome = useBoardStore((s) => s.currentBiome);
    const placeTile = useBoardStore((s) => s.placeTile);

    stateRef.current = { tiles, effects, currentBiome, placeTile };

    useEffect(() => {
        if (!mountRef.current) return;

        const W = mountRef.current.clientWidth;
        const H = mountRef.current.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0f);
        scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);
        sceneRef.current = scene;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(W, H);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Camera (isometric-ish)
        const aspect = W / H;
        const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
        const cx = (gridCols * STEP) / 2;
        const cz = (gridRows * STEP) / 2;
        camera.position.set(cx, 18, cz + 14);
        camera.lookAt(cx, 0, cz);
        cameraRef.current = camera;

        // Lights
        const ambient = new THREE.AmbientLight(0x334466, 0.6);
        scene.add(ambient);
        lightsRef.current.ambient = ambient;

        const sun = new THREE.DirectionalLight(0xfff4e0, 2.5);
        sun.position.set(cx + 10, 20, cz - 10);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 80;
        sun.shadow.camera.left = -40;
        sun.shadow.camera.right = 40;
        sun.shadow.camera.top = 30;
        sun.shadow.camera.bottom = -30;
        scene.add(sun);
        lightsRef.current.sun = sun;

        const lavaGlow = new THREE.PointLight(0xff4400, 0, 20);
        lavaGlow.position.set(cx, 3, cz);
        scene.add(lavaGlow);
        lightsRef.current.lavaGlow = lavaGlow;

        // Grid of tiles
        const geo = new THREE.BoxGeometry(TILE_W, TILE_H, TILE_W);

        const { tiles } = stateRef.current;

        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const key = `${col},${row}`;
                const tileType = tiles[key] || 'grass';
                const props = TILE_MATERIAL_PROPS[tileType] || TILE_MATERIAL_PROPS.grass;

                const mat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(props.color),
                    roughness: props.roughness,
                    metalness: props.metalness,
                    emissive: props.emissive ? new THREE.Color(props.emissive) : new THREE.Color(0x000000),
                    emissiveIntensity: props.emissiveIntensity || 0,
                });

                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(col * STEP, 0, row * STEP);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData = { col, row, key };
                scene.add(mesh);
                meshesRef.current[key] = mesh;

                // Extra geometry for tall tiles (wall, forest)
                if (tileType === 'wall') {
                    const wallGeo = new THREE.BoxGeometry(TILE_W, 0.8, TILE_W);
                    const wallMat = new THREE.MeshStandardMaterial({
                        color: new THREE.Color('#5a5a7a'),
                        roughness: 0.7,
                        metalness: 0.2,
                    });
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(col * STEP, 0.49, row * STEP);
                    wall.castShadow = true;
                    scene.add(wall);
                    mesh.userData.wallMesh = wall;
                } else if (tileType === 'forest') {
                    addTree(scene, col * STEP, 0, row * STEP, mesh);
                }
            }
        }

        // Raycaster for click-to-paint
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let isPointerDown = false;

        const onPointerDown = (e) => {
            isPointerDown = true;
            handlePick(e);
        };
        const onPointerMove = (e) => {
            if (isPointerDown) handlePick(e);
        };
        const onPointerUp = () => { isPointerDown = false; };

        const handlePick = (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const meshArray = Object.values(meshesRef.current);
            const hits = raycaster.intersectObjects(meshArray);
            if (hits.length > 0) {
                const { col, row } = hits[0].object.userData;
                if (col !== undefined) stateRef.current.placeTile(col, row);
            }
        };

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);

        // Cloud particles (Three.js)
        const cloudParticles = [];
        const cloudGeo = new THREE.PlaneGeometry(4, 2);
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        for (let i = 0; i < 12; i++) {
            const cloud = new THREE.Mesh(cloudGeo, cloudMat.clone());
            cloud.rotation.x = -Math.PI / 2;
            cloud.position.set(
                Math.random() * gridCols * STEP,
                5 + Math.random() * 3,
                Math.random() * gridRows * STEP
            );
            cloud.userData.speed = 0.005 + Math.random() * 0.01;
            scene.add(cloud);
            cloudParticles.push(cloud);
        }

        // Animate
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);
            const { effects, currentBiome, tiles } = stateRef.current;
            timeRef.current += 0.016;
            const t = timeRef.current;

            // Day/night light
            const dayFactor = effects.dayTime;
            const sunColor = new THREE.Color().lerpColors(
                new THREE.Color(0x1a1a3a),
                new THREE.Color(0xfff4e0),
                dayFactor
            );
            sun.color.copy(sunColor);
            sun.intensity = dayFactor * 2.5;
            ambient.intensity = 0.2 + dayFactor * 0.6;
            scene.background = new THREE.Color().lerpColors(
                new THREE.Color(0x020208),
                new THREE.Color(0x87ceeb),
                dayFactor * dayFactor
            );
            scene.fog.color.copy(scene.background);

            // Lava glow pulse
            if (currentBiome === 'lava') {
                lavaGlow.intensity = 3 + Math.sin(t * 3) * 1.5;
            } else {
                lavaGlow.intensity = 0;
            }

            // Update tile materials if changed
            Object.entries(meshesRef.current).forEach(([key, mesh]) => {
                const tileType = tiles[key] || 'grass';
                const props = TILE_MATERIAL_PROPS[tileType] || TILE_MATERIAL_PROPS.grass;
                const mat = mesh.material;
                // Update color + emissive pulsing for lava
                if (tileType === 'lava') {
                    const pulse = Math.sin(t * 2.5 + mesh.position.x + mesh.position.z) * 0.3 + 0.7;
                    mat.emissiveIntensity = pulse;
                }
                // Water: slight Y bob
                if (tileType === 'water') {
                    mesh.position.y = Math.sin(t * 1.5 + mesh.position.x * 0.5 + mesh.position.z * 0.3) * 0.04;
                }
            });

            // Cloud drift
            const showClouds = effects.clouds || ['plains', 'forest'].includes(currentBiome);
            cloudParticles.forEach((cloud) => {
                cloud.position.x += cloud.userData.speed * effects.cloudSpeed * 2;
                cloud.material.opacity = showClouds ? 0.2 + Math.sin(t * 0.5 + cloud.position.z) * 0.05 : 0;
                if (cloud.position.x > gridCols * STEP + 5) {
                    cloud.position.x = -5;
                    cloud.position.z = Math.random() * gridRows * STEP;
                }
            });

            // Fog
            scene.fog.density = effects.fog ? effects.fogDensity * 0.04 : 0.008;

            renderer.render(scene, camera);
        };
        animate();

        // Resize
        const handleResize = () => {
            if (!mountRef.current) return;
            const W2 = mountRef.current.clientWidth;
            const H2 = mountRef.current.clientHeight;
            camera.aspect = W2 / H2;
            camera.updateProjectionMatrix();
            renderer.setSize(W2, H2);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(frameRef.current);
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            renderer.domElement.removeEventListener('pointermove', onPointerMove);
            renderer.domElement.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync tile changes to Three.js materials
    useEffect(() => {
        Object.entries(meshesRef.current).forEach(([key, mesh]) => {
            const tileType = tiles[key] || 'grass';
            const props = TILE_MATERIAL_PROPS[tileType] || TILE_MATERIAL_PROPS.grass;
            mesh.material.color.set(props.color);
            mesh.material.roughness = props.roughness;
            mesh.material.metalness = props.metalness;
            mesh.material.emissive.set(props.emissive || '#000000');
            mesh.material.emissiveIntensity = props.emissiveIntensity || 0;
            mesh.material.needsUpdate = true;
        });
    }, [tiles]);

    return (
        <div
            ref={mountRef}
            style={{
                width: '100%',
                height: '100%',
                minHeight: 520,
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 0 40px rgba(200,168,75,0.3)',
                cursor: 'crosshair',
            }}
        />
    );
}

function addTree(scene, x, y, z, parentMesh) {
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3320, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, y + 0.34, z);
    trunk.castShadow = true;
    scene.add(trunk);
    parentMesh.userData.treeTrunk = trunk;

    const coneGeo = new THREE.ConeGeometry(0.35, 0.7, 7);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x1e5c2a, roughness: 0.85 });
    const cone1 = new THREE.Mesh(coneGeo, coneMat);
    cone1.position.set(x, y + 0.84, z);
    cone1.castShadow = true;
    scene.add(cone1);

    const cone2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.55, 7),
        new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.8 })
    );
    cone2.position.set(x, y + 1.12, z);
    cone2.castShadow = true;
    scene.add(cone2);
}
