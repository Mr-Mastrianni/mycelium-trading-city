import {getAuth,isConfigured} from '../../server/auth.js';
async function handle(request){if(!isConfigured())return Response.json({message:'Cloud accounts need a connected database.'},{status:503,headers:{'Cache-Control':'no-store'}});try{return await getAuth().handler(request)}catch{console.error('Account request failed');return Response.json({message:'Account service unavailable. Your local practice data remains on this device.'},{status:503})}}
export const GET=handle,POST=handle;
