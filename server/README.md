# CloudDocs API (server)

Express + TypeScript + PostgreSQL. Requires Node 20+ and PostgreSQL 14+.

## First-time setup

1. Create the database (use the password you set when installing PostgreSQL):
   ```
   psql -U postgres -c "CREATE DATABASE clouddocs;"
   ```
   (No `psql` on your PATH? Open "SQL Shell (psql)" from the Start menu, or create `clouddocs` in pgAdmin.)
2. Configure the environment:
   ```
   cd server
   copy .env.example .env      # macOS/Linux: cp .env.example .env
   ```
   Then edit `.env` and put your real PostgreSQL password in `DATABASE_URL`.
3. Install, create the tables, add demo data, start:
   ```
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```
4. Open http://localhost:4000/api/health. You should see `{"status":"ok","db":"up"}`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with auto-reload |
| `npm run db:migrate` | Apply any new files in `db/migrations/` (safe to re-run) |
| `npm run db:seed` | DEV ONLY: wipe tables and insert demo users + a sample request |
| `npm run db:reset` | DEV ONLY: drop everything, re-migrate (then run `db:seed`) |
| `npm run typecheck` | Type-check without running |

Demo logins (password `password123` for all): `andrea.santos@g.msuiit.edu.ph` (student),
`ramon.flores@msuiit.edu.ph` (Adviser), `maria.reyes@msuiit.edu.ph` (Chairperson),
`jose.villanueva@msuiit.edu.ph` (College Dean). The approver names are placeholders.

## Changing the database

Never edit `001_init.sql` after it has been shared. Add a new file instead
(`002_add_attachments.sql`, ...) and run `npm run db:migrate`.

## Layout

```
db/migrations/   SQL schema, applied in filename order
src/config/      environment validation
src/lib/         db pool + transactions, approval-chain definition (workflow.ts)
src/db/          migrate / seed / reset scripts
src/app.ts       Express app (routers get mounted here)
src/server.ts    entry point
```
