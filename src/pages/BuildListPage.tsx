import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCdnData } from '../cdn/queries';
import { buildSkillIndex, combatSkillNames } from '../domain/skills';
import { searchBuilds, listUserBuilds } from '../firestore/builds';
import { useAuth } from '../firebase/auth';

export default function BuildListPage() {
  const { user } = useAuth();
  const cdn = useCdnData();
  const { skillNames } = useMemo(
    () => cdn.data
      ? buildSkillIndex(cdn.data.abilities, combatSkillNames(cdn.data.skills))
      : { skillNames: [] as string[], chainsBySkill: new Map() },
    [cdn.data],
  );
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');

  const search = useQuery({
    queryKey: ['search', s1, s2],
    queryFn: () => searchBuilds([s1, s2].filter(Boolean)),
    enabled: !!s1,
  });

  const mine = useQuery({
    queryKey: ['mine', user?.uid],
    queryFn: () => listUserBuilds(user!.uid),
    enabled: !!user,
  });

  return (
    <div>
      <h2>Search builds</h2>
      <div className="row">
        <select value={s1} onChange={(e) => setS1(e.target.value)}>
          <option value="">Primary skill…</option>
          {skillNames.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={s2} onChange={(e) => setS2(e.target.value)}>
          <option value="">(Optional) second skill…</option>
          {skillNames.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <ul>
        {(search.data ?? []).map((b) => (
          <li key={b.id}>
            <Link to={`/builds/${b.id}`}>{b.name}</Link>{' '}
            <span className="muted">
              — {b.primarySkill} / {b.auxSkill}
              {b.ownerUsername && <> · by {b.ownerUsername}</>}
            </span>
          </li>
        ))}
      </ul>

      {user && (
        <>
          <h2>My builds</h2>
          {mine.isLoading && <div className="muted">Loading…</div>}
          {mine.isError && (
            <div className="error">
              Failed to load: {(mine.error as Error).message}
              <div className="muted" style={{ fontSize: 11 }}>
                If this is a "missing index" error, open the link from the browser console
                to auto-create the Firestore index.
              </div>
            </div>
          )}
          {mine.data && mine.data.length === 0 && <div className="muted">No saved builds yet.</div>}
          <ul>
            {(mine.data ?? []).map((b) => (
              <li key={b.id}>
                <Link to={`/builds/${b.id}/edit`}>{b.name}</Link>{' '}
                <span className="muted">— {b.primarySkill} / {b.auxSkill}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
