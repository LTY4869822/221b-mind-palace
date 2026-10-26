import * as THREE from "three";
import { createRenderer, disposeScene } from "./webgl-utils";
import type { DetectiveMode } from "./DetectiveArtifacts";

type Point = [number, number];
type Actor = { mode: DetectiveMode; mesh: THREE.SkinnedMesh; material: THREE.MeshBasicMaterial; mixer: THREE.AnimationMixer; bones: THREE.Bone[]; blink: THREE.IUniform<number>; lift: THREE.IUniform<number>; time: THREE.IUniform<number> };
const smooth = THREE.MathUtils.smoothstep;
const asset = (name: string) => `${import.meta.env.BASE_URL}media/${name}`;
const point = (u: number, v: number) => new THREE.Vector3(u - .5, .75 - v * 1.5, 0);
const hand: Point[] = [[.645,.236],[.717,.216],[.76,.25],[.765,.292],[.785,.32],[.793,.381],[.761,.438],[.711,.424],[.674,.371],[.655,.312]];

function polygonWeight(x: number, y: number, polygon: Point[]) {
  let inside = false, distance = 1;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    const dx=b[0]-a[0],dy=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
    distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));
  }
  return smooth(inside?distance:-distance,-.012,.012);
}

function actor(mode: DetectiveMode, texture: THREE.Texture, blinkTexture: THREE.Texture): Actor {
  const geometry = new THREE.PlaneGeometry(1, 1.5, 72, 108);
  const root=new THREE.Bone(); root.name="Root";
  const bones=[root];
  const bone=(name:string,u:number,v:number,parent=root)=>{
    const b=new THREE.Bone();b.name=name;
    b.position.copy(point(u,v));
    if(parent!==root) b.position.sub(point(mode==="conan"?.738:parent.name.includes("Left")?.22:.79,mode==="conan"?.405:.34));
    parent.add(b);bones.push(b);return b;
  };
  if(mode==="conan") {
    const elbow=bone("ConanElbow",.738,.405);
    bone("ConanWrist",.711,.316,elbow);
    bone("ConanHead",.505,.31);
  } else {
    const left=bone("LeftCape",.22,.34),right=bone("RightCape",.79,.34);
    bone("LeftHem",.22,.65,left);bone("RightHem",.79,.65,right);
  }
  const positions=geometry.attributes.position;
  const indices:number[]=[],weights:number[]=[],cloth:number[]=[];
  for(let i=0;i<positions.count;i++) {
    const u=positions.getX(i)+.5,v=.5-positions.getY(i)/1.5;
    if(mode==="conan") {
      const arm=polygonWeight(u,v,hand)*.98;
      const wrist=arm*(1-smooth(v,.305,.355))*.72;
      const head=(1-arm)*(1-smooth(Math.hypot((u-.51)/.31,(v-.165)/.166),.86,1.04))*.6;
      indices.push(0,1,2,3);weights.push(1-arm-head,arm-wrist,wrist,head);cloth.push(0);
    } else {
      const lower=smooth(v,.29,.78),left=1-smooth(u,.28,.415),right=smooth(u,.69,.81);
      const handProtect=1-(smooth(u,.54,.58)*(1-smooth(u,.69,.73))*smooth(v,.47,.52)*(1-smooth(v,.79,.83)));
      const cw=Math.max(left,right)*lower*handProtect;
      const hem=smooth(v,.57,.88)*.8;
      indices.push(0,u<.5?1:2,u<.5?3:4,0);weights.push(1-cw,cw*(1-hem),cw*hem,0);cloth.push(cw);
    }
  }
  geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(indices,4));
  geometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));
  geometry.setAttribute("capeWeight",new THREE.Float32BufferAttribute(cloth,1));
  const time={value:0},blink={value:0},lift={value:0};
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
  material.onBeforeCompile=(shader)=>{
    Object.assign(shader.uniforms,{uRigTime:time,uBlink:blink,uGlassesLift:lift,uBlinkMap:{value:blinkTexture}});
    shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nattribute float capeWeight; uniform float uRigTime; varying vec2 vRigUv;")
      .replace("#include <begin_vertex>","#include <begin_vertex>\nvRigUv=uv;")
      .replace("#include <skinning_vertex>",`#include <skinning_vertex>
        float wind=sin(uRigTime*1.12+uv.y*8.0)*.010+sin(uRigTime*1.83-uv.y*12.0)*.004;
        transformed.x+=wind*capeWeight*pow(1.-uv.y,1.4);
        transformed.y+=sin(uRigTime*1.4+uv.x*9.+uv.y*13.)*.0025*capeWeight;
      `);
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nuniform sampler2D uBlinkMap; uniform float uBlink; uniform float uGlassesLift; varying vec2 vRigUv;")
      .replace("#include <map_fragment>",`
        vec2 q=vec2(vRigUv.x,1.-vRigUv.y);
        float glasses=(1.-smoothstep(.8,1.,length((q-vec2(.52,.225))/vec2(.16,.064))));
        vec2 sampleUv=vMapUv+vec2(0.,-uGlassesLift*glasses);
        vec4 sampledDiffuseColor=texture2D(map,sampleUv);
        float eyeA=1.-smoothstep(.84,1.,length((q-vec2(.462,.214))/vec2(.068,.041)));
        float eyeB=1.-smoothstep(.84,1.,length((q-vec2(.593,.237))/vec2(.051,.034)));
        sampledDiffuseColor=mix(sampledDiffuseColor,texture2D(uBlinkMap,sampleUv),uBlink*max(eyeA,eyeB));
        diffuseColor*=sampledDiffuseColor;
      `);
  };
  material.customProgramCacheKey=()=>"detective-character-rig-v5";
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.add(root);mesh.bind(new THREE.Skeleton(bones));mesh.frustumCulled=false;
  const mixer=new THREE.AnimationMixer(mesh);
  const track=(name:string,times:number[],values:number[])=>new THREE.NumberKeyframeTrack(name,times,values,THREE.InterpolateSmooth);
  const tracks:THREE.KeyframeTrack[]=[];
  if(mode==="conan") {
    const t=Array.from({length:69},(_,i)=>i*.1);
    const raised=(s:number)=>smooth(s,.9,1.95)*(1-smooth(s,2.5,3.3));
    const push=(s:number)=>smooth(s,1.95,2.17)*(1-smooth(s,2.25,2.5));
    tracks.push(track("ConanElbow.rotation[z]",t,t.map(s=>-.2+raised(s)*.23+push(s)*.012)));
    tracks.push(track("ConanWrist.rotation[z]",t,t.map(s=>.035-raised(s)*.08-push(s)*.018)));
    tracks.push(track("ConanHead.rotation[z]",t,t.map(s=>raised(s)*-.007)));
  } else {
    const t=Array.from({length:25},(_,i)=>i*10/24);
    for(const [name,phase,amplitude] of [["LeftCape",0,.013],["RightCape",1.4,.018],["LeftHem",.6,.034],["RightHem",2.3,.045]] as const)
      tracks.push(track(`${name}.rotation[z]`,t,t.map(s=>Math.sin(s*Math.PI/5+phase)*amplitude+Math.sin(s*Math.PI/2.5+phase)*amplitude*.28)));
  }
  mixer.clipAction(new THREE.AnimationClip(mode==="conan"?"AdjustGlasses":"CapeWind",mode==="conan"?6.8:10,tracks)).play();
  return {mode,mesh,material,mixer,bones,blink,lift,time};
}

