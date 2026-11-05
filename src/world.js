import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {buildEnvironment} from './scenery.js';

export function createWorld(host, options) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#807e78');
  const camera=new THREE.PerspectiveCamera(48,1,.1,350);
  camera.position.set(0,5.5,24);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  host.append(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,4,-12);
  controls.enableDamping=true;
  controls.minDistance=3;controls.maxDistance=70;
  controls.maxPolarAngle=Math.PI/2-.04;
  controls.minPolarAngle=.2;
  const environment=buildEnvironment(scene,renderer);
  const {dark,gold,material,mesh,box,bots,hit}=environment;
  const destinations={
    plaza:{position:[0,5.5,24],target:[0,4,-12]},
    es:{position:[0,5.2,2],target:[0,5.2,-13]},
    events:{position:[-7,4.2,9],target:[-19,2.9,-7]},
    research:{position:[7,4.2,9],target:[19,2.9,-7]},
    journal:{position:[5,4.2,30],target:[17,2.8,16]},
    practice:{position:[-6,4.2,29],target:[-18,2.8,15]}
  };
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
      const wick=box(.025,Math.max(.015,wy(py(b.high))-wy(py(b.low))),.025,mat,wx(x),(wy(py(b.high))+wy(py(b.low)))/2,.27,candles);
      wick.castShadow=false;
      const candle=box(Math.min(.17,16.5*(right-left)/2048/visible.length*.6),Math.max(.025,Math.abs(wy(py(b.open))-wy(py(b.close)))),.12,mat,wx(x),(wy(py(b.open))+wy(py(b.close)))/2,.28,candles);candle.castShadow=false;
    });tex.needsUpdate=true;
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null,tween=null,current='plaza',reduced=false,walking=false;
  function go(id){let d=destinations[id];if(!d)return;if(id==='es'){const distance=Math.max(15,8.9/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));d={position:[0,5.2,-12.8+distance],target:[0,5.2,-12.8]}; }else if(id!=='plaza'){
      const target=new THREE.Vector3(...d.target),offset=new THREE.Vector3(...d.position).sub(target);
      const needed=(id==='journal'||id==='practice'?5.7:6.7)/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect);
      offset.setLength(Math.max(offset.length(),needed));d={position:target.clone().add(offset).toArray(),target:d.target};
    }current=id;walking=false;controls.enabled=true;controls.enablePan=id!=='es';controls.enableRotate=id!=='es';controls.minDistance=id==='es'?8:3;controls.maxDistance=id==='es'?Math.max(23,d.position[2]+12.8+5):70;
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
    environment.update(time,reduced);
    bots.forEach((g,i)=>{let a=(reduced?0:time*.000035)+i*Math.PI/4,r=7+i%2*2;g.position.set(Math.sin(a)*r,.08+(reduced?0:Math.sin(time*.004+i)*.03),Math.cos(a)*r+5);g.rotation.y=a+Math.PI/2});
    controls.update();renderer.render(scene,camera);
  }
  go('plaza');requestAnimationFrame(animate);
  return {go,updateChart,setReduced(value){reduced=value},setWalking(value){walking=value;controls.enableRotate=true;current='walk';options.onDestination('walk')},setQuality(value){environment.setQuality(value==='low');renderer.setPixelRatio(value==='low'?1:Math.min(devicePixelRatio,1.6));resize()},getDestination:()=>current};
}
