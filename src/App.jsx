import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';

const PixiBoard = lazy(() => import('./renderers/PixiBoard'));

function BoardLoading() {
  return (
    <div className="board-loading">
      <div className="board-loading__spinner" />
      <p>Loading board...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:mapId?"
          element={
            <ProtectedRoute>
              <EditorPage PixiBoard={PixiBoard} BoardLoading={BoardLoading} />
            </ProtectedRoute>
          }
        />
        {/* Guest mode: editor without auth */}
        <Route
          path="/editor-guest"
          element={
            <EditorPage PixiBoard={PixiBoard} BoardLoading={BoardLoading} />
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
