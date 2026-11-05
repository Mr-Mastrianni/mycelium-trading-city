import {spawnSync}from'node:child_process';
if(process.env.VERCEL_ENV==='production'){
 const {migrate}=await import('./migrate.js');
 try{await migrate();console.log('Account database schema is ready.')}catch(error){console.error('Account database initialization failed:',error.code||error.name);process.exit(1)}
}
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit'});process.exit(result.status??1);
