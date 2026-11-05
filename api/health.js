import {isConfigured,getPool} from '../server/auth.js';
export async function GET(){let ready=false;if(isConfigured()){try{await getPool().query('SELECT 1 FROM practice_snapshots LIMIT 1');ready=true}catch{}}
 return Response.json({accountsReady:ready,mode:'paper',liveTrading:false},{headers:{'Cache-Control':'no-store'}})}
