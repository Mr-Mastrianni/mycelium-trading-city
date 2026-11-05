export {snapshotSchema}from'../src/schema.js';
export function sameOrigin(request,allowed){const origin=request.headers.get('origin');return origin===new URL(allowed).origin}
export async function saveSnapshot(pool,userId,revision,snapshot){
 if(revision===0){const r=await pool.query('INSERT INTO practice_snapshots (user_id,revision,payload) VALUES ($1,1,$2::jsonb) ON CONFLICT (user_id) DO NOTHING RETURNING revision,updated_at',[userId,JSON.stringify(snapshot)]);return r.rows[0]||null}
 const r=await pool.query('UPDATE practice_snapshots SET payload=$1::jsonb,revision=revision+1,updated_at=now() WHERE user_id=$2 AND revision=$3 RETURNING revision,updated_at',[JSON.stringify(snapshot),userId,revision]);return r.rows[0]||null;
}
