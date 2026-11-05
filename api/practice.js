import {getAuth,getPool,isConfigured}from'../server/auth.js';
import {snapshotSchema,sameOrigin,saveSnapshot}from'../server/snapshot.js';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200)=>Response.json(data,{status,headers});
async function user(request){if(!isConfigured())return null;const session=await getAuth().api.getSession({headers:request.headers});return session?.user?.id||null}
export async function GET(request){try{const id=await user(request);if(!id)return json({message:'Sign in to load cloud progress'},401);const r=await getPool().query('SELECT revision,payload,updated_at FROM practice_snapshots WHERE user_id=$1',[id]);return json(r.rows[0]?{revision:r.rows[0].revision,snapshot:r.rows[0].payload,updatedAt:r.rows[0].updated_at}:{revision:0,snapshot:null})}catch{console.error('Cloud progress read failed');return json({message:'Cloud saving is temporarily unavailable'},503)}}
export async function PUT(request){try{
 if(!isConfigured())return json({message:'Cloud accounts are not configured'},503);
 if(!sameOrigin(request,process.env.BETTER_AUTH_URL))return json({message:'Untrusted request origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({message:'Use JSON'},415);
 const id=await user(request);if(!id)return json({message:'Sign in to save cloud progress'},401);
 const raw=await request.text();if(Buffer.byteLength(raw)>3000000)return json({message:'Practice backup exceeds 3 MB; export it locally'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({message:'Invalid JSON'},400)}
 if(!Number.isInteger(body.revision)||body.revision<0)return json({message:'Invalid save version'},400);
 const parsed=snapshotSchema.safeParse(body.snapshot);if(!parsed.success)return json({message:'Practice data failed validation'},400);
 const saved=await saveSnapshot(getPool(),id,body.revision,parsed.data);if(!saved)return json({message:'Another device saved newer progress. Choose which session to keep.'},409);
 return json({revision:saved.revision,updatedAt:saved.updated_at});
 }catch{console.error('Cloud progress write failed');return json({message:'Cloud saving failed; local data has been retained'},503)}}
