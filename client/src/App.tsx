import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './padlet/pages/HomePage';
import BoardPage from './padlet/pages/BoardPage';
import LoginPage from './padlet/pages/LoginPage';
import StatsPage from './padlet/pages/StatsPage';
import MentiHomePage from './menti/pages/MentiHomePage';
import MentiEditorPage from './menti/pages/MentiEditorPage';
import MentiPresentPage from './menti/pages/MentiPresentPage';
import MentiJoinPage from './menti/pages/MentiJoinPage';
import MentiRespondPage from './menti/pages/MentiRespondPage';
import Navbar from './padlet/components/Navbar';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {isAuthenticated && <Navbar />}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/board/:id" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />

          <Route path="/menti" element={<ProtectedRoute><MentiHomePage /></ProtectedRoute>} />
          <Route path="/menti/:id/edit" element={<ProtectedRoute><MentiEditorPage /></ProtectedRoute>} />
          <Route path="/menti/:id/present" element={<ProtectedRoute><MentiPresentPage /></ProtectedRoute>} />

          <Route path="/menti/join" element={<MentiJoinPage />} />
          <Route path="/menti/respond/:sessionId" element={<MentiRespondPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
