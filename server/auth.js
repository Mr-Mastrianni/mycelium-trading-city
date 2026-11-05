import {betterAuth} from 'better-auth';
import pg from 'pg';
let authInstance,pool;
export const isConfigured=()=>!!(process.env.DATABASE_URL&&process.env.BETTER_AUTH_SECRET&&process.env.BETTER_AUTH_URL);
export function getPool(){if(!isConfigured())throw new Error('Accounts are not configured');return pool??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000})}
export function authOptions(database,{url,secret,production=false}){return {appName:'Mycelium Trading City',baseURL:url,secret,database,emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128},session:{expiresIn:60*60*24*7,updateAge:60*60*24},rateLimit:{enabled:true,storage:'database',window:60,max:40,customRules:{'/sign-in/email':{window:60,max:5},'/sign-up/email':{window:60,max:3}}},advanced:{useSecureCookies:production,ipAddress:{ipAddressHeaders:['x-vercel-forwarded-for']}},trustedOrigins:[new URL(url).origin]}}
export function createAuth(database,config){return betterAuth(authOptions(database,config))}

export function getAuth(){if(!isConfigured())throw new Error('Accounts are not configured');return authInstance??=createAuth(getPool(),{url:process.env.BETTER_AUTH_URL,secret:process.env.BETTER_AUTH_SECRET,production:process.env.NODE_ENV==='production'})}
