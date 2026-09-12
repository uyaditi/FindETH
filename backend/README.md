# FindETH Treasure Hunt Backend

FastAPI + SQLite (or Postgres, if you point `DATABASE_URL` at one) service that:

1. Stores hunt **metadata** (title, description, story, clue flavour text — never
   plaintext answers) so the frontend can show what a hunt is about without ever
   exposing the on-chain answer hashes.
2. Generates real, content-grounded hunt drafts with **Gemini 2.5 Flash**, replacing
   the old hardcoded/template "AI" generator.

## Why there's no `answer` column

The `TreasureHunt` contract stores only `keccak256(normalised answer)` per clue,
on-chain. This backend's database schema deliberately has **no `answer` column
anywhere** — `POST /api/hunts/{id}/metadata` rejects (422) any clue payload that
includes an `answer` field at all, so a stale/misconfigured frontend build fails
loudly instead of silently leaking solutions through a public API. The only place
a plaintext answer ever appears is the JSON response of `POST /api/ai/generate`
(and `/api/ai/regenerate-clue`), which is a draft returned straight to the
creator's own browser for review before anything is hashed and published
on-chain — it is never persisted here.

## Run locally

No Docker, no separate database server — `DATABASE_URL` defaults to a local
SQLite file (`backend/treasurehunts.db`), created automatically by the first
migration.

### 1. Configure the backend

```bash
cd backend
cp .env.example .env
# edit .env: set GEMINI_API_KEY, TREASURE_HUNT_ADDRESS, RPC_URL, etc.
```

### 2. Install dependencies

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Run migrations

```bash
alembic upgrade head
```

This creates `backend/treasurehunts.db` with the `hunts`/`clues` tables.

### 4. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

Verify it's up:

```bash
curl http://localhost:8000/api/health
# {"status":"ok","db":true}
```

### 5. Try a real Gemini-backed generation call

Requires `GEMINI_API_KEY` to be set in `.env` (get one at
https://aistudio.google.com/apikey) and requires `businessUrl` to be a real,
publicly reachable URL (this call fetches it live and grounds the hunt in its
actual text — it does not fabricate content):

```bash
curl -X POST http://localhost:8000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "businessUrl": "https://example.com",
    "businessName": "Example Co",
    "businessType": "retail",
    "campaign": "Summer launch",
    "targetAudience": "existing customers",
    "channels": ["twitter", "email"],
    "difficulty": "medium",
    "huntType": 0,
    "prize": "0.05"
  }'
```

### 6. Publishing metadata (signature-gated)

`POST /api/hunts/{hunt_id}/metadata` requires:

- `TREASURE_HUNT_ADDRESS` and `RPC_URL` configured and pointing at a chain where
  hunt `{hunt_id}` was actually created via `createHunt(...)` (e.g. a local
  Anvil node with the contracts deployed, or a testnet).
- `signature` = an EIP-191 personal-sign signature, from the hunt's creator
  wallet, over the exact message `Publish metadata for hunt {hunt_id}`.
- The recovered signer must match both the claimed `creator` field AND the
  contract's on-chain `creator` for that hunt, or the request is rejected (403).
- Publishing the same `hunt_id` twice is rejected (409) — metadata is immutable
  once published, mirroring the immutability of the on-chain clue hashes.

## Database migrations

Create a new migration after changing `app/models.py`:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

## Sanity check without running migrations

You can always sanity-check that the app imports cleanly, even before running
`alembic upgrade head`:

```bash
python -c "from app.main import app"
```

`/api/health` handles a missing/unreachable database gracefully and reports
`"db": false` rather than crashing.
