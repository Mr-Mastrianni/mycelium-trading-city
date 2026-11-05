import {getMigrations}from'better-auth/db/migration';
import {authOptions}from'./auth.js';
export async function migrateDatabase(pool,config){
 // The caller supplies an unpooled connection; the session lock serializes builds.
 const lock=await pool.connect();
 try{
  await lock.query('SELECT pg_advisory_lock(619487523)');
  const {runMigrations}=await getMigrations(authOptions(pool,config));await runMigrations();
  await pool.query('CREATE TABLE IF NOT EXISTS practice_snapshots (user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, revision integer NOT NULL CHECK (revision>0), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
 }finally{try{await lock.query('SELECT pg_advisory_unlock(619487523)')}finally{lock.release()}}
}
