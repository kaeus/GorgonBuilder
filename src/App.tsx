import { Link, Route, Routes, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './firebase/auth';
import { useCdnData } from './cdn/queries';
import { getProfile } from './firestore/profile';
import LoginPage from './pages/LoginPage';
import BuildListPage from './pages/BuildListPage';
import BuildEditorPage from './pages/BuildEditorPage';
import BuildViewPage from './pages/BuildViewPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const cdn = useCdnData();
  const profile = useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: () => getProfile(user!.uid),
    enabled: !!user,
  });
  const displayName = profile.data?.username || user?.displayName || 'Profile';

  return (
    <div className="app">
      <header className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Gorgon Builder</Link>
        </h1>
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="muted">
            {cdn.isLoading ? 'Loading CDN…' :
             cdn.isError ? <span className="error">CDN error</span> :
             `CDN ${cdn.data?.version} · ${Object.keys(cdn.data?.abilities ?? {}).length} abilities · ${Object.keys(cdn.data?.modifiers ?? {}).length} mods`}
          </span>
          {user ? (
            <>
              <Link to="/builds/new">New build</Link>
              <Link to="/profile" className="muted">{displayName}</Link>
              <button onClick={signOut}>Sign out</button>
            </>
          ) : !loading ? (
            <Link to="/login">Sign in</Link>
          ) : null}
        </div>
      </header>
      <hr style={{ borderColor: '#2a2f38' }} />
      <Routes>
        <Route path="/" element={<BuildListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
        <Route path="/builds/new" element={user ? <BuildEditorPage /> : <Navigate to="/login" replace />} />
        <Route path="/builds/:id" element={<BuildViewPage />} />
        <Route path="/builds/:id/edit" element={user ? <BuildEditorPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
