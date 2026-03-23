import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { ForceChangePassword } from './pages/ForceChangePassword';
import { Publications } from './pages/Publications';
import { PublicationDetail } from './pages/PublicationDetail';
import { Loading } from './components/common/Loading';

function PrivateRoute({
  children,
  allowPasswordChangeRequired = false,
}: {
  children: React.ReactNode;
  allowPasswordChangeRequired?: boolean;
}) {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && !allowPasswordChangeRequired) {
    return <Navigate to="/force-change-password" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    if (mustChangePassword) {
      return <Navigate to="/force-change-password" replace />;
    }

    return <Navigate to="/publications" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Home />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/force-change-password"
          element={
            <PrivateRoute allowPasswordChangeRequired>
              <ForceChangePassword />
            </PrivateRoute>
          }
        />
        <Route
          path="/publications"
          element={
            <PrivateRoute>
              <Layout>
                <Publications />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/publications/:id"
          element={
            <PrivateRoute>
              <Layout>
                <PublicationDetail />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
