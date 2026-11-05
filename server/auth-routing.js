export function routeAuthRequest(request,baseURL){
 const source=new URL(request.url),path=source.pathname.startsWith('/api/auth/')?source.pathname.slice('/api/auth/'.length):source.searchParams.get('__auth_path');
 if(!path||!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/i.test(path))return null;
 const destination=new URL('/api/auth/'+path,baseURL);source.searchParams.delete('__auth_path');destination.search=source.search;
 return new Request(destination,{method:request.method,headers:request.headers,signal:request.signal,...(!['GET','HEAD'].includes(request.method)?{body:request.body,duplex:'half'}:{})});
}
