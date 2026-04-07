import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useCdnData } from '../cdn/queries';
import { buildSkillIndex, combatSkillNames } from '../domain/skills';
import { searchBuilds, listUserBuilds, PAGE_SIZE } from '../firestore/builds';
import { useAuth } from '../firebase/auth';

type Cursor = QueryDocumentSnapshot<DocumentData> | null;

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

  // Cursor stack: index 0 = first page (null cursor), each subsequent entry is the cursor
  // returned from the previous page. `pageIdx` indexes into the stack.
  const [cursorStack, setCursorStack] = useState<Cursor[]>([null]);
  const [pageIdx, setPageIdx] = useState(0);

  // Reset pagination whenever the filters change.
  useEffect(() => {
    setCursorStack([null]);
    setPageIdx(0);
  }, [s1, s2]);

  const skills = [s1, s2].filter(Boolean);
  const after = cursorStack[pageIdx] ?? null;

  const search = useQuery({
    queryKey: ['search', skills, pageIdx],
    queryFn: () => searchBuilds({ skills, after }),
  });

  const mine = useQuery({
    queryKey: ['mine', user?.uid],
    queryFn: () => listUserBuilds(user!.uid),
    enabled: !!user,
  });

  const hasNext = !!search.data?.nextCursor;
  const hasPrev = pageIdx > 0;
  const onNext = () => {
    if (!search.data?.nextCursor) return;
    const nextCursor = search.data.nextCursor;
    // Append cursor to the stack if we're at the end; otherwise just advance.
    setCursorStack((s) => {
      if (pageIdx + 1 >= s.length) return [...s, nextCursor];
      return s;
    });
    setPageIdx((i) => i + 1);
  };
  const onPrev = () => {
    if (pageIdx === 0) return;
    setPageIdx((i) => i - 1);
  };

  const heading = skills.length === 0 ? 'Recent public builds' : 'Search results';

  return (
    <div>
      <h2>{heading}</h2>
      <div className="row">
        <select value={s1} onChange={(e) => setS1(e.target.value)}>
          <option value="">Any primary skill…</option>
          {skillNames.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={s2} onChange={(e) => setS2(e.target.value)}>
          <option value="">(Optional) second skill…</option>
          {skillNames.map((s) => <option key={s}>{s}</option>)}
        </select>
        {(s1 || s2) && (
          <button onClick={() => { setS1(''); setS2(''); }}>Clear filters</button>
        )}
      </div>

      {search.isLoading && <div className="muted">Loading…</div>}
      {search.isError && (
        <div className="error">
          Failed to load: {(search.error as Error).message}
          <div className="muted" style={{ fontSize: 11 }}>
            If this is a "missing index" error, the Firebase console URL in your browser
            console will create the required composite index in one click.
          </div>
        </div>
      )}

      <ul>
        {(search.data?.builds ?? []).map((b) => (
          <li key={b.id}>
            <Link to={`/builds/${b.id}`}>{b.name}</Link>{' '}
            <span className="muted">
              — {b.primarySkill} / {b.auxSkill}
              {b.ownerUsername && <> · by {b.ownerUsername}</>}
            </span>
          </li>
        ))}
      </ul>

      {(hasPrev || hasNext) && (
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <button onClick={onPrev} disabled={!hasPrev}>‹ Prev</button>
          <span className="muted" style={{ fontSize: 12 }}>Page {pageIdx + 1}</span>
          <button onClick={onNext} disabled={!hasNext}>Next ›</button>
          <span className="muted" style={{ fontSize: 11 }}>{PAGE_SIZE} per page</span>
        </div>
      )}

      {search.data && search.data.builds.length === 0 && !search.isLoading && (
        <div className="muted">No matching public builds.</div>
      )}

      {user && (
        <>
          <h2>My builds</h2>
          {mine.isLoading && <div className="muted">Loading…</div>}
          {mine.isError && (
            <div className="error">
              Failed to load: {(mine.error as Error).message}
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
