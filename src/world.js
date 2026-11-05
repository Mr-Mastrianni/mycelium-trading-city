import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

export function createWorld(host, options) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#b5b8a5');
  scene.fog=new THREE.Fog('#b5b8a5',48,130);
  const camera=new THREE.PerspectiveCamera(48,1,.1,180);
  camera.position.set(0,5.5,24);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  host.append(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,4,-12);
  controls.enableDamping=true;
  controls.minDistance=3;controls.maxDistance=70;
  controls.maxPolarAngle=Math.PI/2-.04;
  controls.minPolarAngle=.2;
  const ambient=new THREE.HemisphereLight('#f5ead2','#465b50',2.3);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#ffe4ad',3.2);sun.position.set(-25,35,-30);scene.add(sun);
  const fill=new THREE.DirectionalLight('#b5d6d0',1.3);fill.position.set(20,10,20);scene.add(fill);
  const material=(color,metalness=0,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const stone=material('#65716a',.13),dark=material('#243c37',.4,.45),gold=material('#bba16c',.65,.32),ivory=material('#bdc3ae');
  const lightmat=new THREE.MeshBasicMaterial({color:'#d9d796'});
  function mesh(geo,mat,x=0,y=0,z=0,parent=scene){let m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m}
  function box(w,h,d,mat,x,y,z,parent=scene){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent)}
  function cylinder(r1,r2,h,mat,x,y,z,parent=scene,n=32){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat,x,y,z,parent)}
  function label(text,x,y,z,size=3.8,parent=scene){
    const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');
    ctx.fillStyle='#142923';ctx.fillRect(0,0,1024,160);ctx.strokeStyle='#b8b789';ctx.lineWidth=3;ctx.strokeRect(8,8,1008,144);
    ctx.fillStyle='#eee8cf';ctx.font='500 55px Georgia';ctx.textAlign='center';ctx.fillText(text,512,99);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:true}));s.position.set(x,y,z);s.scale.set(size,size*.156,1);parent.add(s);return s;
  }
  cylinder(42,42,.5,stone,0,-.35,0,scene,96);
  cylinder(15,15,.05,material('#7a8776'),0,-.075,1,scene,96);
  for(let r of [5,11,16,25,36]){
    let ring=mesh(new THREE.TorusGeometry(r,.025,5,120),gold,0,.01,1);ring.rotation.x=Math.PI/2;
  }
  for(let i=-6;i<=6;i++){
    box(.028,.018,70,material('#819080'),i*5,.01,0);
    box(70,.018,.028,material('#819080'),0,.01,i*5);
  }
  function path(points){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    mesh(new THREE.TubeGeometry(curve,55,.035,5,false),lightmat);
  }
  path([[-2,.06,24],[-4,.06,13],[1,.06,6],[-2,.06,-3],[0,.06,-14]]);
  path([[1,.06,6],[-8,.06,4],[-13,.06,-2],[-17,.06,-7]]);
  path([[1,.06,6],[10,.06,3],[17,.06,-5]]);
  path([[1,.06,6],[7,.06,12],[15,.06,16]]);
  path([[-4,.06,13],[-11,.06,15],[-17,.06,14]]);
  for(let i=0;i<9;i++){
    const x=-2+Math.sin(i*2)*2,z=19-i*3;
    path([[x,.06,z],[x+2,.06,z-1],[x+4,.06,z-2]]);
  }
  const hit=[];
  const destinations={
    plaza:{position:[0,5.5,24],target:[0,4,-12]},
    es:{position:[0,5.2,2],target:[0,5.2,-13]},
    events:{position:[-8,3.3,5],target:[-18,3,-7]},
    research:{position:[8,3.3,5],target:[18,3,-7]},
    journal:{position:[5,3.5,24],target:[16,3,15]},
    practice:{position:[-6,3.5,23],target:[-17,3,14]}
  };
  function pavilion(id,title,x,z,r=5){
    const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    cylinder(r+.6,r+.9,.5,dark,0,.25,0,g);
    cylinder(r+.65,r+.65,.12,gold,0,.56,0,g);
    for(let i=0;i<10;i++){let a=i*Math.PI/5; cylinder(.1,.13,4.9,gold,Math.sin(a)*r,3,Math.cos(a)*r,g,10)}
    const roof=mesh(new THREE.SphereGeometry(r+1,40,18,0,Math.PI*2,0,Math.PI/2),dark,0,5.3,0,g);roof.scale.y=.26;
    const glass=new THREE.MeshPhysicalMaterial({color:'#a6c2ab',transparent:true,opacity:.13,roughness:.2,side:THREE.DoubleSide,depthWrite:false});
    const wall=cylinder(r,r,4.7,glass,0,2.9,0,g,40);
    label(title,0,6.1,0,5.3,g);
    hit.push({object:wall,id});
    for(let i=0;i<3;i++)box(1.8,.3,.6,ivory,-2+i*2,.8,1,g);
    return g;
  }
  pavilion('events','Event Pavilion',-19,-7);
  pavilion('research','Research Grove',19,-7);
  pavilion('journal','Journal Archive',17,16,4);
  pavilion('practice','Practice Garden',-18,15,4);
  const atrium=new THREE.Group();atrium.position.set(0,0,-17);scene.add(atrium);
  box(23,.65,12,dark,0,.15,0,atrium);
  for(let i=0;i<4;i++)box(21-i*.8,.18,1,ivory,0,.15+i*.17,6.2-i*.65,atrium);
  for(let z of [-4,1,5]){
    const arch=mesh(new THREE.TorusGeometry(10,.16,10,64,Math.PI),gold,0,1,z,atrium);
    for(let side of [-1,1])box(.22,1.2,.22,gold,side*10,.6,z,atrium);
  }
  for(let x of [-10,10])for(let z of [-4,1,5])cylinder(.14,.23,8,dark,x,4,z,atrium,12);
  box(21,.3,12,dark,0,9.8,0,atrium);box(21,.04,12,gold,0,9.98,0,atrium);
  label('ES Atrium',0,10.8,3,6.5,atrium);
  // Curved glazing, repeated ribs, garden beds and water give the plaza depth.
  const glassRoof=new THREE.MeshPhysicalMaterial({color:'#c5d7b8',metalness:.15,roughness:.16,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false});
  let vault=mesh(new THREE.CylinderGeometry(10,10,11,64,1,true,0,Math.PI),glassRoof,0,1,-16.5);
  vault.rotation.x=Math.PI/2;
  for(let a=0;a<=Math.PI;a+=Math.PI/18){
    const x=Math.cos(a)*10,y=1+Math.sin(a)*10;
    box(.045,.045,11,gold,x,y,-16.5);
  }
  for(let z=-22;z<=-11;z+=.65){let rib=mesh(new THREE.TorusGeometry(10,.035,5,64,Math.PI),gold,0,1,z)}
  for(let side of [-1,1])for(let z of [-21,-16,-11]){
    for(let a of [-.5,0,.5]){
      let branch=cylinder(.06,.14,3.5,gold,side*8.4,6.3,z);
      branch.rotation.z=side*.55;branch.rotation.x=a;
    }
  }
  const watermat=new THREE.MeshPhysicalMaterial({color:'#47786c',metalness:.5,roughness:.12,transparent:true,opacity:.82});
  const pool=cylinder(4.6,4.6,.1,watermat,10,.03,7,scene,64);pool.scale.z=.65;
  const poolEdge=mesh(new THREE.TorusGeometry(4.7,.15,8,64),ivory,10,.03,7);poolEdge.rotation.x=Math.PI/2;poolEdge.scale.y=.65;
  for(let i=0;i<26;i++){
    let a=i*2.39996,r=3.5+(i%4)*.3,x=-11+Math.sin(a)*r,z=8+Math.cos(a)*r;
    let shrub=mesh(new THREE.IcosahedronGeometry(.3+(i%3)*.15,1),material(i%2?'#648859':'#7b9163'),x,.25,z);shrub.scale.y=.55;
  }
  for(let i=0;i<16;i++){
    let a=i*2.4,x=11+Math.sin(a)*5,z=8+Math.cos(a)*3.5;
    cylinder(.03,.05,.35,ivory,x,.25,z,scene,6);
    let cap=mesh(new THREE.SphereGeometry(.2,12,6,0,Math.PI*2,0,Math.PI/2),lightmat,x,.42,z);cap.scale.y=.5;
  }
  const skySun=mesh(new THREE.SphereGeometry(5,24,20),new THREE.MeshBasicMaterial({color:'#ffe3ac'}),-47,25,-65);
  function tree(x,z,size=1){
    let g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);scene.add(g);
    cylinder(.16,.25,3.5,material('#6b6246'),0,1.8,0,g,8);
    for(let i=0;i<5;i++){
      const a=i*1.9,branch=cylinder(.07,.12,2.3,material('#6b6246'),Math.sin(a)*.55,3.1,Math.cos(a)*.55,g,6);
      branch.rotation.z=Math.sin(a)*.65;branch.rotation.x=Math.cos(a)*.65;
      let crown=mesh(new THREE.IcosahedronGeometry(1.65,1),material(i%2?'#72866a':'#526e57'),Math.sin(a)*1.15,4.1+(i%2)*.4,Math.cos(a)*1.15,g);crown.scale.y=.45;
    }
    cylinder(1.5,1.65,.6,dark,0,.3,0,g,24);
  }
  for(let [x,z,s] of [[-12,-18,1.5],[13,-20,1.4],[-27,-3,1.8],[27,-1,1.6],[-8,18,.9],[9,18,1.1],[-30,17,1.3],[28,20,1.5],[-20,-24,1.2],[23,-25,1.6]])tree(x,z,s);
  for(let i=0;i<60;i++){
    let a=i*2.39996,r=33+(i%3)*3;
    const h=4+(i*13%11);let b=cylinder(1.2,1.7,h,material(i%2?'#667a6f':'#7a8677'),Math.sin(a)*r,h/2,Math.cos(a)*r,scene,6);
  }
  for(let i=0;i<12;i++){let a=i*Math.PI/6,x=Math.sin(a)*26,z=Math.cos(a)*26;
    cylinder(.06,.1,1.7,gold,x,.9,z,scene,8);mesh(new THREE.SphereGeometry(.22,12,8),lightmat,x,1.8,z);
  }
  const bots=[];
  for(let i=0;i<8;i++){
    let g=new THREE.Group(),body=material('#d9ddc0'),capmat=material(['#a4b783','#91bbad','#b5a3c5','#cbb48a'][i%4],.2,.45);
    cylinder(.17,.25,.65,body,0,.5,0,g,12);
    mesh(new THREE.SphereGeometry(.48,24,12,0,Math.PI*2,0,Math.PI/2),capmat,0,.84,0,g);
    let face=mesh(new THREE.SphereGeometry(.2,12,8),material('#20362b'),0,.55,.16,g);face.scale.z=.3;
    for(let s of [-1,1])mesh(new THREE.SphereGeometry(.025,8,6),lightmat,s*.065,.58,.23,g);
    for(let j=0;j<5;j++){let a=j*2.4;mesh(new THREE.SphereGeometry(.045,8,6),lightmat,Math.sin(a)*.28,1.07+Math.cos(a)*.03,Math.cos(a)*.24,g)}
    for(let s of [-1,1]){cylinder(.06,.06,.25,body,s*.11,.12,0,g,6);cylinder(.05,.05,.32,body,s*.28,.48,0,g,6)}
    g.userData.bot=i;scene.add(g);bots.push(g);hit.push({object:g,id:'bot-'+i});
  }
  const chart=new THREE.Group();chart.position.set(0,5.1,-12.8);scene.add(chart);
  box(16.6,8.3,.24,dark,0,0,0,chart);
  for(let y of [-4.2,4.2])box(16.8,.06,.3,gold,0,y,0,chart);
  for(let x of [-8.4,8.4])box(.06,8.4,.3,gold,x,0,0,chart);
  const board=document.createElement('canvas');board.width=2048;board.height=1024;const ctx=board.getContext('2d');
  const tex=new THREE.CanvasTexture(board);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  mesh(new THREE.PlaneGeometry(16.5,8.15),new THREE.MeshBasicMaterial({map:tex}),0,0,.14,chart);
  const candles=new THREE.Group();chart.add(candles);
  hit.push({object:chart,id:'es'});
  const green=material('#b1d59a',.1,.45),red=material('#d39886',.1,.45);
  function updateChart(bars,overlay,gapList,timeframe){
    while(candles.children.length){let m=candles.children[0];candles.remove(m);m.geometry.dispose()}
    const visible=bars.slice(-48),lo=Math.min(...visible.map(b=>b.low))-1,hi=Math.max(...visible.map(b=>b.high))+1;
    ctx.fillStyle='#142621';ctx.fillRect(0,0,2048,1024);ctx.fillStyle='#e6e8d6';ctx.font='500 51px Georgia';ctx.fillText('ES  /  Synthetic replay',130,100);
    ctx.fillStyle='#9eaf9c';ctx.font='25px sans-serif';ctx.textAlign='right';ctx.fillText(timeframe+'m  ·  Closed candles',1900,100);ctx.textAlign='left';
    const left=170,right=1880,top=190,bottom=820;
    const py=v=>bottom-(v-lo)/(hi-lo)*(bottom-top);
    for(let i=0;i<=4;i++){let v=lo+(hi-lo)*i/4,y=py(v);ctx.strokeStyle='#3a5145';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillStyle='#b4c4b1';ctx.font='23px monospace';ctx.fillText(v.toFixed(2),15,y+8)}
    for(let i=0;i<visible.length;i+=12){let d=new Date(visible[i].time),x=left+i*(right-left)/visible.length;ctx.fillStyle='#9cae9b';ctx.font='23px monospace';ctx.fillText(d.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'}),x,890)}
    ctx.fillStyle='#8ba28d';ctx.font='21px sans-serif';ctx.fillText('PRACTICE DATA  ·  NO LIVE ORDERS',left,970);
    if(overlay){
      const offset=bars.length-visible.length;
      gapList.filter(g=>g.index>=offset).slice(-2).forEach(g=>{const x=left+(g.index-offset)*(right-left)/visible.length;
        ctx.fillStyle=g.direction==='bullish'?'#a2c28d22':'#b3a4cb22';ctx.fillRect(x,py(g.high),right-x,Math.max(2,py(g.low)-py(g.high)));
        ctx.fillStyle='#a5b99a';ctx.font='20px sans-serif';ctx.fillText('FVG',x+5,py(g.high)-8);
      });
    }
    const wx=px=>(px/2048-.5)*16.5,wy=px=>(.5-px/1024)*8.15;
    visible.forEach((b,i)=>{const x=left+(i+.5)*(right-left)/visible.length,mat=b.close>=b.open?green:red;
      box(.025,Math.max(.015,wy(py(b.high))-wy(py(b.low))),.025,mat,wx(x),(wy(py(b.high))+wy(py(b.low)))/2,.27,candles);
      box(Math.min(.17,16.5*(right-left)/2048/visible.length*.6),Math.max(.025,Math.abs(wy(py(b.open))-wy(py(b.close)))),.12,mat,wx(x),(wy(py(b.open))+wy(py(b.close)))/2,.28,candles);
    });tex.needsUpdate=true;
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null,tween=null,current='plaza',reduced=false,walking=false;
  function go(id){let d=destinations[id];if(!d)return;current=id;walking=false;controls.enabled=true;controls.enablePan=id!=='es';controls.enableRotate=id!=='es';controls.minDistance=id==='es'?8:3;controls.maxDistance=id==='es'?23:70;
    tween={position:new THREE.Vector3(...d.position),target:new THREE.Vector3(...d.target)};
    if(reduced){camera.position.copy(tween.position);controls.target.copy(tween.target);tween=null}
    options.onDestination(id);
  }
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;down=null;
    const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
    const candidates=hit.flatMap(h=>{let found=raycaster.intersectObject(h.object,true);return found.length?[{distance:found[0].distance,id:h.id}]:[]}).sort((a,b)=>a.distance-b.distance);
    if(candidates[0]){let id=candidates[0].id;if(id.startsWith('bot-'))options.onBot(Number(id.slice(4)));else go(id)}
  });
  controls.addEventListener('start',()=>{tween=null});
  const keys=new Set();window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.querySelector('dialog[open]'))return;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){keys.add(e.key.toLowerCase());e.preventDefault()}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  function resize(){let w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  new ResizeObserver(resize).observe(host);resize();
  let last=0;
  function animate(time){
    requestAnimationFrame(animate);let dt=Math.min((time-last)/1000,.05);last=time;
    if(tween){let f=reduced?1:1-Math.exp(-dt*5);camera.position.lerp(tween.position,f);controls.target.lerp(tween.target,f);if(camera.position.distanceTo(tween.position)<.025)tween=null}
    if(walking&&!tween&&!document.querySelector('dialog[open]')){
      let forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();let right=new THREE.Vector3().crossVectors(forward,camera.up).normalize(),delta=new THREE.Vector3();
      if(keys.has('w')||keys.has('arrowup'))delta.add(forward);if(keys.has('s')||keys.has('arrowdown'))delta.sub(forward);if(keys.has('d')||keys.has('arrowright'))delta.add(right);if(keys.has('a')||keys.has('arrowleft'))delta.sub(right);
      if(delta.length()){delta.normalize().multiplyScalar(dt*6);const next=camera.position.clone().add(delta);if(Math.hypot(next.x,next.z)<37){camera.position.copy(next);controls.target.add(delta)}}
    }
    bots.forEach((g,i)=>{let a=(reduced?0:time*.000035)+i*Math.PI/4,r=7+i%2*2;g.position.set(Math.sin(a)*r,.08+(reduced?0:Math.sin(time*.004+i)*.03),Math.cos(a)*r+5);g.rotation.y=a+Math.PI/2});
    controls.update();renderer.render(scene,camera);
  }
  go('plaza');requestAnimationFrame(animate);
  return {go,updateChart,setReduced(value){reduced=value},setWalking(value){walking=value;controls.enableRotate=true;current='walk';options.onDestination('walk')},setQuality(value){renderer.setPixelRatio(value==='low'?1:Math.min(devicePixelRatio,1.6));resize()},getDestination:()=>current};
}
