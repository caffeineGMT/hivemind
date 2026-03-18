import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import App from './App';

export default function Router() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Home />} />

      {/* Dashboard routes - nested under /dashboard */}
      <Route path="/dashboard/*" element={<App />} />

      {/* Legacy app route - redirect to dashboard */}
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
