@AGENTS.md

# LoreKeeper — Project Instructions

## What This Is

A PWA DM companion app for D&D. Players join campaigns by code — no accounts. The flagship feature is the **Fate Engine**: a weighted random event system where the DM sets intent, the app picks the target secretly, and the targeted player gets a push notification before the DM sees who was chosen.

See [PLANNING.md](PLANNING.md) for the full feature plan and phase breakdown.
See [ARCHITECTURE.md](ARCHITECTURE.md) for the full layer map, data models, and folder structure.

---

## Architecture

This project strictly follows the **iDesign / volatility-based decomposition** defined in the global CLAUDE.md. Read that file before writing any code.

**Stack:** Next.js (App Router) · TypeScript (strict) · Supabase (Postgres + Realtime) · Web Push API · Tailwind CSS · Hosted on Vercel

**Layer summary for this project:**

| Layer | Key Components |
|---|---|
| Client | `app/dm/` (DM views), `app/play/` (Player views) |
| Manager | `CampaignManager`, `FateManager`, `CombatManager`, `CharacterManager`, `WorldManager`, `NotificationManager` |
| Engine | `FateEngine` (weighted selection), `CombatEngine` (initiative, conditions) |
| Accessor | `CampaignAccessor`, `CharacterAccessor`, `FateAccessor`, `NotificationAccessor` |
| Utility | `DiceUtility`, `RandomTableUtility`, `PushUtility` |

All layer implementations are thin shells with `HandlerResolver` instances. All logic lives in `handlers/` subdirectories. See global CLAUDE.md for the full Handler Resolver pattern.

---

## TypeScript Rules

- `strict: true` — no exceptions
- No `any` — use `unknown` at external boundaries and narrow with type guards
- Prefer type declarations (`: MyType`) over type assertions (`as MyType`)
- All service operations use typed `Request` / `Response` objects inheriting from `RequestBase` / `ResponseBase`

---

## Supabase

- Use Supabase Realtime for all live state (HP changes, initiative, fate reveals)
- Row-level security must be configured — players may only read/write their own character within a campaign
- Campaign codes are the auth boundary; DM PIN hash is stored (never the raw PIN)

### RLS checklist for every new table

Every `CREATE TABLE` migration must include all four of these before the file ends:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_select" ON <table> FOR SELECT USING (true);
CREATE POLICY "<table>_insert" ON <table> FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY "<table>_update" ON <table> FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY "<table>_delete" ON <table> FOR DELETE USING ((SELECT auth.role()) = 'service_role');
```

`SELECT` is open (Realtime subscriptions require it). All mutations are locked to `service_role` (API routes use the service-role key; the anon key is never given write access). If a table needs tighter select rules, add a `campaign_id` or `character_id` check instead of `true`.

---

## Web Push / Fate Engine

- VAPID keys are required — store `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env.local`
- Push subscriptions are stored per character in `CharacterAccessor`
- The Fate Engine reveal flow: FateEngine selects target (pure logic) → NotificationAccessor pushes to player → DM taps Reveal → Supabase Realtime broadcasts to all
- The player knows they were chosen before the DM does — this asymmetry is intentional and must be preserved

---

## Naming Conventions

| Thing | Convention |
|---|---|
| Request types | `<Operation>Request` — e.g. `DrawFateRequest`, `JoinCampaignRequest` |
| Response types | `<Operation>Response` — e.g. `DrawFateResponse`, `JoinCampaignResponse` |
| Handler files | `<Operation>Handler.ts` — e.g. `DrawFateHandler.ts` |
| Manager interfaces | `I<Name>Manager` — e.g. `IFateManager` |
| Engine interfaces | `I<Name>Engine` |
| Accessor interfaces | `I<Name>Accessor` |

---

## What NOT to Do

- Do not call an Accessor from another Accessor — coordinate through a Manager
- Do not put business logic in an Accessor — move it to an Engine
- Do not call an Engine directly from a Client component — route through a Manager
- Do not use Supabase client directly in components — all DB access goes through Accessors
- Do not store raw DM PINs
