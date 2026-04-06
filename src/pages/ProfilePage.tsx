import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../firebase/auth';
import { getProfile, setUsername } from '../firestore/profile';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [username, setValue] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid)
      .then((p) => setValue(p?.username ?? user.displayName ?? ''))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoaded(true));
  }, [user]);

  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setUsername(user.uid, username);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2>Profile</h2>
      <p className="muted">
        This name is shown on builds you publish so others can see who made them.
      </p>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="muted">Display username</span>
        <input
          value={username}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          placeholder="e.g. Kaeus"
          disabled={!loaded || saving}
        />
      </label>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save} disabled={!loaded || saving || !username.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="muted">Saved.</span>}
        {error && <span className="error">{error}</span>}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        Signed in as {user.email}
      </div>
    </div>
  );
}
