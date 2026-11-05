import {getAuth,isConfigured}from'../server/auth.js';
import {routeAuthRequest}from'../server/auth-routing.js';
async function handle(request){
 if(!isConfigured())return Response.json({message:'Cloud accounts need a connected database.'},{status:503,headers:{'Cache-Control':'no-store'}});
 const forwarded=routeAuthRequest(request,process.env.BETTER_AUTH_URL);if(!forwarded)return Response.json({message:'Unknown account endpoint'},{status:404});
 try{return await getAuth().handler(forwarded)}catch{console.error('Account request failed');return Response.json({message:'Account service unavailable. Your local practice data remains on this device.'},{status:503})}
}
export const GET=handle,POST=handle;
