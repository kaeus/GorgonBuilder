import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCdnData } from '../cdn/queries';
import { useAuth } from '../firebase/auth';
import { useBuildStore } from '../store/buildStore';
import { buildSkillIndex, combatSkillNames } from '../domain/skills';
import { buildAbilityModIndex } from '../domain/abilityModIndex';
import { SkillPicker } from '../components/SkillPicker';
import { MaxLevelInput } from '../components/MaxLevelInput';
import { AbilityBar } from '../components/AbilityBar';
import { EquipmentGrid } from '../components/EquipmentGrid';
import { createBuild, fetchBuild, updateBuild, deleteBuild } from '../firestore/builds';
import { getProfile } from '../firestore/profile';
import { newBuild, equippedPowerIdCounts } from '../domain/build';
import { fetchGorgonExplorerBuild, convertGEBuild, extractBuildId } from '../import/gorgonexplorer';

export default function BuildEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const cdn = useCdnData();
  const { build, set, setPrimaryAbility, setAuxAbility, setMod, setSlotSide, setSlotItem, reset } = useBuildStore();
  const qc = useQueryClient();
  const [importInput, setImportInput] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // Load existing build.
  const existing = useQuery({
    queryKey: ['build', id],
    queryFn: () => fetchBuild(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (existing.data) reset(existing.data);
    else if (!id) reset(newBuild(user?.uid));
  }, [existing.data, id, user?.uid, reset]);

  const { chainsBySkill, skillNames } = useMemo(
    () => cdn.data
      ? buildSkillIndex(cdn.data.abilities, combatSkillNames(cdn.data.skills))
      : { chainsBySkill: new Map(), skillNames: [] as string[] },
    [cdn.data],
  );
  const abilityModIndex = useMemo(
    () => cdn.data ? buildAbilityModIndex(cdn.data.modifiers, cdn.data.abilities) : new Map<string, string[]>(),
    [cdn.data],
  );
  const equipped = useMemo(() => equippedPowerIdCounts(build), [build.equipment]);

  if (cdn.isLoading) return <div>Loading CDN data…</div>;
  if (cdn.isError || !cdn.data) return <div className="error">Failed to load CDN data.</div>;

  const { modifiers, attributes } = cdn.data;
  const primaryChains = chainsBySkill.get(build.primarySkill) ?? [];
  const auxChains = chainsBySkill.get(build.auxSkill) ?? [];

  async function save() {
    if (!user) return;
    try {
      const profile = await getProfile(user.uid);
      const withOwner = { ...build, ownerUsername: profile?.username ?? user.displayName ?? '' };
      if (id) {
        await updateBuild(id, withOwner);
      } else {
        const newId = await createBuild(user.uid, withOwner);
        nav(`/builds/${newId}/edit`, { replace: true });
      }
      qc.invalidateQueries({ queryKey: ['mine'] });
      qc.invalidateQueries({ queryKey: ['search'] });
      qc.invalidateQueries({ queryKey: ['build'] });
    } catch (e) {
      console.error('save failed', e);
      alert('Save failed — see console. ' + (e as Error).message);
    }
  }

  async function importFromGE() {
    if (!cdn.data || !importInput.trim()) return;
    if (extractBuildId(importInput) == null) {
      alert('Enter a gorgonexplorer.com/build-planner/<id> URL or numeric id.');
      return;
    }
    setImportBusy(true);
    setImportWarnings([]);
    try {
      const env = await fetchGorgonExplorerBuild(importInput);
      const { build: imported, warnings } = convertGEBuild(env, cdn.data, user?.uid);
      // Preserve the doc id and flags; replace everything else.
      reset({ ...imported, id: build.id, ownerUid: build.ownerUid, isPublic: build.isPublic });
      setImportWarnings(warnings);
    } catch (e) {
      console.error('import failed', e);
      alert('Import failed — see console. ' + (e as Error).message);
    } finally {
      setImportBusy(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!confirm('Delete this build?')) return;
    try {
      await deleteBuild(id);
      qc.invalidateQueries({ queryKey: ['mine'] });
      nav('/', { replace: true });
    } catch (e) {
      console.error('delete failed', e);
      alert('Delete failed — see console. ' + (e as Error).message);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <span className="muted">Import from gorgonexplorer.com</span>
            <input
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="https://gorgonexplorer.com/build-planner/1234"
              disabled={importBusy}
            />
          </label>
          <button onClick={importFromGE} disabled={importBusy || !importInput.trim()}>
            {importBusy ? 'Importing…' : 'Import'}
          </button>
        </div>
        {importWarnings.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary className="muted" style={{ cursor: 'pointer' }}>
              {importWarnings.length} import warning{importWarnings.length === 1 ? '' : 's'} — click to expand
            </summary>
            <ul className="muted" style={{ fontSize: 11, margin: '4px 0 0 16px' }}>
              {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </details>
        )}
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span className="muted">Name</span>
          <input value={build.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <SkillPicker
          label="Primary skill"
          value={build.primarySkill}
          skills={skillNames}
          onChange={(v) => set({ primarySkill: v })}
          disabledValue={build.auxSkill}
        />
        <SkillPicker
          label="Auxiliary skill"
          value={build.auxSkill}
          skills={skillNames}
          onChange={(v) => set({ auxSkill: v })}
          disabledValue={build.primarySkill}
        />
        <MaxLevelInput label="Max level" value={build.maxLevel} onChange={(n) => set({ maxLevel: n })} max={125} />
        <label>
          <input type="checkbox" checked={build.isPublic} onChange={(e) => set({ isPublic: e.target.checked })} />
          Public
        </label>
        <button onClick={save}>{id ? 'Save' : 'Create'}</button>
        {id && <button onClick={() => nav(`/builds/${id}`)}>View</button>}
        {id && <button onClick={remove}>Delete</button>}
      </div>

      <h3>Abilities</h3>
      <div className="row">
        <AbilityBar
          label={build.primarySkill || 'Primary — pick a skill'}
          chains={primaryChains}
          selected={build.primaryAbilities}
          maxLevel={build.maxLevel}
          maxSkillLevel={build.maxLevel}
          onChange={setPrimaryAbility}
          mods={modifiers}
          attrs={attributes}
          abilityModIndex={abilityModIndex}
          equippedCounts={equipped}
        />
        <AbilityBar
          label={build.auxSkill || 'Auxiliary — pick a skill'}
          chains={auxChains}
          selected={build.auxAbilities}
          maxLevel={build.maxLevel}
          maxSkillLevel={build.maxLevel}
          onChange={setAuxAbility}
          mods={modifiers}
          attrs={attributes}
          abilityModIndex={abilityModIndex}
          equippedCounts={equipped}
        />
      </div>

      <h3>Equipment</h3>
      <EquipmentGrid
        build={build}
        mods={modifiers}
        attrs={attributes}
        items={cdn.data.items}
        onModChange={setMod}
        onSideChange={setSlotSide}
        onItemChange={setSlotItem}
      />

      <h3>Notes</h3>
      <textarea
        value={build.notes}
        onChange={(e) => set({ notes: e.target.value })}
        rows={4}
        style={{ width: '100%' }}
      />
    </div>
  );
}
