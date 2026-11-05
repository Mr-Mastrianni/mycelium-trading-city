import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// All geometry and fallback textures are local; the CC0 stone photograph is optional.
export function buildEnvironment(scene,renderer) {
  let seed=7183;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const rand=(a,b)=>a+(b-a)*random();
  const material=(color,metalness=0,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  function mesh(geo,mat,x=0,y=0,z=0,parent=scene){
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);
    m.castShadow=!mat.transparent;m.receiveShadow=true;parent.add(m);return m;
  }
  function box(w,h,d,mat,x,y,z,parent=scene){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent)}
  function cylinder(r1,r2,h,mat,x,y,z,parent=scene,n=48){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat,x,y,z,parent)}
  function texture(draw,size=512,color=true){
    const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);
    const t=new THREE.CanvasTexture(c);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
  }
  const grain=texture((c,n)=>{
    c.fillStyle='#858585';c.fillRect(0,0,n,n);
    for(let i=0;i<33000;i++){const v=Math.floor(rand(55,190));c.fillStyle='rgb('+v+','+v+','+v+')';c.fillRect(random()*n,random()*n,rand(.3,2),rand(.3,2))}
    for(let i=0;i<140;i++){c.strokeStyle='rgba(65,60,50,.15)';c.lineWidth=rand(.3,1);c.beginPath();c.moveTo(0,random()*n);c.bezierCurveTo(n*.2,random()*n,n*.7,random()*n,n,random()*n);c.stroke()}
  },512,false);
  const paving=texture((c,n)=>{
    c.fillStyle='#67645a';c.fillRect(0,0,n,n);
    for(let row=0;row<4;row++)for(let col=-1;col<3;col++){
      let x=col*256+(row%2)*128,y=row*128,v=rand(0,20);
      c.fillStyle='rgb('+(171+v)+','+(163+v)+','+(142+v)+')';c.fillRect(x+2,y+2,252,124);
      c.strokeStyle='#d4cbb4';c.lineWidth=1;c.strokeRect(x+3,y+3,250,122);
    }
    c.globalAlpha=.12;c.drawImage(grain.image,0,0,n,n);c.globalAlpha=1;
  });
  const barkMap=texture((c,n)=>{
    c.fillStyle='#655b43';c.fillRect(0,0,n,n);
    for(let i=0;i<850;i++){
      const x=random()*n;c.strokeStyle=i%3?'rgba(28,29,19,.3)':'rgba(185,170,128,.25)';
      c.lineWidth=rand(.3,3);c.beginPath();c.moveTo(x,0);
      for(let j=0;j<=12;j++)c.lineTo(x+Math.sin(j*.8+i)*rand(2,7),j*n/12);c.stroke();
    }
    for(let i=0;i<90;i++){c.fillStyle='rgba(139,154,92,.2)';c.beginPath();c.ellipse(random()*n,random()*n,rand(1,8),rand(2,15),random()*3,0,Math.PI*2);c.fill()}
  });
  const stone=material('#c9bca1',0,.86);stone.map=paving;stone.bumpMap=grain;stone.bumpScale=.045;
  const dark=material('#20332e',.25,.48);dark.bumpMap=grain;dark.bumpScale=.022;
  const gold=material('#b7a079',.78,.29);gold.bumpMap=grain;gold.bumpScale=.007;gold.envMapIntensity=.8;
  const ivory=material('#d3c8ac',.04,.57);ivory.bumpMap=grain;ivory.bumpScale=.016;
  const bark=material('#aa9b75',0,.98);bark.map=barkMap;bark.bumpMap=barkMap;bark.bumpScale=.09;
  const lightmat=new THREE.MeshBasicMaterial({color:'#f7d69a'});
  // Keep the complete local paving texture if the external photograph fails or is blocked.
  new THREE.TextureLoader().load('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/large_sandstone_blocks_01/large_sandstone_blocks_01_diff_1k.jpg',t=>{
    t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());stone.map=t;stone.needsUpdate=true;
  },undefined,()=>{});
  scene.fog=new THREE.FogExp2('#807e78',.0105);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(145,48,32),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{zenith:{value:new THREE.Color('#253c4b')},horizon:{value:new THREE.Color('#c69778')},glow:{value:new THREE.Color('#e7bd8e')}},
    vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 v;uniform vec3 zenith,horizon,glow;void main(){vec3 d=normalize(v);float h=max(d.y,0.);vec3 c=mix(horizon,zenith,pow(h,.6));float s=pow(max(dot(d,normalize(vec3(-.65,.18,-.72))),0.),22.);c=mix(c,glow,s*.7);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
  }));sky.renderOrder=-10;scene.add(sky);
  const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(environment,.04).texture;scene.environmentIntensity=.55;
  environment.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#b5c8cb','#354131',1.1));
  const sun=new THREE.DirectionalLight('#ffd3a0',3.5);sun.position.set(-28,24,-22);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:.5,far:110});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00025;sun.shadow.normalBias=.06;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight('#91b9c4',.65);fill.position.set(18,9,25);scene.add(fill);
  const glow=texture((c,n)=>{const g=c.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);g.addColorStop(0,'rgba(255,233,184,1)');g.addColorStop(.08,'rgba(255,216,158,.9)');g.addColorStop(.23,'rgba(248,180,115,.2)');g.addColorStop(1,'rgba(248,180,115,0)');c.fillStyle=g;c.fillRect(0,0,n,n)},128);
  const solar=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,transparent:true,depthWrite:false,fog:false}));solar.position.set(-78,22,-90);solar.scale.set(35,35,1);scene.add(solar);
  const shadowTex=texture((c,n)=>{const g=c.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);g.addColorStop(0,'rgba(4,15,11,.55)');g.addColorStop(.35,'rgba(4,15,11,.28)');g.addColorStop(1,'rgba(4,15,11,0)');c.fillStyle=g;c.fillRect(0,0,n,n)},128);
  const contactMat=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function contact(x,z,r,parent=scene,y=.035){const s=mesh(new THREE.PlaneGeometry(r*2,r*2),contactMat,x,y,z,parent);s.rotation.x=-Math.PI/2;s.castShadow=false}
  function floor(r,y,mat,x=0,z=0,parent=scene){
    const geo=new THREE.CircleGeometry(r,96);geo.rotateX(-Math.PI/2);
    const p=geo.attributes.position,u=geo.attributes.uv;
    for(let i=0;i<p.count;i++)u.setXY(i,p.getX(i)/3,p.getZ(i)/3);
    return mesh(geo,mat,x,y,z,parent);
  }
  floor(135,-.23,material('#3a4a36'));
  floor(38,-.02,stone);
  cylinder(38,38,.25,dark,0,-.17,0,scene,128);
  for(let r of [15,30,37.5]){const m=mesh(new THREE.TorusGeometry(r,.018,6,160),gold,0,.005,1);m.rotation.x=Math.PI/2}
  function tube(points,r,mat,parent=scene){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve,32,r,8,false),mat,0,0,0,parent);
  }
  const pathMat=new THREE.MeshStandardMaterial({color:'#baaa73',emissive:'#d4b473',emissiveIntensity:.55,roughness:.5,metalness:.45});
  function path(p){return tube(p,.017,pathMat)}
  path([[-2,.015,26],[-4,.015,16],[1,.015,7],[-2,.015,-2],[0,.015,-11]]);
  path([[1,.015,7],[-7,.015,4],[-13,.015,-1],[-18,.015,-7]]);
  path([[1,.015,7],[9,.015,3],[15,.015,-2],[19,.015,-7]]);
  path([[1,.015,7],[7,.015,12],[16,.015,16]]);
  path([[-4,.015,16],[-10,.015,17],[-18,.015,15]]);
  const hit=[];
  function label(text,x,y,z,size=4.8,parent=scene){
    const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');
    const g=ctx.createLinearGradient(0,0,0,160);g.addColorStop(0,'#203a32');g.addColorStop(1,'#10251f');ctx.fillStyle=g;ctx.fillRect(0,0,1024,160);
    ctx.strokeStyle='#baab7d';ctx.lineWidth=2;ctx.strokeRect(10,10,1004,140);
    ctx.fillStyle='#eee3ca';ctx.font='500 52px Georgia';ctx.textAlign='center';ctx.fillText(text,512,99);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t}));s.position.set(x,y,z);s.scale.set(size,size*.156,1);parent.add(s);return s;
  }
  const glass=new THREE.MeshPhysicalMaterial({color:'#b1c8bd',metalness:.08,roughness:.16,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false});
  function pavilion(id,title,x,z,r=5){
    const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    cylinder(r+.7,r+1,.28,dark,0,.14,0,g);floor(r+.65,.29,stone,0,0,g);
    for(let i=0;i<3;i++){const step=cylinder(r+.9-i*.12,r+.98-i*.12,.09,ivory,0,.035+i*.09,0,g);step.receiveShadow=true}
    // Entrance faces the plaza; structural columns stay behind and beside its sightline.
    const entrance=Math.atan2(-x,10-z);g.rotation.y=entrance;
    for(let a of [.95,2.15,3.14,4.13,5.33]){
      const px=Math.sin(a)*r,pz=Math.cos(a)*r;
      tube([[px,.3,pz],[px*.98,2.8,pz*.98],[px*.8,4.5,pz*.8],[px*.45,5,pz*.45]],.075,gold,g);
      for(let d of [-.22,.22])tube([[px*.98,3.4,pz*.98],[Math.sin(a+d)*r*.86,4.6,Math.cos(a+d)*r*.86],[Math.sin(a+d)*r*.7,4.9,Math.cos(a+d)*r*.7]],.036,gold,g);
    }
    const roof=mesh(new THREE.SphereGeometry(r+1,64,24,0,Math.PI*2,0,Math.PI/2),dark,0,4.9,0,g);roof.scale.y=.15;
    for(let rr of [r*.45,r*.73,r+1]){
      const rim=mesh(new THREE.TorusGeometry(rr,.027,6,96),gold,0,4.9+Math.sqrt(1-(rr/(r+1))**2)*(r+1)*.15,0,g);rim.rotation.x=Math.PI/2;
    }
    const wall=mesh(new THREE.CylinderGeometry(r*.98,r*.98,4,48,1,true,.6,Math.PI*1.62),glass,0,2.5,0,g);
    hit.push({object:wall,id});hit.push({object:roof,id});
    label(title,0,4.5,r*.85,5,g);
    for(let a of [2,3.15,4.3]){
      const bench=mesh(new THREE.TorusGeometry(r*.69,.24,10,32,.72),ivory,0,.7,0,g);bench.rotation.x=Math.PI/2;bench.rotation.z=a;
    }
    const lamp=new THREE.PointLight('#ffd1a0',5,11,2);lamp.position.set(0,3.5,0);g.add(lamp);
    return g;
  }
  pavilion('events','Event Pavilion',-19,-7);
  pavilion('research','Research Grove',19,-7);
  pavilion('journal','Journal Archive',17,16,4);
  pavilion('practice','Practice Garden',-18,15,4);
  const atrium=new THREE.Group();atrium.position.set(0,0,-17);scene.add(atrium);
  box(23,.5,12,dark,0,.07,0,atrium);
  for(let i=0;i<4;i++)box(22-i*.45,.15,1,ivory,0,.06+i*.15,6.8-i*.58,atrium);
  const vault=mesh(new THREE.CylinderGeometry(10,10,11,96,1,true,Math.PI/2,Math.PI),glass,0,1,0,atrium);vault.rotation.x=Math.PI/2;
  // No opaque slab across the glass vault.
  for(let z of [-5,-2.5,0,2.5,5]){
    mesh(new THREE.TorusGeometry(10,.065,8,96,Math.PI),gold,0,1,z,atrium);
    for(let side of [-1,1]){
      tube([[side*9.8,.4,z],[side*9.7,3.2,z],[side*8.4,6.2,z],[side*6,9,z]],.09,gold,atrium);
      tube([[side*9.7,3.2,z],[side*9,5.5,z+1],[side*7.6,7.5,z+1.1]],.042,gold,atrium);
    }
  }
  for(let a=0;a<=Math.PI;a+=Math.PI/14){const x=Math.cos(a)*10,y=1+Math.sin(a)*10;box(.025,.025,11,gold,x,y,0,atrium)}
  label('ES Atrium',0,11.7,2,6,atrium);
  const watermat=new THREE.MeshPhysicalMaterial({color:'#36574f',metalness:.4,roughness:.15,clearcoat:1,clearcoatRoughness:.12,bumpMap:grain.clone(),bumpScale:.035});
  const pool=floor(4.6,.055,watermat,10,7);pool.scale.z=.65;
  const poolEdge=mesh(new THREE.TorusGeometry(4.7,.13,12,96),ivory,10,.055,7);poolEdge.rotation.x=Math.PI/2;poolEdge.scale.y=.65;
  const leafTex=texture((c,n)=>{
    c.clearRect(0,0,n,n);c.save();c.translate(n/2,n*.93);
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-n*.44,-n*.28,-n*.35,-n*.63,0,-n*.88);c.bezierCurveTo(n*.35,-n*.63,n*.44,-n*.28,0,0);
    const g=c.createLinearGradient(-n*.2,0,n*.2,-n*.8);g.addColorStop(0,'#667645');g.addColorStop(.48,'#c6c994');g.addColorStop(.52,'#819456');g.addColorStop(1,'#a4b577');c.fillStyle=g;c.fill();
    c.clip();c.globalAlpha=.17;c.drawImage(grain.image,-n/2,-n,n,n);c.globalAlpha=1;
    c.strokeStyle='rgba(225,224,159,.4)';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(0,-n*.88);c.stroke();
    for(let i=1;i<9;i++){const y=-i*n*.085;for(let s of [-1,1]){c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(s*n*.13,y-n*.055,s*n*.27,y-n*.16);c.stroke()}}
    c.restore();
  },128);
  const foliage=new THREE.MeshStandardMaterial({map:leafTex,alphaTest:.5,side:THREE.DoubleSide,roughness:.9,metalness:0});
  const leafGeo=new THREE.PlaneGeometry(1,1,2,3);
  // Bend leaf faces for changing highlights; no opaque canopy blobs.
  const lp=leafGeo.attributes.position;
  for(let i=0;i<lp.count;i++)lp.setZ(i,.17*Math.sin((lp.getY(i)+.5)*Math.PI)+lp.getX(i)**2*.25);
  leafGeo.computeVertexNormals();
  const leafMatrices=[],leafColors=[],branchGeometry=[],dummy=new THREE.Object3D();
  function leaf(x,y,z,s,color){
    dummy.position.set(x,y,z);dummy.rotation.set(rand(-1.7,1.7),rand(0,Math.PI*2),rand(-1.6,1.6));dummy.scale.set(s*.5,s,1);dummy.updateMatrix();leafMatrices.push(dummy.matrix.clone());leafColors.push(new THREE.Color(color).multiplyScalar(rand(.7,1.2)));
  }
  function branch(points,r0,r1){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geo=new THREE.TubeGeometry(curve,10,1,7,false);
    const p=geo.attributes.position,frames=curve.computeFrenetFrames(10,false);
    for(let i=0;i<=10;i++){const center=curve.getPointAt(i/10),radius=THREE.MathUtils.lerp(r0,r1,i/10);
      for(let j=0;j<=7;j++){let a=j/7*Math.PI*2;const v=frames.normals[i].clone().multiplyScalar(-Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius).add(center);p.setXYZ(i*8+j,v.x,v.y,v.z)}
    }geo.computeVertexNormals();branchGeometry.push(geo);
  }
  function tree(x,z,s=1){
    contact(x,z,s*2.6);
    const bend=rand(-.3,.3);
    branch([[x,0,z],[x+.12*s,1.8*s,z],[x+bend*s,3.7*s,z-.16*s],[x+.1*s,5.8*s,z]],.23*s,.035*s);
    for(let k=0;k<8;k++){
      const a=k*2.39996+rand(-.3,.3),h=(2+k*.3)*s,l=rand(1.4,2.5)*s;
      const bx=x+Math.sin(a)*l,bz=z+Math.cos(a)*l,by=h+rand(1,1.8)*s;
      branch([[x,h-.6*s,z],[x+Math.sin(a)*l*.45,h+.1*s,z+Math.cos(a)*l*.45],[bx,by,bz],[bx+Math.sin(a)*.4*s,by+.3*s,bz]],.075*s,.009*s);
      for(let j=0;j<3;j++){
        const aa=a+rand(-1.3,1.3),tx=bx+Math.sin(aa)*s*.75,tz=bz+Math.cos(aa)*s*.75,ty=by+rand(-.1,.8)*s;
        branch([[bx,by-.2*s,bz],[tx,ty,tz]],.023*s,.003*s);
        for(let q=0;q<28;q++){
          const az=random()*Math.PI*2,el=rand(-1,1),rr=Math.cbrt(random())*.9*s;
          leaf(tx+Math.cos(az)*Math.sqrt(1-el*el)*rr,ty+el*rr*.7,tz+Math.sin(az)*Math.sqrt(1-el*el)*rr,rand(.25,.46)*s,k%3?'#a1ae7f':'#b4b085');
        }
      }
    }
    for(let i=0;i<7;i++){let a=i*2.4;branch([[x,rand(.1,.4),z],[x+Math.sin(a)*s*.5,.07,z+Math.cos(a)*s*.5],[x+Math.sin(a)*s,.015,z+Math.cos(a)*s]],.07*s,.008*s)}
  }
  // Trees frame the destinations rather than occupying their approach paths.
  const treeSites=[[-13,-22,1.45],[13,-23,1.55],[-28,-10,1.65],[28,-10,1.6],[-28,19,1.4],[28,23,1.5],[-22,-29,1.6],[24,-30,1.6],[-33,4,1.25],[33,5,1.5]];
  treeSites.forEach(p=>tree(...p));
  for(let i=0;i<17;i++){let a=i*2.39996;tree(Math.sin(a)*rand(46,61),Math.cos(a)*rand(46,61),rand(1.1,1.8))}
  const branches=mergeGeometries(branchGeometry,false);mesh(branches,bark);branchGeometry.forEach(g=>g.dispose());
  // Plant beds: individual fern leaflets, grasses and leaf litter at varied scales.
  const earth=material('#3a4030');earth.bumpMap=grain;earth.bumpScale=.08;
  const beds=[[-11,7,3.7],[20,4,2.8],[-25,7,2.3],[26,17,2.3],[-27,23,3],[-10,-20,2],[11,-23,2]];
  for(let [x,z,r] of beds){
    const bed=floor(r,.022,earth,x,z);bed.scale.z=.66;
    for(let j=0;j<56;j++){
      let a=random()*Math.PI*2,rr=Math.sqrt(random())*r,px=x+Math.sin(a)*rr,pz=z+Math.cos(a)*rr*.65;
      for(let k=0;k<8;k++)leaf(px+rand(-.23,.23),rand(.16,.65),pz+rand(-.23,.23),rand(.25,.65),'#7c9565');
    }
    for(let j=0;j<6;j++){
      let a=j*2.4,fx=x+Math.sin(a)*r*.6,fz=z+Math.cos(a)*r*.4;
      for(let f=0;f<5;f++){
        let angle=f*Math.PI*.4;
        for(let k=1;k<10;k++){let t=k/10,cx=fx+Math.sin(angle)*t*.7,cz=fz+Math.cos(angle)*t*.7,cy=.08+Math.sin(t*Math.PI*.8)*.6;
          for(let side of [-1,1])leaf(cx+Math.cos(angle)*side*.09,cy,cz-Math.sin(angle)*side*.09,(1-t)*.26+.05,'#9da878');
        }
      }
    }
  }
  const leaves=new THREE.InstancedMesh(leafGeo,foliage,leafMatrices.length);
  leafMatrices.forEach((m,i)=>{leaves.setMatrixAt(i,m);leaves.setColorAt(i,leafColors[i])});
  leaves.castShadow=true;leaves.receiveShadow=true;leaves.instanceMatrix.needsUpdate=true;scene.add(leaves);
  const rockGeo=new THREE.SphereGeometry(1,14,10),rp=rockGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const f=1+.09*Math.sin(rp.getX(i)*9)*Math.sin(rp.getY(i)*12);rp.setXYZ(i,rp.getX(i)*f,rp.getY(i)*f,rp.getZ(i)*f)}rockGeo.computeVertexNormals();
  for(let [x,z,r] of beds)for(let i=0;i<5;i++){let a=i*2.4,s=rand(.2,.48);const rock=mesh(rockGeo,stone,x+Math.sin(a)*r,.06,z+Math.cos(a)*r*.65);rock.scale.set(s,s*.6,s*.85);rock.rotation.y=a}
  // Distant rolling contours replace the ring of enormous six-sided cylinders.
  const hills=new THREE.PlaneGeometry(250,250,44,44);hills.rotateX(-Math.PI/2);const hp=hills.attributes.position;
  for(let i=0;i<hp.count;i++){let x=hp.getX(i),z=hp.getZ(i),distance=Math.hypot(x,z);hp.setY(i,-.35+Math.max(0,(distance-42)/13)*(1.6+Math.sin(x*.07)*Math.cos(z*.06)*1.4))}hills.computeVertexNormals();mesh(hills,material('#4c5b4d'));
  for(let i=0;i<12;i++){let a=i*Math.PI/6,x=Math.sin(a)*26,z=Math.cos(a)*26;
    cylinder(.035,.07,1.25,gold,x,.68,z,scene,12);
    const lantern=cylinder(.13,.13,.22,lightmat,x,1.38,z);
    for(let s of [-1,1])cylinder(.015,.015,.27,gold,x+s*.12,1.38,z,scene,8);
    cylinder(.17,.17,.035,gold,x,1.52,z);
    contact(x,z,.45);
  }
  const capTexture=texture((c,n)=>{
    const g=c.createRadialGradient(n*.45,n*.35,0,n*.5,n*.5,n*.7);g.addColorStop(0,'#d0c49c');g.addColorStop(.65,'#99a07d');g.addColorStop(1,'#687658');c.fillStyle=g;c.fillRect(0,0,n,n);
    for(let i=0;i<16000;i++){c.fillStyle=i%3?'rgba(27,44,26,.06)':'rgba(247,224,174,.14)';c.fillRect(random()*n,random()*n,1,rand(1,3))}
    for(let i=0;i<170;i++){let x=random()*n,y=random()*n,r=rand(1,4);c.fillStyle='rgba(226,207,158,.55)';c.beginPath();c.ellipse(x,y,r,r*.55,random()*3,0,Math.PI*2);c.fill()}
    for(let i=0;i<100;i++){c.strokeStyle='rgba(40,56,34,.08)';c.lineWidth=.7;c.beginPath();c.moveTo(random()*n,0);c.bezierCurveTo(random()*n,n*.3,random()*n,n*.65,random()*n,n);c.stroke()}
  });
  const capMat=new THREE.MeshPhysicalMaterial({color:'#b9c89f',map:capTexture,bumpMap:capTexture,bumpScale:.018,roughness:.48,clearcoat:.25,clearcoatRoughness:.45});
  const stemMat=new THREE.MeshStandardMaterial({color:'#d7ceb5',roughness:.61,bumpMap:barkMap,bumpScale:.006});
  const gillMat=material('#af9f7c',.08,.78),jointMat=material('#4b594b',.5,.4);
  const capGeo=new THREE.LatheGeometry([[0,.36],[.1,.36],[.24,.32],[.41,.24],[.54,.12],[.58,.035],[.57,0],[.49,.015],[.35,.06],[.19,.095],[0,.1]].map(p=>new THREE.Vector2(...p)),64);
  const bodyGeo=new THREE.LatheGeometry([[0,0],[.17,0],[.23,.07],[.2,.25],[.15,.48],[.12,.65],[0,.65]].map(p=>new THREE.Vector2(...p)),32);
  const bots=[];
  for(let i=0;i<8;i++){
    const g=new THREE.Group();
    mesh(bodyGeo,stemMat,0,.25,0,g);
    mesh(capGeo,capMat,0,.9,0,g);
    const rim=mesh(new THREE.TorusGeometry(.555,.012,6,64),gold,0,.921,0,g);rim.rotation.x=Math.PI/2;
    // Thin radial underside gills remain visible from the walking camera.
    const gs=[];
    for(let j=0;j<48;j++){
      const a=j*Math.PI/24,geo=new THREE.BoxGeometry(.37,.014,.007);
      geo.translate(.34,0,0);geo.rotateY(a);geo.translate(0,.952,0);gs.push(geo);
    }
    mesh(mergeGeometries(gs,false),gillMat,0,0,0,g);gs.forEach(geo=>geo.dispose());
    const face=mesh(new THREE.SphereGeometry(.155,24,16),dark,0,.64,.142,g);face.scale.set(1,.76,.35);
    for(let s of [-1,1]){
      const eye=mesh(new THREE.SphereGeometry(.018,12,8),lightmat,s*.052,.66,.195,g);eye.scale.y=.65;
      mesh(new THREE.SphereGeometry(.05,12,8),gold,s*.225,.57,0,g);
      tube([[s*.23,.55,0],[s*.29,.4,.02],[s*.27,.32,.09]],.033,stemMat,g);
      const foot=mesh(new THREE.SphereGeometry(.085,16,10),dark,s*.105,.09,.04,g);foot.scale.set(.73,.55,1.4);
      cylinder(.036,.047,.21,jointMat,s*.1,.2,0,g,12);
    }
    const collar=mesh(new THREE.TorusGeometry(.17,.016,6,32),gold,0,.46,0,g);collar.rotation.x=Math.PI/2;
    // Instrument panel on the rear ties the creature to its research job.
    box(.12,.18,.045,dark,0,.61,-.16,g);box(.065,.008,.008,lightmat,0,.65,-.19,g);
    const shadow=mesh(new THREE.PlaneGeometry(1.25,1.25),contactMat,0,-.035,0,g);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
    g.traverse(o=>{if(o.isMesh)o.castShadow=false});g.userData.bot=i;scene.add(g);bots.push(g);hit.push({object:g,id:'bot-'+i});
  }
  // Small mushrooms naturalize the water edge and garden beds.
  for(let i=0;i<32;i++){
    const [x,z,r]=beds[i%beds.length],a=i*2.39996,scale=rand(.17,.38);
    const g=new THREE.Group();g.position.set(x+Math.sin(a)*r*.8,.04,z+Math.cos(a)*r*.5);g.scale.setScalar(scale);g.rotation.z=rand(-.15,.15);scene.add(g);
    mesh(bodyGeo,stemMat,0,.1,0,g);mesh(capGeo,capMat,0,.65,0,g);
  }
  return {dark,gold,ivory,material,mesh,box,bots,hit,sun,leaves,watermat,grain,
    setQuality(low){leaves.castShadow=!low;renderer.shadowMap.enabled=!low;renderer.shadowMap.needsUpdate=true},
    update(time,reduced){if(!reduced){watermat.bumpMap.offset.x=time*.000002;watermat.bumpMap.offset.y=time*.000001}}
  };
}
