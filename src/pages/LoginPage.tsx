import { Navigate } from 'react-router-dom';
import { useAuth } from '../firebase/auth';

export default function LoginPage() {
  const { user, loading, signInGoogle } = useAuth();
  if (loading) return <div>Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="card" style={{ maxWidth: 360 }}>
      <h2>Sign in</h2>
      <p className="muted">Sign in to create, save, and share builds.</p>
      <button onClick={signInGoogle}>Sign in with Google</button>
    </div>
  );
}
