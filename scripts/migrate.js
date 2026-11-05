import {pathToFileURL}from'node:url';
import pg from'pg';
import {migrateDatabase}from'../server/migrations.js';
export async function migrate(){
 if(!process.env.DATABASE_URL_UNPOOLED||!process.env.BETTER_AUTH_SECRET||!process.env.BETTER_AUTH_URL)throw new Error('Dedicated unpooled database URL and auth configuration are required before migrating.');
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL_UNPOOLED,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
 try{await migrateDatabase(pool,{url:process.env.BETTER_AUTH_URL,secret:process.env.BETTER_AUTH_SECRET,production:process.env.NODE_ENV==='production'})}finally{await pool.end()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await migrate();console.log('Authentication and practice tables are ready.')}
