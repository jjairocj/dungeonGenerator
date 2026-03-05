import { useState } from 'react';
import { useBoardStore, BIOMES, TILE_TYPES, PAINT_MODES, MIN_COLS, MAX_COLS, MIN_ROWS, MAX_ROWS } from '../store/boardStore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import '../styles/dmPanel.css';

export default function DMPanel() {
    // Renderer & Grid Type
    const rendererMode = useBoardStore((s) => s.rendererMode);
    const setRendererMode = useBoardStore((s) => s.setRendererMode);
    const gridType = useBoardStore((s) => s.gridType);
    const setGridType = useBoardStore((s) => s.setGridType);

    const selectedTile = useBoardStore((s) => s.selectedTile);
    const setSelectedTile = useBoardStore((s) => s.setSelectedTile);
    const effects = useBoardStore((s) => s.effects);
    const setEffect = useBoardStore((s) => s.setEffect);
    const currentBiome = useBoardStore((s) => s.currentBiome);
    const fillBiome = useBoardStore((s) => s.fillBiome);
    const audio = useBoardStore((s) => s.audio);
    const setAudio = useBoardStore((s) => s.setAudio);

    // G-01: Grid size
    const gridCols = useBoardStore((s) => s.gridCols);
    const gridRows = useBoardStore((s) => s.gridRows);
    const setGridSize = useBoardStore((s) => s.setGridSize);

    // G-09, G-11: Layers and Levels
    const levels = useBoardStore((s) => s.levels);
    const activeLevelIndex = useBoardStore((s) => s.activeLevelIndex);
    const activeLayerIndex = useBoardStore((s) => s.activeLayerIndex);
    const setActiveLevel = useBoardStore((s) => s.setActiveLevel);
    const setActiveLayer = useBoardStore((s) => s.setActiveLayer);
    const toggleLayerVisibility = useBoardStore((s) => s.toggleLayerVisibility);
    const toggleLayerLock = useBoardStore((s) => s.toggleLayerLock);
    const addLevel = useBoardStore((s) => s.addLevel);
    const addLayer = useBoardStore((s) => s.addLayer);

    // G-02: Grid overlay toggle
    const showGrid = useBoardStore((s) => s.showGrid);
    const setShowGrid = useBoardStore((s) => s.setShowGrid);

    // G-04/G-06: Paint mode
    const paintMode = useBoardStore((s) => s.paintMode);
    const setPaintMode = useBoardStore((s) => s.setPaintMode);

    // G-07: Undo / Redo
    const undo = useBoardStore((s) => s.undo);
    const redo = useBoardStore((s) => s.redo);
    const history = useBoardStore((s) => s.history);
    const future = useBoardStore((s) => s.future);

    // G-12: Stamps & Clipboard
    const clipboard = useBoardStore((s) => s.clipboard);
    const stamps = useBoardStore((s) => s.stamps);
    const saveStamp = useBoardStore((s) => s.saveStamp);
    const deleteStamp = useBoardStore((s) => s.deleteStamp);
    const loadStampToClipboard = useBoardStore((s) => s.loadStampToClipboard);

    const [activeSection, setActiveSection] = useState('tiles');
    const [sizeInput, setSizeInput] = useState({ cols: gridCols, rows: gridRows });
    const { t } = useTranslation();

    const tabs = [
        { id: 'tiles', label: t('dmPanel.tabs.tiles') },
        { id: 'stamps', label: t('dmPanel.tabs.stamps', '📥 Sellos') },
        { id: 'biomes', label: t('dmPanel.tabs.biomes') },
        { id: 'layers', label: t('dmPanel.tabs.layers', 'Capas') },
        { id: 'effects', label: t('dmPanel.tabs.effects') },
        { id: 'audio', label: t('dmPanel.tabs.audio') },
    ];

    const dayTimeLabel = () => {
        const v = effects.dayTime;
        if (v < 0.2) return t('dmPanel.effects.night');
        if (v < 0.5) return t('dmPanel.effects.dawn');
        if (v < 0.8) return t('dmPanel.effects.day');
        return t('dmPanel.effects.dusk');
    };

    const applyGridSize = () => {
        const c = parseInt(sizeInput.cols, 10);
        const r = parseInt(sizeInput.rows, 10);
        if (!isNaN(c) && !isNaN(r) && c >= MIN_COLS && r >= MIN_ROWS) {
            setGridSize(c, r);
        } else {
            // Revert if invalid
            setSizeInput({ cols: gridCols, rows: gridRows });
        }
    };

    const paintModes = [
        { id: PAINT_MODES.BRUSH, icon: '🖌️', label: t('dmPanel.tools.brush') },
        { id: PAINT_MODES.ERASER, icon: '🗑️', label: t('dmPanel.tools.eraser') },
        { id: PAINT_MODES.FILL, icon: '🪣', label: t('dmPanel.tools.fill') },
        { id: PAINT_MODES.RECTANGLE, icon: '◫', label: t('dmPanel.tools.rectangle', 'Rectangle') },
        { id: PAINT_MODES.ELLIPSE, icon: '⬬', label: t('dmPanel.tools.ellipse', 'Ellipse') },
        { id: PAINT_MODES.SELECT, icon: '⬚', label: t('dmPanel.tools.select', 'Select') },
    ];

    return (
        <aside className="dm-panel">
            {/* Header */}
            <div className="dm-panel__header">
                <div className="dm-panel__logo">
                    <span className="dm-panel__logo-icon">⚔️</span>
                    <div>
                        <h1 className="dm-panel__title">{t('dmPanel.title')}</h1>
                        <p className="dm-panel__subtitle">{t('dmPanel.subtitle')}</p>
                    </div>
                </div>

                {/* Renderer Toggle */}
                <div className="renderer-toggle" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                        className={`renderer-btn ${rendererMode === '2d' ? 'active' : ''}`}
                        onClick={() => setRendererMode('2d')}
                    >
                        <span>⬜</span> 2D PixiJS
                    </button>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            className={`tool-btn ${gridType === 'square' ? 'active' : ''}`}
                            onClick={() => setGridType('square')}
                            title="Square Grid"
                            style={{ flex: 1, padding: '2px', fontSize: '1rem' }}
                        >
                            🟩
                        </button>
                        <button
                            className={`tool-btn ${gridType === 'hex' ? 'active' : ''}`}
                            onClick={() => setGridType('hex')}
                            title="Hexagonal Grid"
                            style={{ flex: 1, padding: '2px', fontSize: '1rem' }}
                        >
                            ⬡
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Toolbar: Paint mode + Undo/Redo + Grid toggle ── */}
            <div className="dm-toolbar">
                {/* Paint modes (G-04/G-06) */}
                <div className="dm-toolbar__group">
                    {paintModes.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            id={`paint-mode-${id}`}
                            className={`tool-btn ${paintMode === id ? 'active' : ''}`}
                            onClick={() => setPaintMode(id)}
                            title={label}
                        >
                            {icon}
                        </button>
                    ))}
                </div>

                {/* Undo / Redo (G-07) */}
                <div className="dm-toolbar__group">
                    <button
                        id="btn-undo"
                        className="tool-btn"
                        onClick={undo}
                        disabled={history.length === 0}
                        title={t('dmPanel.tools.undo') + ' (Ctrl+Z)'}
                    >
                        ↩️
                    </button>
                    <button
                        id="btn-redo"
                        className="tool-btn"
                        onClick={redo}
                        disabled={future.length === 0}
                        title={t('dmPanel.tools.redo') + ' (Ctrl+Y)'}
                    >
                        ↪️
                    </button>
                </div>

                {/* Grid overlay toggle (G-02) */}
                <div className="dm-toolbar__group">
                    <button
                        id="btn-toggle-grid"
                        className={`tool-btn ${showGrid ? 'active' : ''}`}
                        onClick={() => setShowGrid(!showGrid)}
                        title={t('dmPanel.tools.toggleGrid')}
                    >
                        ⊞
                    </button>
                </div>
            </div>

            {/* ── Grid Size (G-01) ── */}
            <div className="dm-grid-size">
                <span className="dm-grid-size__label">⊞ {gridCols}×{gridRows}</span>
                <div className="dm-grid-size__inputs">
                    <input
                        id="grid-cols-input"
                        type="number"
                        min={MIN_COLS} max={MAX_COLS}
                        value={sizeInput.cols}
                        onChange={(e) => setSizeInput(s => ({ ...s, cols: e.target.value }))}
                        className="size-input"
                        title="Columns"
                    />
                    <span>×</span>
                    <input
                        id="grid-rows-input"
                        type="number"
                        min={MIN_ROWS} max={MAX_ROWS}
                        value={sizeInput.rows}
                        onChange={(e) => setSizeInput(s => ({ ...s, rows: e.target.value }))}
                        className="size-input"
                        title="Rows"
                    />
                    <button
                        id="btn-apply-grid-size"
                        className="apply-btn"
                        onClick={applyGridSize}
                        title={t('dmPanel.tools.applyGridSize')}
                    >
                        ✓
                    </button>
                </div>
            </div>

            {/* Nav tabs */}
            <nav className="dm-panel__nav">
                {tabs.map(({ id, label }) => (
                    <button
                        key={id}
                        className={`dm-nav-btn ${activeSection === id ? 'active' : ''}`}
                        onClick={() => setActiveSection(id)}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {/* Sections */}
            <div className="dm-panel__content">

                {/* --- TILE PALETTE --- */}
                {activeSection === 'tiles' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">{t('dmPanel.tiles.title')}</h2>
                        <p className="dm-section__hint">{t('dmPanel.tiles.hint')}</p>
                        <div className="tile-grid">
                            {TILE_TYPES.map((tile) => (
                                <button
                                    key={tile.id}
                                    className={`tile-btn ${selectedTile === tile.id ? 'active' : ''}`}
                                    onClick={() => setSelectedTile(tile.id)}
                                    style={{ '--tile-color': tile.color }}
                                    title={t(`tiles.${tile.id}`)}
                                >
                                    <span className="tile-btn__icon">{tile.icon}</span>
                                    <span className="tile-btn__label">{t(`tiles.${tile.id}`)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- BIOMES --- */}
                {activeSection === 'biomes' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">{t('dmPanel.biomes.title')}</h2>
                        <p className="dm-section__hint">{t('dmPanel.biomes.hint')}</p>
                        <div className="biome-grid">
                            {Object.entries(BIOMES).map(([id, biome]) => (
                                <button
                                    key={id}
                                    className={`biome-btn ${currentBiome === id ? 'active' : ''}`}
                                    style={{ '--biome-color': biome.color }}
                                    onClick={() => fillBiome(id)}
                                >
                                    <span className="biome-btn__icon">{biome.icon}</span>
                                    <span className="biome-btn__label">{t(`biomes.${id}`)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- STAMPS (G-12) --- */}
                {activeSection === 'stamps' && (
                    <section className="dm-section dm-stamps">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h2 className="dm-section__title" style={{ margin: 0 }}>{t('dmPanel.stamps.title')}</h2>
                            <button
                                className="dm-nav-btn"
                                onClick={() => saveStamp()}
                                disabled={!clipboard || clipboard.length === 0}
                                title={t('dmPanel.stamps.saveCurrent')}
                                style={{ padding: '4px 8px' }}
                            >
                                {t('dmPanel.stamps.saveCurrent')}
                            </button>
                        </div>

                        {stamps.length === 0 ? (
                            <p className="dm-section__hint">{t('dmPanel.stamps.empty')}</p>
                        ) : (
                            <>
                                <p className="dm-section__hint">{t('dmPanel.stamps.selectHint')}</p>
                                <div className="levels-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {stamps.map((stamp) => (
                                        <div key={stamp.id} className="level-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', cursor: 'pointer' }} onClick={() => loadStampToClipboard(stamp.id)}>
                                            <span style={{ fontWeight: '500' }}>{stamp.name} ({stamp.tiles.length} tiles)</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteStamp(stamp.id); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                )}

                {/* --- LAYERS (G-09, G-11) --- */}
                {activeSection === 'layers' && (
                    <section className="dm-section dm-layers">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h2 className="dm-section__title" style={{ margin: 0 }}>{t('dmPanel.layers.title')}</h2>
                            <button className="dm-nav-btn" onClick={addLevel} title={t('dmPanel.layers.addLevel')} style={{ padding: '4px 8px' }}>➕ {t('dmPanel.layers.addLevel')}</button>
                        </div>

                        <div className="levels-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {levels.map((level, lIdx) => (
                                <div key={level.id} className={`level-card ${activeLevelIndex === lIdx ? 'active' : ''}`} style={{ border: '1px solid #334', borderRadius: 6, overflow: 'hidden' }}>
                                    <div
                                        className="level-header"
                                        onClick={() => setActiveLevel(lIdx)}
                                        style={{ padding: '8px 12px', background: activeLevelIndex === lIdx ? '#2a2a3a' : '#1a1a24', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                                    >
                                        <strong>{level.name}</strong>
                                    </div>
                                    {activeLevelIndex === lIdx && (
                                        <div className="layers-list" style={{ padding: '8px', background: '#14141d' }}>
                                            {level.layers.map((layer, lyIdx) => (
                                                <div
                                                    key={layer.id}
                                                    className={`layer-item ${activeLayerIndex === lyIdx ? 'active' : ''}`}
                                                    onClick={() => setActiveLayer(lyIdx)}
                                                    style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '6px 10px',
                                                        marginBottom: 4,
                                                        background: activeLayerIndex === lyIdx ? 'rgba(52, 152, 219, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                        border: activeLayerIndex === lyIdx ? '1px solid rgba(52, 152, 219, 0.5)' : '1px solid transparent',
                                                        borderRadius: 4,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span className="layer-name" style={{ fontSize: '0.9rem', color: layer.visible ? '#fff' : '#666' }}>
                                                        {layer.name}
                                                    </span>
                                                    <div className="layer-actions" style={{ display: 'flex', gap: 6 }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(lIdx, lyIdx); }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: layer.visible ? 1 : 0.3 }}
                                                            title={t('dmPanel.layers.visibility')}
                                                        >
                                                            {layer.visible ? '👁️' : '🚫'}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleLayerLock(lIdx, lyIdx); }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: layer.locked ? 1 : 0.3 }}
                                                            title={t('dmPanel.layers.lock')}
                                                        >
                                                            {layer.locked ? '🔒' : '🔓'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                className="dm-nav-btn"
                                                onClick={() => addLayer(lIdx)}
                                                style={{ width: '100%', marginTop: 8, padding: '4px', fontSize: '0.85rem' }}
                                            >
                                                ➕ {t('dmPanel.layers.addLayer')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- EFFECTS --- */}
                {activeSection === 'effects' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">{t('dmPanel.effects.title')}</h2>

                        {[
                            { key: 'clouds', label: t('dmPanel.effects.clouds') },
                            { key: 'wind', label: t('dmPanel.effects.wind') },
                            { key: 'rain', label: t('dmPanel.effects.rain') },
                            { key: 'fog', label: t('dmPanel.effects.fog') },
                        ].map(({ key, label }) => (
                            <div key={key} className="effect-row">
                                <label className="effect-row__label">
                                    <span>{label}</span>
                                    <input
                                        type="checkbox"
                                        className="toggle"
                                        checked={effects[key]}
                                        onChange={(e) => setEffect(key, e.target.checked)}
                                    />
                                </label>
                            </div>
                        ))}

                        {[
                            { key: 'windIntensity', label: t('dmPanel.effects.windIntensity'), min: 0, max: 1, step: 0.05 },
                            { key: 'cloudSpeed', label: t('dmPanel.effects.cloudSpeed'), min: 0.05, max: 1, step: 0.05 },
                            { key: 'fogDensity', label: t('dmPanel.effects.fogDensity'), min: 0, max: 1, step: 0.05 },
                            { key: 'rainIntensity', label: t('dmPanel.effects.rainIntensity'), min: 0, max: 1, step: 0.05 },
                        ].map(({ key, label, min, max, step }) => (
                            <div key={key} className="slider-group">
                                <label className="slider-label">
                                    <span>{label}</span>
                                    <span className="slider-value">{Math.round(effects[key] * 100)}%</span>
                                </label>
                                <input
                                    type="range" min={min} max={max} step={step}
                                    value={effects[key]}
                                    className="slider"
                                    onChange={(e) => setEffect(key, parseFloat(e.target.value))}
                                />
                            </div>
                        ))}

                        <div className="slider-group">
                            <label className="slider-label">
                                <span>{t('dmPanel.effects.timeOfDay')}</span>
                                <span className="slider-value">{dayTimeLabel()}</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={effects.dayTime}
                                className="slider"
                                onChange={(e) => setEffect('dayTime', parseFloat(e.target.value))}
                            />
                        </div>
                    </section>
                )}

                {/* --- AUDIO --- */}
                {activeSection === 'audio' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">{t('dmPanel.audio.title')}</h2>
                        <p className="dm-section__hint">{t('dmPanel.audio.hint')}</p>

                        <div className="effect-row">
                            <label className="effect-row__label">
                                <span>{t('dmPanel.audio.enable')}</span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={audio.enabled}
                                    onChange={(e) => setAudio('enabled', e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="slider-group" style={{ marginTop: 16 }}>
                            <label className="slider-label">
                                <span>{t('dmPanel.audio.volume')}</span>
                                <span className="slider-value">{Math.round(audio.volume * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={audio.volume}
                                className="slider"
                                onChange={(e) => setAudio('volume', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="audio-status">
                            <div className="audio-status__indicator" style={{ background: audio.enabled ? '#4ecca3' : '#555' }} />
                            <span>
                                {audio.enabled
                                    ? t('dmPanel.audio.playing', { biome: t(`biomes.${currentBiome}`) })
                                    : t('dmPanel.audio.disabled')}
                            </span>
                        </div>
                    </section>
                )}
            </div>

            {/* Status bar */}
            <div className="dm-panel__footer">
                <span className="status-dot" />
                <span>
                    {paintMode === PAINT_MODES.ERASER ? '🗑️' : paintMode === PAINT_MODES.FILL ? '🪣' : '🖌️'}&nbsp;
                    {t('dmPanel.status.biome')}: <strong>{t(`biomes.${currentBiome}`)}</strong>&nbsp;·&nbsp;
                    {t('dmPanel.status.tile')}: <strong>{t(`tiles.${selectedTile}`)}</strong>&nbsp;·&nbsp;
                    ⊞ {gridCols}×{gridRows}
                </span>
                <LanguageSwitcher className="ml-auto" />
            </div>
        </aside>
    );
}
