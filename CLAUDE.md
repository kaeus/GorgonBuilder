# GorgonBuilder

Hosted web app for browsing, searching, and building Project Gorgon character builds. Users pick a primary + auxiliary skill, choose 6 abilities per skill, set a max character/skill level (which auto-resolves to the highest valid ability and modifier tiers), and configure 9 equipment slots — each with up to 6 modifiers drawn from constrained pools.

## Stack
- **Frontend**: Vite + React 18 + TypeScript
- **Data fetching**: TanStack Query (CDN JSON cached in IndexedDB via `idb-keyval`, keyed by version)
- **State**: Zustand (`src/store/buildStore.ts`) for the live build editor
- **Backend**: Firebase — Firestore (`builds` collection) and Firebase Auth (Google provider)
- **Hosting**: GitHub Pages via `.github/workflows/deploy.yml` (`actions/deploy-pages`). `VITE_BASE` is injected at build time as `/<repo>/`. `public/404.html` is an SPA fallback that preserves deep links; `public/.nojekyll` disables Jekyll.

## CDN data contract
At startup the app fetches `https://cdn.projectgorgon.com/fileversion.txt` (expected content like `v466`), then fetches and caches:
- `<base>/<version>/data/abilities.json` → `AbilityMap` keyed `ability_XXXXX`
- `<base>/<version>/data/tsysclientinfo.json` → `ModifierMap` keyed `power_XXXXX`
- `<base>/<version>/data/attributes.json` → `AttributeMap` keyed by token names

Caching lives in IndexedDB under `cdn:<version>:<file>`. On version change, older entries are pruned. See `src/cdn/loader.ts` and `src/cdn/queries.ts`.

## Domain model invariants
- **Ability chains**: abilities with the same `Skill` are grouped and collapsed into chains via the `Prerequisite` link. `pickAbilityTier(chain, maxLevel)` returns the highest tier whose `Level <= maxLevel`. See `src/domain/skills.ts`, `src/domain/tierResolver.ts`.
- **Modifier tiers**: each `Modifier.Tiers[id_N]` has a `SkillLevelPrereq`. `pickModifierTier(mod, maxSkillLevel)` returns the highest tier whose prereq is satisfied.
- **Modifier pools** (`src/domain/modifierPools.ts`):
  - `primary` = `Modifier.Skill === <primarySkill>`
  - `auxiliary` = `Modifier.Skill === <auxSkill>`
  - `generic` = `Modifier.Skill === "AnySkill"`
  - `shamanic` = `Modifier.Skill === "ShamanicInfusion"`
  - Mods are additionally filtered by `Slots.includes(<EquipmentSlot>)`.
- **Equipment slot rule**: every slot has exactly **6** modifier indices — `0..2` must come from the primary pool, `3..4` from the auxiliary pool, and `5` is flex (primary | auxiliary | generic | shamanic). Enforced by `allowedPoolForModIndex` and `validateModPlacement` in `src/domain/build.ts`.
- **Equipment slots**: `Head, Chest, Legs, Hands, Feet, Ring, Necklace, MainHand, OffHand` — defined once in `src/cdn/types.ts::EQUIPMENT_SLOTS`.
- **EffectDesc rendering**: modifier tier `EffectDescs` entries are strings like `"{BOOST_SKILL_ARCHERY}{5}"`. `src/domain/effectDesc.ts::renderEffectDesc` parses `{TOKEN}{value}` pairs, resolves the token via `attributes.json`, and formats using `DisplayType` (`AsInt`, `AsDoubleTimes100`, `AsBuffDelta`, `AsDebuffMod`).
- **Ability → relevant modifiers** (`src/domain/abilityModIndex.ts`): heuristic reverse index built once at load. Tokens containing `ABILITY_<INTERNALNAME>` map a modifier back to that ability. Skill-wide boosts (`BOOST_SKILL_<SKILL>`) are surfaced as a separate bucket in the tooltip. This is a heuristic — some mods may still be missed.

## Firestore schema
`builds/{buildId}`:
```
ownerUid, name, notes, maxLevel, maxSkillLevel,
primarySkill, auxSkill,
primaryAbilities: (string|null)[6]   // base ability InternalName per slot
auxAbilities:     (string|null)[6]
equipment: { Head: EquipEntry, Chest: EquipEntry, ..., OffHand: EquipEntry }   // 9 keys
isPublic: bool, createdAt, updatedAt
searchSkills: string[]               // [primarySkill, auxSkill] for queries
```
`EquipEntry = { mods: (ModRef | null)[6] }`
`ModRef = { powerId: "power_XXXXX", pool: "primary"|"auxiliary"|"generic"|"shamanic" }`

**Search**: `where('isPublic','==',true).where('searchSkills','array-contains',<skill1>)`, with optional client-side AND filter for the second skill (Firestore only allows one `array-contains`). See `src/firestore/builds.ts::searchBuilds`.

### Firestore rules
The **source of truth** for deployed security rules lives at [firestore.rules](firestore.rules). Paste it into the Firebase console (Firestore → Rules) or deploy via `firebase deploy --only firestore:rules`.

**Whenever the data model changes** — new collection, new required field, new access pattern, new denormalized field used in a `where` clause, etc. — update `firestore.rules` in the same commit as the code change and note the rule update in the PR/commit description. Treat it like a schema migration: code that assumes a new rule is in place will break in prod until the console is updated.

Current collections covered:
- `builds/{buildId}` — owner read/write, public read when `isPublic == true`, `ownerUid` immutable on update.
- `users/{uid}` — public read (for build bylines), owner-only write.

## Layout
```
src/
  main.tsx, App.tsx, index.css
  firebase/     config.ts, auth.tsx
  cdn/          types.ts, loader.ts, queries.ts
  domain/       skills.ts, tierResolver.ts, effectDesc.ts, modifierPools.ts, abilityModIndex.ts, build.ts
  store/        buildStore.ts
  components/   SkillPicker, MaxLevelInput, AbilityBar, AbilityTooltip, EquipmentGrid, EquipmentSlotEditor, ModifierPicker
  pages/        LoginPage, BuildListPage, BuildEditorPage, BuildViewPage
  firestore/    builds.ts
```

## GorgonExplorer import proxy
Importing a build from `gorgonexplorer.com/build-planner/<id>` requires hitting `gorgonexplorer.com/api/build/<id>`, which (a) does not send CORS headers and (b) 403s requests without a browser `Referer`. The preferred path is the **Cloudflare Worker** in [worker/](worker/), which fetches with spoofed browser headers and re-emits with `Access-Control-Allow-Origin: *`.

- Deploy steps: [worker/README.md](worker/README.md)
- Once deployed, set `VITE_GE_PROXY=https://<worker>.workers.dev` in `.env.local` and as a repo secret (wired through `deploy.yml`).
- If the env var is unset, the client falls back to (dev) Vite proxy → (prod) direct fetch → allorigins.win. These fallbacks are fragile and should be removed once the worker is live.

## Local dev
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in Firebase keys.
3. `npm run dev` → header footer shows CDN version + counts, confirm non-zero.
4. `npm run build` → `dist/` for a GH Pages smoke test.

## Deploy (GitHub Pages)
- Push to `main` → `.github/workflows/deploy.yml` runs `npm ci && npm run build` with `VITE_BASE=/<repo>/` and publishes `dist/` via `actions/deploy-pages`.
- **Required repo secrets**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- **Firebase console**: add `<user>.github.io` to **Authentication → Settings → Authorized domains** or sign-in with Google will fail.
- **Repo settings**: Pages → Source = "GitHub Actions".
