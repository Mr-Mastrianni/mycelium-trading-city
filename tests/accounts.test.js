import test from 'node:test';import assert from 'node:assert/strict';
import {PGlite}from'@electric-sql/pglite';import {getMigrations}from'better-auth/db/migration';
import {createAuth,authOptions}from'../server/auth.js';import {sameOrigin,saveSnapshot}from'../server/snapshot.js';
import {GET as health}from'../api/health.js';import {GET as progress}from'../api/practice.js';
test('unconfigured accounts report unavailable and never expose a guest snapshot',async()=>{const h=await health();assert.equal((await h.json()).accountsReady,false);assert.equal((await progress(new Request('https://mycelium.test/api/practice'))).status,401)});
test('write origins must match the canonical application origin',()=>{assert.equal(sameOrigin(new Request('https://mycelium.test/api/practice',{headers:{Origin:'https://evil.test'}}),'https://mycelium.test'),false);assert.equal(sameOrigin(new Request('https://mycelium.test/api/practice',{headers:{Origin:'https://mycelium.test'}}),'https://mycelium.test'),true);assert.equal(sameOrigin(new Request('https://mycelium.test/api/practice'),'https://mycelium.test'),false)});
test('accounts sign up, reject wrong passwords, authenticate cookies, and isolate versioned saves',async()=>{
 const db=new PGlite();const query=async(sql,params)=>{const r=await db.query(sql,params);return {...r,rowCount:r.affectedRows??r.rows.length}};
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{}};
 const config={url:'http://localhost:3000',secret:'test-only-ephemeral-secret-32-characters-not-a-real-credential'};
 try{
  const migration=await getMigrations(authOptions(pool,config));await migration.runMigrations();
  await query('CREATE TABLE practice_snapshots (user_id text PRIMARY KEY REFERENCES "user"(id),revision integer NOT NULL,payload jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())');
  const auth=createAuth(pool,config);
  const call=(path,body,cookie)=>auth.handler(new Request('http://localhost:3000/api/auth/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000','x-vercel-forwarded-for':'127.0.0.1',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}));
  const signup=await call('sign-up/email',{name:'Practice Test',email:'practice@example.test',password:'EphemeralTestPassword123!'});assert.equal(signup.status,200);
  const bad=await call('sign-in/email',{email:'practice@example.test',password:'NotTheCorrectPassword123!'});assert.equal(bad.status,401);
  const login=await call('sign-in/email',{email:'practice@example.test',password:'EphemeralTestPassword123!'});assert.equal(login.status,200);
  const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join(';');assert.ok(cookie);
  const session=await (await call('get-session',undefined,cookie)).json();assert.equal(session.user.email,'practice@example.test');
  const snapshot={schema:2,state:{cursor:40}};const first=await saveSnapshot(pool,session.user.id,0,snapshot);assert.equal(first.revision,1);
  assert.equal(await saveSnapshot(pool,session.user.id,0,snapshot),null);assert.equal(await saveSnapshot(pool,session.user.id,99,snapshot),null);
  assert.equal((await saveSnapshot(pool,session.user.id,1,snapshot)).revision,2);
  assert.equal((await query('SELECT payload FROM practice_snapshots WHERE user_id=$1',['different-user'])).rows.length,0);
  const out=await call('sign-out',{},cookie);assert.equal(out.status,200);assert.equal(await (await call('get-session',undefined,cookie)).json(),null);
 }finally{await db.close()}
});