function blinkAt(time:number) {
  const t=time%6.8;
  return smooth(t,1.94,2.035)*(1-smooth(t,2.085,2.23))+smooth(t,5.25,5.32)*(1-smooth(t,5.36,5.49));
}

/** One canvas for both actors. All bones share one clock; React is never updated per frame. */
export function mountCharacterRig(host:HTMLDivElement,reduced:boolean) {
  let alive=true,ready=false,inView=true,paused=false,time=0,last=0,frame=0,sampleUntil=0;
  let needsBounds=true,renderTotal=0,renderCount=0;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,20);camera.position.z=5;
  const renderer=createRenderer(host,false);renderer.toneMapping=THREE.NoToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.15:1.4));
  const parent=host.parentElement!;
  const anchors=[...parent.querySelectorAll<HTMLElement>("[data-character-actor]")];
  const actors:Actor[]=[];const textures:THREE.Texture[]=[];
  const intervals:number[]=[];
  const query=new URLSearchParams(location.search),frozen=query.get("characterTime");
  const fixed=frozen!==null&&Number.isFinite(Number(frozen))?Math.max(0,Number(frozen)):null;
  const resize=()=>{
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h);camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();needsBounds=true;
    if(ready&&(paused||reduced||fixed!==null))render(0);
  };
  const bounds=()=>{
    const root=host.getBoundingClientRect();
    const readings=anchors.map(a=>({rect:a.getBoundingClientRect(),opacity:Number(getComputedStyle(a.closest(".cinema-person")||a).opacity)}));
    readings.forEach(({rect:r,opacity},i)=>{
      const a=actors[i];if(!a)return;
      const imageWidth=Math.min(r.width,r.height*2/3);
      a.mesh.scale.setScalar(imageWidth);
      a.mesh.position.set(r.left-root.left+r.width/2-root.width/2,root.height/2-(r.bottom-root.top-imageWidth*.75),0);
      a.material.opacity=opacity;a.mesh.visible=opacity>.015;
    });
    needsBounds=false;
  };
  function render(delta:number) {
    if(!alive||!ready)return;
    const start=performance.now();
    if(needsBounds||start<sampleUntil)bounds();
    if(!paused&&!reduced&&fixed===null)time+=Math.min(delta,.045);
    const t=fixed??(reduced?0:time);
    for(const a of actors) {
      a.mixer.setTime(t);a.time.value=t;
      a.blink.value=a.mode==="conan"?blinkAt(t):0;
      const phase=t%6.8;a.lift.value=a.mode==="conan"?smooth(phase,1.85,2.13)*(1-smooth(phase,2.38,2.72))*.0025:0;
    }
    renderer.render(scene,camera);
    const cost=performance.now()-start;
    if(frame>5){renderTotal+=cost;renderCount++;}
    if(frame===0)host.dataset.firstRenderMs=cost.toFixed(2);
    frame++;
    if(frame%20===0||paused||reduced||fixed!==null) {
      const c=actors.find(a=>a.mode==="conan"),h=actors.find(a=>a.mode==="holmes");
      host.dataset.time=t.toFixed(3);host.dataset.frame=String(frame);host.dataset.blink=String(c?.blink.value.toFixed(3)??0);
      host.dataset.arm=String(c?.bones[1].rotation.z.toFixed(4)??0);host.dataset.cape=String(h?.bones[4].rotation.z.toFixed(4)??0);
      if(renderCount)host.dataset.renderMs=(renderTotal/renderCount).toFixed(2);
      host.dataset.drawCalls=String(renderer.info.render.calls);host.dataset.geometries=String(renderer.info.memory.geometries);host.dataset.textures=String(renderer.info.memory.textures);
      if(intervals.length>30) {const s=[...intervals].sort((a,b)=>a-b);host.dataset.frameP95=s[Math.floor(s.length*.95)].toFixed(1);}
    }
  }
  const loop=(stamp:number)=>{
    const dt=last?(stamp-last)/1000:0;
    if(last&&dt<.2) {intervals.push(dt*1000);if(intervals.length>180)intervals.shift();}
    last=stamp;render(dt);
  };
  const restart=()=>{
    paused=document.documentElement.dataset.paused==="true";
    last=0;
    if(!ready)return;
    const running=!paused&&!reduced&&fixed===null&&!document.hidden&&inView;
    host.dataset.playing=String(running);
    if(running)renderer.setAnimationLoop(loop);else{renderer.setAnimationLoop(null);render(0);}
  };
  const ro=new ResizeObserver(resize);ro.observe(host);
  const replay=()=>{time=0;sampleUntil=performance.now()+1250;needsBounds=true;render(0);restart();};
  host.addEventListener("character:replay",replay);
  const io=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;restart();});io.observe(host);
  const preferences=new MutationObserver(restart);preferences.observe(document.documentElement,{attributes:true,attributeFilter:["data-paused"]});
  const focusObserver=new MutationObserver(()=>{sampleUntil=performance.now()+1250;needsBounds=true;if(paused||reduced||fixed!==null)requestAnimationFrame(()=>render(0));});
  focusObserver.observe(parent.closest(".character-cinema")||parent,{attributes:true,attributeFilter:["class"]});
  const scroll=()=>{needsBounds=true;if(paused||reduced||fixed!==null)render(0);};
  document.querySelector("main")?.addEventListener("scroll",scroll,{passive:true});
  document.addEventListener("visibilitychange",restart);
  const lost=(e:Event)=>{e.preventDefault();host.dataset.status="fallback";parent.dataset.rigReady="false";renderer.setAnimationLoop(null);};
  renderer.domElement.addEventListener("webglcontextlost",lost);
  const loader=new THREE.TextureLoader();
  const textureWidth=(mode:DetectiveMode)=>{
    const r=anchors.find(a=>a.dataset.characterActor===mode)?.getBoundingClientRect();
    const pixels=r?Math.min(r.width,r.height*2/3)*renderer.getPixelRatio():512;
    return [512,768,1024].find(size=>size>=pixels)||1024;
  };
  const load=async(name:string)=>{
    const t:THREE.Texture<HTMLImageElement|ImageBitmap>=await loader.loadAsync(asset(name));
    const width=textureWidth(name.startsWith("conan")?"conan":"holmes");
    if(width<1024&&typeof createImageBitmap!=="undefined") {
      try {t.image=await createImageBitmap(t.image,{resizeWidth:width,resizeHeight:width*1.5,resizeQuality:"high",imageOrientation:"flipY",premultiplyAlpha:"none",colorSpaceConversion:"none"});t.needsUpdate=true;}
      catch { /* Keep the source texture when bitmap resizing is unavailable. */ }
    }
    t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    if(!alive){if(typeof ImageBitmap!=="undefined"&&t.image instanceof ImageBitmap)t.image.close();t.dispose();return null;}
    textures.push(t);return t;
  };
  const modes=anchors.map(a=>a.dataset.characterActor as DetectiveMode);
  void Promise.all([modes.includes("holmes")?load("holmes-cinematic-v4.webp"):null,modes.includes("conan")?load("conan-cinematic-v4.webp"):null,modes.includes("conan")?load("conan-blink-v5.webp"):null]).then(async([holmes,conan,blink])=>{
    if(!alive)return;
    anchors.forEach((anchor,i)=>{const mode=anchor.dataset.characterActor as DetectiveMode;const map=mode==="holmes"?holmes:conan;if(!map)return;const a=actor(mode,map,blink||map);a.mesh.renderOrder=i;actors.push(a);scene.add(a.mesh);});
    resize();
    await renderer.compileAsync(scene,camera);
    if(!alive)return;
    ready=true;render(0);parent.dataset.rigReady="true";host.dataset.status="ready";restart();
  }).catch(()=>{if(alive){host.dataset.status="fallback";parent.dataset.rigReady="false";renderer.setAnimationLoop(null);}});
  resize();
  return ()=>{
    alive=false;ready=false;renderer.setAnimationLoop(null);host.removeEventListener("character:replay",replay);ro.disconnect();io.disconnect();preferences.disconnect();focusObserver.disconnect();
    document.removeEventListener("visibilitychange",restart);document.querySelector("main")?.removeEventListener("scroll",scroll);renderer.domElement.removeEventListener("webglcontextlost",lost);
    actors.forEach(a=>{a.mixer.stopAllAction();a.mixer.uncacheRoot(a.mesh);a.mesh.skeleton.dispose();});
    disposeScene(scene);textures.forEach(t=>{if(typeof ImageBitmap!=="undefined"&&t.image instanceof ImageBitmap)t.image.close();t.dispose();});renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();delete parent.dataset.rigReady;
  };
}
