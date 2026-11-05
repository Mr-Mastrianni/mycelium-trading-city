import {getMigrations}from'better-auth/db/migration';
import {authOptions,getPool,isConfigured}from'../server/auth.js';
if(!isConfigured())throw new Error('Connect the project database and set BETTER_AUTH_URL and BETTER_AUTH_SECRET before running db:migrate.');
const {runMigrations}=await getMigrations(authOptions(getPool(),{url:process.env.BETTER_AUTH_URL,secret:process.env.BETTER_AUTH_SECRET,production:process.env.NODE_ENV==='production'}));await runMigrations();
await getPool().query('CREATE TABLE IF NOT EXISTS practice_snapshots (user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, revision integer NOT NULL CHECK (revision>0), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
console.log('Authentication and practice tables are ready.');await getPool().end();
