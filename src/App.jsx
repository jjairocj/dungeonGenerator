import { lazy, Suspense } from 'react';
import { useBoardStore } from './store/boardStore';
import DMPanel from './components/DMPanel';

const PixiBoard = lazy(() => import('./renderers/PixiBoard'));
const ThreeBoard = lazy(() => import('./renderers/ThreeBoard'));

function LoadingBoard() {
  return (
    <div className="board-loading">
      <div className="board-loading__spinner" />
      <p>Loading renderer...</p>
    </div>
  );
}

export default function App() {
  const rendererMode = useBoardStore((s) => s.rendererMode);

  return (
    <div className="app-root">
      {/* DM Panel (left side) */}
      <DMPanel />

      {/* Game Board (right side / TV display) */}
      <main className="board-area">
        <div className="board-area__header">
          <span className="board-area__mode-badge">
            {rendererMode === '2d' ? '⬜ PixiJS 2D' : '🎲 Three.js 3D'}
          </span>
          <span className="board-area__hint">Click &amp; drag to paint tiles</span>
        </div>
        <div className="board-area__canvas-wrap">
          <Suspense fallback={<LoadingBoard />}>
            {rendererMode === '2d' ? <PixiBoard /> : <ThreeBoard />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
