import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import ProfilePage from './pages/ProfilePage';
import MembersPage from './pages/MembersPage';
import Topbar from './components/Topbar';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={32} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Topbar />
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/w/:workspaceId"
        element={
          <ProtectedRoute>
            <Topbar />
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/b/:boardId"
        element={
          <ProtectedRoute>
            <Topbar />
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/w/:workspaceId/members"
        element={
          <ProtectedRoute>
            <Topbar />
            <MembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Topbar />
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
