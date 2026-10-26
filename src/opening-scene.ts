import * as THREE from "three";
import { openingVertexShader, openingFragmentShader } from "./opening-shaders";
import { advanceConanTime, clamp, conanEyeMask, conanPerformanceAt, createScatterSpring, createFormationTween, formationTravel, OPENING_EXIT_MS, performanceAt, portraitBinding, retargetFormation, smooth, stepFormation, stepScatter } from "./opening-character-motion";
import { glyphFlight, pairFlowPoints } from "./opening-flow";
import { buildOpeningGlobeRoute, unitGlobePoint } from "./opening-globe";
import { createOpeningGlobeSurface } from "./opening-globe-surface";
import { WORLD_TIMELINE, worldFraming, worldRibbonPoint, worldStage } from "./opening-world-motion";

type OpeningOptions = { reduced: boolean; onReady?: () => void; onFormed?: (visible: boolean) => void; onPhase?: (phase: string) => void };
type Sample = { x: number; y: number; brightness: number; closed: number; eye: number; edge: number; binding: [number, number, number, number] };
type CharacterSamples = { kind: number; samples: Sample[] };

const portraitGlyphs = ["0", "1", ":", "+", "/", "≈", "·", "=", "—", "7", "2", "B", "4", "8", "6", "9"];
const rainGlyphs = Array.from("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ{}");
const glyphs = [...portraitGlyphs,...rainGlyphs];
const atlasColumns=8,atlasRows=Math.ceil(glyphs.length/atlasColumns);
const asset = (name: string) => `${import.meta.env.BASE_URL}media/${name}`;

/** Original, locally editable ASCII optics. All glyphs share one atlas and one draw. */
export function mountOpeningScene(host: HTMLElement, options: OpeningOptions): () => void {
  let disposed = false;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
  } catch {
    host.dataset.status = "fallback";
    options.onReady?.();
    return () => { disposed = true; };
  }

  host.dataset.status = "loading";
  host.dataset.playing = "false";
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
  renderer.setClearColor(0x050d17, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  host.appendChild(canvas);

  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = atlasColumns*32;
  atlasCanvas.height = atlasRows*32;
  const atlasContext = atlasCanvas.getContext("2d")!;
  atlasContext.font = '23px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  atlasContext.textAlign = "center";
  atlasContext.textBaseline = "middle";
  atlasContext.fillStyle = "white";
  glyphs.forEach((glyph,index)=>{
    // Portrait glyphs retain their original weight; rain gets a crisp luminous face.
    atlasContext.font=index<portraitGlyphs.length
      ?'600 24px "SFMono-Regular", Consolas, "Liberation Mono", monospace'
      :'600 25px Consolas, "Liberation Mono", monospace';
    atlasContext.shadowBlur=index<portraitGlyphs.length?0:3;
    atlasContext.shadowColor="rgba(255,255,255,.55)";
    atlasContext.fillText(glyph,(index%atlasColumns)*32+16,Math.floor(index/atlasColumns)*32+17);
  });
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.minFilter = THREE.LinearFilter;
  atlas.magFilter = THREE.LinearFilter;
  atlas.generateMipmaps = false;
  atlas.colorSpace = THREE.NoColorSpace;

  const uniforms = {
    uAtlas: { value: atlas },
    uAtlasGrid: { value: new THREE.Vector2(atlasColumns,atlasRows) },
    uRainGlyphCount: { value: rainGlyphs.length },
    uRainRows: { value: 60 },
    uTime: { value: 0 },
    uViewport: { value: new THREE.Vector2(1280, 720) },
    uDpr: { value: 1 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPointerPower: { value: 0 },
    uPulse: { value: -100 },
    uExit: { value: 0 },
    uMobile: { value: 0 },
    uReduced: { value: options.reduced ? 1 : 0 },
    uConanPose: { value: new THREE.Vector4() },
    uHolmesPose: { value: new THREE.Vector4() },
    uHem: { value: new THREE.Vector2() },
    uScatter: { value: new THREE.Vector2() },
    uScatterLeftOrigin: { value: new THREE.Vector2() },
    uScatterRightOrigin: { value: new THREE.Vector2() },
    uLayout: { value: new THREE.Vector4() },
    uAnchors: { value: new THREE.Vector2() },
    uMorph: { value: 0 },
    uForming: { value: 0 },
    uFlowTime: { value: 0 },
    uRainTime: { value: 0 },
    uWorld: { value: 0 },
    uWorldRotation: { value: new THREE.Vector2(58*Math.PI/180,33*Math.PI/180) },
    uWorldLayout: { value: new THREE.Vector3() },
    uArrival: { value: 0 },
    uQuietAreas: { value: Array.from({length:5},()=>new THREE.Vector4()) },
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms,
    vertexShader: openingVertexShader,
    fragmentShader: openingFragmentShader,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  let geometry = new THREE.BufferGeometry();
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const globeSurface=createOpeningGlobeSurface(uniforms,()=>{
    if(!disposed&&!running&&!document.hidden)render(performance.now());
  });
  scene.add(globeSurface.object);

  // Coastlines, graticules and the two-city thread share the glyph camera and
  // unit-space rotation. These are strokes, never a second world renderer.
  const lineVertex=`
    uniform vec2 uViewport,uWorldRotation;
    uniform vec3 uWorldLayout;
    attribute float aPhase;
    uniform float uWorld,uExit;
    varying float vFacing,vPhase;
    void main(){
      float a=uWorldRotation.x,b=uWorldRotation.y;
      float x=position.x*cos(a)-position.z*sin(a);
      float z=position.x*sin(a)+position.z*cos(a);
      vec3 q=vec3(x,position.y*cos(b)-z*sin(b),position.y*sin(b)+z*cos(b));
      vec2 p=uWorldLayout.xy+vec2(q.x,-q.y)*uWorldLayout.z;
      vec2 centre=uViewport*vec2(.57,.52);
      p=centre+(p-centre)/(1.-uExit*.64);
      vFacing=smoothstep(-.015,.07,q.z);
      vPhase=aPhase;
      gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0.,1.);
    }`;
  const lineFragment=`
    uniform vec3 uInk;
    uniform vec2 uStage;
    uniform float uWorld,uLineOpacity,uExit,uRoute;
    varying float vFacing,vPhase;
    void main(){
      float reveal=smoothstep(uStage.x,uStage.y,uWorld);
      // The story thread writes from London to Tokyo after land has developed.
      float pen=reveal*1.035;
      float thread=1.-smoothstep(pen-.025,pen+.008,vPhase);
      reveal*=mix(1.,thread,uRoute);
      float opacity=vFacing*reveal*uLineOpacity*(1.-smoothstep(.45,1.,uExit));
      if(opacity<.003)discard;
      gl_FragColor=vec4(uInk,opacity);
    }`;
  const globeStrokes:{geometry:THREE.BufferGeometry;material:THREE.ShaderMaterial;object:THREE.LineSegments}[]=[];
  function addGlobeStrokes(positions:Float32Array,ink:number,opacity:number,stage:readonly [number,number],isRoute=false) {
    const strokeGeometry=new THREE.BufferGeometry();
    strokeGeometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
    const phase=new Float32Array(positions.length/3);
    if(isRoute)for(let index=0;index<phase.length;index++)phase[index]=(Math.floor(index/2)+index%2)/(phase.length/2);
    strokeGeometry.setAttribute("aPhase",new THREE.BufferAttribute(phase,1));
    const strokeMaterial=new THREE.ShaderMaterial({
      transparent:true,depthTest:false,depthWrite:false,
      uniforms:{uViewport:uniforms.uViewport,uWorldRotation:uniforms.uWorldRotation,uWorldLayout:uniforms.uWorldLayout,uWorld:uniforms.uWorld,uExit:uniforms.uExit,
        uInk:{value:new THREE.Color(ink)},uLineOpacity:{value:opacity},uStage:{value:new THREE.Vector2(...stage)},uRoute:{value:isRoute?1:0}},
      vertexShader:lineVertex,fragmentShader:lineFragment,
    });
    const strokes=new THREE.LineSegments(strokeGeometry,strokeMaterial);
    strokes.frustumCulled=false;strokes.visible=false;
    strokes.renderOrder=isRoute?3:2;
    scene.add(strokes);globeStrokes.push({geometry:strokeGeometry,material:strokeMaterial,object:strokes});
  }
  addGlobeStrokes(buildOpeningGlobeRoute(),0xe3cb98,.76,WORLD_TIMELINE.route,true);

  let width = 0;
  let height = 0;
  let mobile = false;
  const characters: CharacterSamples[] = [];
  const random = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function layout() {
    const holmesTop=height*.16+218,conanTop=height*.45+116;
    const holmesHeight=mobile?Math.min(height*.55,width*1.12,height*.92-holmesTop):Math.min(780,height*.83,width*.68);
    const conanHeight=mobile?Math.min(height*.34,width*.76,height*.915-conanTop):Math.min(440,height*.48,width*.38);
    return {holmesHeight,conanHeight,holmesX:width*(mobile?.23:.245),conanX:width*(mobile?.78:.805),holmesY:mobile?holmesTop+holmesHeight*.5:height*.535,conanY:mobile?conanTop+conanHeight*.5:height*.705};
  }
  function worldLayout(progress=uniforms.uWorld.value) {
    return worldFraming(width,height,progress);
  }
  function rebuild() {
    if (disposed || !width || !height) return;
    const positions:number[]=[],styles:number[]=[],bindings:number[]=[],luminance:number[]=[],rain:number[]=[],streams:number[]=[],paths:number[]=[],timings:number[]=[];
    const visibleSamples=(character:CharacterSamples)=>character.samples.filter(sample=>!mobile || !(Math.floor((sample.x+.5)*(character.kind===2?100:80))%2 || Math.floor((sample.y+.5)*(character.kind===2?150:120))%2));
    const conan=characters.find(character=>character.kind===3);
    const conanSamples=conan?visibleSamples(conan):[];
    const columns=Math.ceil(width/(mobile?12:13));
    const rows=Math.max(Math.ceil(height/(mobile?14:15)),Math.ceil(conanSamples.length*1.45/columns));
    const cells:{value:number[];order:number}[]=[];
    for(let column=0;column<columns;column++) {
      const depth=random(column*19+71),speed=random(column*31+43);
      for(let row=0;row<rows;row++) cells.push({value:[(column+.5)/columns,(row+.5)/rows,depth,speed],order:random(column+1031)+row/rows*.00001});
    }
    // Gather whole, seeded columns so the remaining rain keeps continuous tails.
    cells.sort((a,b)=>a.order-b.order);
    const composition=layout();
    const sources=cells.slice(0,conanSamples.length).map((cell,index)=>({x:cell.value[0]*width,y:cell.value[1]*height,index}));
    const destinations=conanSamples.map(sample=>({x:composition.conanX+sample.x*.667*composition.conanHeight,y:composition.conanY+sample.y*composition.conanHeight,sample}));
    const assignments=new Map(pairFlowPoints(sources,destinations).map(([source,target])=>[source.index,target]));
    let travelDistance=0;
    const add=(x:number,y:number,kind:number,seed:number,cell:number[],sample?:Sample)=>{
      positions.push(x,y,0);
      styles.push(kind,Math.floor(seed*rainGlyphs.length),1,seed);
      bindings.push(...(sample?.binding??[0,0,0,0]));
      luminance.push(...(sample?[sample.brightness,sample.closed,sample.eye,sample.edge]:[0,0,0,0]));
      rain.push(...cell);
      const column=cell[2];
      streams.push(1.18+random(column*17)*.38,random(column*91),.32+random(column*43)*.48,.105+cell[3]*.145);
      if(sample && kind===3) {
        const from={x:cell[0]*width,y:cell[1]*height};
        const to={x:composition.conanX+sample.x*.667*composition.conanHeight,y:composition.conanY+sample.y*composition.conanHeight};
        const feature=clamp(sample.edge*.68+sample.binding[2]*.27+sample.eye*.6);
        const priority=clamp(feature*.7+(1-(sample.y+.5))*.3);
        const flight=glyphFlight(from,to,composition.conanHeight,priority,seed);
        paths.push(...flight.controls);timings.push(...flight.timing);
        travelDistance+=Math.hypot(to.x-from.x,to.y-from.y);
      } else {paths.push(0,0,0,0);timings.push(0,1);}
    };
    cells.forEach((cell,index)=>{
      const sample=assignments.get(index)?.sample;
      add(sample?.x??0,sample?.y??0,sample?3:0,random(index+7167),cell.value,sample);
    });
    const holmes=characters.find(character=>character.kind===2);
    if(holmes) visibleSamples(holmes).forEach((sample,index)=>add(sample.x,sample.y,2,random(index+4321),[0,0,0,0],sample));
    const next=new THREE.BufferGeometry();
    next.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    next.setAttribute("aStyle",new THREE.Float32BufferAttribute(styles,4));
    next.setAttribute("aRig",new THREE.Float32BufferAttribute(bindings,4));
    next.setAttribute("aLuma",new THREE.Float32BufferAttribute(luminance,4));
    next.setAttribute("aRain",new THREE.Float32BufferAttribute(rain,4));
    next.setAttribute("aStream",new THREE.Float32BufferAttribute(streams,4));
    next.setAttribute("aPath",new THREE.Float32BufferAttribute(paths,4));
    next.setAttribute("aFlight",new THREE.Float32BufferAttribute(timings,2));
    const shellAttributes=new Float32Array(positions.length);
    // Keep each original column intact: adjacent rows now share a meridian,
    // rather than being independently assigned to scattered Fibonacci dots.
    cells.forEach((cell,index)=>shellAttributes.set(worldRibbonPoint(cell.value[0],cell.value[1]),index*3));
    next.setAttribute("aShell",new THREE.BufferAttribute(shellAttributes,3));
    points.geometry=next;
    geometry.dispose();
    geometry=next;
    host.dataset.geometryId=geometry.uuid;
    host.dataset.particles=String(positions.length/3);
    host.dataset.rainParticles=String(cells.length);
    host.dataset.morphParticles=String(conanSamples.length);
    host.dataset.rainStyle="matrix-blue-streams";
    host.dataset.flow="spatial-bezier";
    host.dataset.meanTravel=(travelDistance/Math.max(1,conanSamples.length)).toFixed(1);
    host.dataset.rainColumns=String(columns);
    host.dataset.rainRows=String(rows);
    host.dataset.worldGlyphs=String(cells.length);
    host.dataset.worldTransport="ordered-meridian-ribbons";
    uniforms.uRainRows.value=rows;
  }

  let running = false;
  let failed = false;
  let onScreen = true;
  let lastFrame = performance.now();
  let elapsed = 0;
  let flowTime = 0;
  let rainTime = 0;
  let worldTarget = 0;
  let worldProgress = 0;
  let worldLongitude = 58,worldLatitude = 33;
  let worldLongitudeTarget = 58,worldLatitudeTarget = 33;
  let lastCitySignature = "";
  let lastPublishedWorld = -1;
  let conanTime = 0;
  let frames = 0;
  let exit = 0;
  let exitStarted: number | null = null;
  let pointerPower = 0;
  let targetPower = 0;
  const frameIntervals: number[] = [];
  const submitTimes: number[] = [];
  const pointer = new THREE.Vector2();
  const targetPointer = new THREE.Vector2();
  const scatter = [createScatterSpring(), createScatterSpring()];
  const formation = createFormationTween();
  let reportedFormation = 0;
  let arrivalSettled = false;
  let lastPhase = "";
  let lastDiagnostics = 0;
  let lastMetrics = 0;
  const scatterOrigins = [new THREE.Vector2(), new THREE.Vector2()];
  const scatterOriginTargets = [new THREE.Vector2(), new THREE.Vector2()];
  let hostDocumentX = 0, hostDocumentY = 0;
  const frozenValue = new URLSearchParams(window.location.search).get("openingTime");
  const frozenTime = frozenValue !== null && Number.isFinite(Number(frozenValue)) ? Math.max(0,Number(frozenValue)) : null;
  const systemMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const systemReduced = () => options.reduced || systemMotion.matches;
  const isReduced = () => systemReduced() || document.documentElement.dataset.paused === "true";
  const shouldRun = () => !disposed && !failed && onScreen && !document.hidden && !isReduced() && frozenTime===null;

  function render(now: number) {
    if (disposed || failed) return;
    const frameInterval = now-lastFrame;
    const wallDelta = Math.max(0,frameInterval/1000);
    const delta = Math.min(wallDelta,.2);
    lastFrame = now;
    // Choreography follows real time even if an embedded/occluded tab throttles RAF.
    // Interaction smoothing remains bounded; pose time never slows down with RAF.
    if (running) elapsed += wallDelta;
    const t = frozenTime ?? elapsed;
    if(isReduced() || t>=1.8) arrivalSettled=true;
    uniforms.uArrival.value=arrivalSettled?1:smooth(t,.15,1.8);
    uniforms.uTime.value = t;
    uniforms.uReduced.value = systemReduced() ? 1 : 0;
    // Pausing stops the film clock, not explicit scroll/city/keyboard navigation.
    // A demand render settles those targets immediately without starting a loop.
    const settleWorld=isReduced() || frozenTime!==null;
    if(running || settleWorld) {
      const worldDamping=1-Math.exp(-delta*12);
      worldProgress=settleWorld?worldTarget:worldProgress+(worldTarget-worldProgress)*worldDamping;
      if(Math.abs(worldTarget-worldProgress)<.0001)worldProgress=worldTarget;
      const rotationDamping=1-Math.exp(-delta*8);
      worldLongitude=settleWorld?worldLongitudeTarget:worldLongitude+(worldLongitudeTarget-worldLongitude)*rotationDamping;
      worldLatitude=settleWorld?worldLatitudeTarget:worldLatitude+(worldLatitudeTarget-worldLatitude)*rotationDamping;
      if(Math.abs(worldLongitudeTarget-worldLongitude)<.001)worldLongitude=worldLongitudeTarget;
      if(Math.abs(worldLatitudeTarget-worldLatitude)<.001)worldLatitude=worldLatitudeTarget;
    }
    uniforms.uWorld.value=worldProgress;
    const framing=worldLayout(worldProgress);
    uniforms.uWorldLayout.value.set(framing.x,framing.y,framing.radius);
    const orbitalArrival=1-worldStage(worldProgress,.16,.84);
    uniforms.uWorldRotation.value.set((worldLongitude-11*orbitalArrival)*Math.PI/180,(worldLatitude+8*orbitalArrival)*Math.PI/180);
    if(lastPublishedWorld<0 || Math.abs(worldProgress-lastPublishedWorld)>=.0005 || (worldProgress!==lastPublishedWorld && (worldProgress===0 || worldProgress===1))){
      lastPublishedWorld=worldProgress;
      host.dispatchEvent(new CustomEvent<number>('opening:world-progress',{detail:worldProgress}));
    }
    globeSurface.update(worldProgress);
    globeStrokes.forEach(stroke=>{stroke.object.visible=worldProgress>stroke.material.uniforms.uStage.value.x;});
    const atRain=worldTarget<=.0001&&worldProgress<=.0001;
    // Rain heads gently decelerate while their columns bend. No sudden frozen
    // frame on the first scroll tick, and no wrap jumps after the sphere closes.
    if(running)rainTime+=wallDelta*(1-worldStage(worldProgress,0,.48));
    if(running && atRain) {
      const previousTravel=uniforms.uMorph.value;
      const remainingDuration=Math.max(0,formation.duration-formation.elapsed);
      const movingDelta=Math.min(wallDelta,remainingDuration);
      const nextTravel=formationTravel(stepFormation(formation,wallDelta));
      uniforms.uMorph.value=nextTravel;
      // Integrate the moving and already-arrived parts separately, so a long
      // frame cannot spend its full delta inside the short handoff interval.
      conanTime=advanceConanTime(conanTime,previousTravel,nextTravel,movingDelta);
      conanTime=advanceConanTime(conanTime,nextTravel,nextTravel,wallDelta-movingDelta);
      // The collected columns decelerate their own clock, never rewinding or jumping
      // to the background clock when the user reverses the formation.
      flowTime+=wallDelta*(1-smooth(formation.value,0,.28));
    }
    uniforms.uRainTime.value=rainTime;
    uniforms.uFlowTime.value=flowTime;
    // Lock only the travelling Conan glyphs; rain and Holmes remain interactive.
    uniforms.uForming.value=atRain && (formation.value!==formation.target || formation.velocity!==0)?1:0;
    const pose = performanceAt(t, systemReduced());
    const conanPose=conanPerformanceAt(conanTime,systemReduced());
    uniforms.uConanPose.value.set(conanPose.elbow,conanPose.wrist,conanPose.head,conanPose.blink);
    uniforms.uHolmesPose.value.set(pose.gaze,pose.inspection,pose.capeLeft,pose.capeRight);
    uniforms.uHem.value.set(pose.hemLeft,pose.hemRight);
    if (running) {
      uniforms.uScatter.value.set(stepScatter(scatter[0],wallDelta),stepScatter(scatter[1],wallDelta));
      for (let index=0;index<2;index++) {
        if(scatter[index].target>.03) scatterOrigins[index].lerp(scatterOriginTargets[index],1-Math.exp(-wallDelta*18));
      }
    }
    uniforms.uScatterLeftOrigin.value.copy(scatterOrigins[0]);
    uniforms.uScatterRightOrigin.value.copy(scatterOrigins[1]);
    const damping = 1-Math.exp(-delta*7);
    pointer.lerp(targetPointer,damping);
    pointerPower += (targetPower-pointerPower)*damping;
    uniforms.uPointer.value.copy(pointer);
    uniforms.uPointerPower.value = isReduced() ? 0 : pointerPower;
    const travel=uniforms.uMorph.value;
    const phase=travel<.002?"rain":travel<.32?"gather":travel<.73?"trace":travel<1?"develop":"formed";
    if(phase!==lastPhase) {
      lastPhase=phase;host.dataset.phase=phase;options.onPhase?.(phase);
    }
    if(formation.value===formation.target && formation.velocity===0 && reportedFormation!==formation.target) {
      reportedFormation=formation.target;
      host.dataset.formation=reportedFormation===1?"formed":"raining";
      options.onFormed?.(reportedFormation===1);
    }
    const exiting = host.dataset.exiting === "true" || host.dataset.exiting === "1";
    if (exiting && exitStarted === null) {
      const started=Number(host.dataset.exitStartedAt);
      exitStarted=Number.isFinite(started)?started:now;
    }
    const exitProgress = exitStarted === null ? 0 : clamp((now-exitStarted)/OPENING_EXIT_MS);
    exit = exitProgress*exitProgress*(3-2*exitProgress);
    uniforms.uExit.value = isReduced() ? 0 : exit;
    try {
      const submitStart=performance.now();
      renderer.render(scene,camera);
      const submitMs=performance.now()-submitStart;
      frames++;
      if (now-lastDiagnostics>=120 || !running) {
        lastDiagnostics=now;
        host.dataset.frame = String(frames);
        host.dataset.time = t.toFixed(2);
        host.dataset.drawCalls = String(renderer.info.render.calls);
        host.dataset.conanBlink = conanPose.blink.toFixed(3);
        host.dataset.conanArm = conanPose.elbow.toFixed(3);
        host.dataset.conanClock = conanTime.toFixed(3);
        host.dataset.conanWrist = conanPose.wrist.toFixed(3);
        host.dataset.conanHead = conanPose.head.toFixed(3);
        host.dataset.holmesCape = pose.hemRight.toFixed(3);
        host.dataset.scatterHolmes = scatter[0].value.toFixed(3);
        host.dataset.scatterConan = scatter[1].value.toFixed(3);
        host.dataset.transition = exit.toFixed(3);
        host.dataset.morph = formation.value.toFixed(3);
        host.dataset.travel = travel.toFixed(3);
        host.dataset.morphTarget = String(formation.target);
        host.dataset.forming = String(uniforms.uForming.value===1);
        host.dataset.formationDuration = formation.duration.toFixed(3);
        host.dataset.pointerPower = pointerPower.toFixed(3);
        host.dataset.worldProgress=worldProgress.toFixed(4);
        host.dataset.worldTarget=worldTarget.toFixed(4);
        host.dataset.worldStage=worldProgress<.16?"portrait-departure":worldProgress<.55?"sphere-curvature":worldProgress<.84?"continent-development":"two-city-thread";
        host.dataset.worldSurface="satellite-blue-marble";
        host.dataset.worldTextures=globeSurface.status;
        host.dataset.worldRadius=framing.radius.toFixed(1);
        host.dataset.worldCentre=`${framing.x.toFixed(1)},${framing.y.toFixed(1)}`;
        host.dataset.worldLongitude=worldLongitude.toFixed(2);
        host.dataset.globeLongitude=worldLongitude.toFixed(2);
        host.dataset.worldLatitude=worldLatitude.toFixed(2);
        host.dataset.rainClock=rainTime.toFixed(3);
      }
      publishCities();
      if(running && frames>8) {
        submitTimes.push(submitMs);
        if(frameInterval>0) frameIntervals.push(frameInterval);
        if(submitTimes.length>90) submitTimes.shift();
        if(frameIntervals.length>90) frameIntervals.shift();
        if(now-lastMetrics>=750) {
          lastMetrics=now;
          const ordered=[...frameIntervals].sort((a,b)=>a-b);
          host.dataset.renderMs=(submitTimes.reduce((sum,value)=>sum+value,0)/submitTimes.length).toFixed(3);
          host.dataset.frameP95=(ordered[Math.floor((ordered.length-1)*.95)]??0).toFixed(2);
          host.dataset.metricScope="js-submit-and-callback-interval";
        }
      }
    } catch {
      fail();
    }
  }

  function publishCities() {
    const world=worldLayout(),a=uniforms.uWorldRotation.value.x,b=uniforms.uWorldRotation.value.y;
    const cities=([['london',-.13,51.51],['tokyo',139.69,35.69]] as const).map(([id,lon,lat])=>{
      const point=unitGlobePoint(lon,lat),x=point[0]*Math.cos(a)-point[2]*Math.sin(a),z=point[0]*Math.sin(a)+point[2]*Math.cos(a);
      const y=point[1]*Math.cos(b)-z*Math.sin(b),depth=point[1]*Math.sin(b)+z*Math.cos(b);
      return {id,x:world.x+x*world.radius,y:world.y-y*world.radius,visible:depth>.02&&worldProgress>.7};
    });
    const signature=cities.map(city=>`${city.id}:${Math.round(city.x*2)}:${Math.round(city.y*2)}:${city.visible}`).join('|');
    if(signature===lastCitySignature)return;
    lastCitySignature=signature;
    host.dispatchEvent(new CustomEvent('opening:globe-cities',{detail:cities}));
  }

  function syncPlaying() {
    if (disposed) return;
    const next = shouldRun();
    if (next === running) {
      if (!next && !document.hidden && onScreen) render(performance.now());
      return;
    }
    running = next;
    lastFrame = performance.now();
    host.dataset.playing = String(running);
    renderer.setAnimationLoop(running ? render : null);
    if (!running && !document.hidden && onScreen) render(lastFrame);
  }

  function resize() {
    if (disposed) return;
    const rect = host.getBoundingClientRect();
    const nextWidth = Math.max(1,rect.width), nextHeight = Math.max(1,rect.height);
    const nextMobile = nextWidth<700;
    const changed = Math.abs(width-nextWidth)>2 || Math.abs(height-nextHeight)>2 || nextMobile!==mobile;
    width=nextWidth; height=nextHeight; mobile=nextMobile;
    hostDocumentX = rect.left+window.scrollX;
    hostDocumentY = rect.top+window.scrollY;
    const composition=layout();
    const {holmesHeight,conanHeight,holmesX,conanX,holmesY,conanY}=composition;
    scatterOrigins[0].set(holmesX,holmesY);
    scatterOrigins[1].set(conanX,conanY);
    uniforms.uLayout.value.set(holmesHeight,conanHeight,holmesX,conanX);
    uniforms.uAnchors.value.set(holmesY,conanY);
    host.dataset.holmesHeight=holmesHeight.toFixed(1);
    host.dataset.conanHeight=conanHeight.toFixed(1);
    scatterOriginTargets.forEach((origin,index)=>origin.copy(scatterOrigins[index]));
    // Fewer device pixels reduce rain/portrait overdraw while HTML type stays native-sharp.
    const dpr=Math.min(window.devicePixelRatio || 1,mobile?1.15:1.25);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width,height,false);
    uniforms.uViewport.value.set(width,height);
    uniforms.uDpr.value=dpr;
    host.dataset.pixelRatio=dpr.toFixed(2);
    uniforms.uMobile.value=mobile?1:0;
    const world=worldLayout();
    uniforms.uWorldLayout.value.set(world.x,world.y,world.radius);
    host.dataset.worldRadius=world.radius.toFixed(1);
    measureQuietAreas();
    if(changed) rebuild();
    render(performance.now());
  }

  const eventRoot = host.closest<HTMLElement>("[data-opening-scroll]") ?? host.parentElement ?? host;
  const scrollRoot = host.closest<HTMLElement>("[data-opening-scroll]");
  const onSceneScroll = () => {
    // One fixed viewport now serves both chapters; its origin is cached on
    // resize. Scrolling only releases pointer forces, without layout reads.
    onPointerLeave();
  };
  function measureQuietAreas() {
    if(disposed) return;
    const bounds=host.getBoundingClientRect();
    // Leave the signature and identity fully integrated with the rain; only soften controls.
    const selectors=[".opening-enter",".opening-reveal",".opening-brand",".opening-skip",".opening-controls"];
    const areas=selectors.map((selector,index)=>{
      const node=eventRoot.querySelector(selector);
      if(!node) { uniforms.uQuietAreas.value[index].set(0,0,0,0);return null; }
      const rect=node.getBoundingClientRect();
      const padding=8;
      const x=rect.left-bounds.left-padding,y=rect.top-bounds.top-padding;
      const w=rect.width+padding*2,h=rect.height+padding*2;
      uniforms.uQuietAreas.value[index].set(x+w*.5,y+h*.5,w*.5,h*.5);
      return {selector,x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)};
    });
    host.dataset.quietAreas=JSON.stringify(areas.filter(Boolean));
  }
  const onPointerMove = (event: PointerEvent) => {
    if (isReduced() || event.pointerType==="touch") return;
    const x = event.pageX-hostDocumentX, y = event.pageY-hostDocumentY;
    targetPointer.set(x-width*.5,y-height*.5);
    targetPower=1;
    if (!mobile) {
      const composition=layout();
      for (let index = 0; index < 2; index++) {
        const portraitHeight=index===0?composition.holmesHeight:composition.conanHeight;
        const anchorX=index===0?composition.holmesX:composition.conanX;
        const anchorY=index===0?composition.holmesY:composition.conanY;
        const distance = Math.hypot((x-anchorX)/(portraitHeight*.39),(y-anchorY)/(portraitHeight*.55));
        const conanSettled=formation.target===1 && formation.value===1 && formation.velocity===0;
        scatter[index].target = (index===1 && !conanSettled)?0:1-smooth(distance,.25,1.12);
        if (scatter[index].target > .03) scatterOriginTargets[index].set(x,y);
      }
    }
  };
  const onPointerLeave = () => { targetPower=0; targetPointer.set(0,0); scatter.forEach(spring => { spring.target = 0; }); };
  const onPulse = () => { if (!isReduced()) uniforms.uPulse.value=uniforms.uTime.value; };
  const onPointerDown = (event: PointerEvent) => {
    if(event.button!==0 || isReduced()) return;
    if(event.target instanceof Element && event.target.closest("button,a,input,select,textarea,[role=button]")) return;
    onPulse();
  };
  const onReveal = (event: Event) => {
    const next=(event as CustomEvent<boolean>).detail?1:0;
    reportedFormation=-1;
    retargetFormation(formation,next);
    Object.assign(scatter[1],createScatterSpring());
    uniforms.uScatter.value.y=0;
    host.dataset.formation=next===1?"gathering":"raining";
    if(isReduced() || frozenTime!==null) {
      formation.value=next;formation.velocity=0;formation.elapsed=formation.duration;uniforms.uMorph.value=next;
      render(performance.now());
    }
  };
  const onWorld = (event:Event) => {
    const value=Number((event as CustomEvent<number>).detail);
    if(!Number.isFinite(value))return;
    worldTarget=clamp(value);
    host.dataset.worldTarget=worldTarget.toFixed(4);
    if(!running&&!document.hidden)render(performance.now());
  };
  const onWorldCity = (event:Event) => {
    const city=(event as CustomEvent<string>).detail;
    if(city!=="london"&&city!=="tokyo")return;
    const longitude=city==="london"?25:120;
    const delta=((longitude-worldLongitude+180)%360+360)%360-180;
    worldLongitudeTarget=worldLongitude+delta;
    worldLatitudeTarget=city==="london"?35:40;
    host.dataset.worldCity=city;
    if(isReduced()){worldLongitude=worldLongitudeTarget;worldLatitude=worldLatitudeTarget;}
    if(!running&&!document.hidden)render(performance.now());
  };
  const onWorldRotate = (event:Event) => {
    const value=(event as CustomEvent<{dx:number;dy:number}>).detail;
    if(!value||!Number.isFinite(value.dx)||!Number.isFinite(value.dy))return;
    worldLongitudeTarget-=value.dx*.32;
    worldLatitudeTarget=clamp(worldLatitudeTarget+value.dy*.25,-65,65);
    if(isReduced()){worldLongitude=worldLongitudeTarget;worldLatitude=worldLatitudeTarget;}
    if(!running&&!document.hidden)render(performance.now());
  };
  const onWorldPointer = (event:Event) => {
    const value=(event as CustomEvent<{x:number;y:number}|null>).detail;
    if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.y)||value.x<0||value.y<0||value.x>width||value.y>height){onPointerLeave();return;}
    if(isReduced())return;
    targetPointer.set(value.x-width*.5,value.y-height*.5);targetPower=1;
  };
  const onReplay = () => {
    elapsed=0;flowTime=0;rainTime=0;conanTime=0;exit=0;exitStarted=null;reportedFormation=0;
    worldTarget=0;worldProgress=0;worldLongitude=58;worldLatitude=33;worldLongitudeTarget=58;worldLatitudeTarget=33;lastCitySignature="";lastPublishedWorld=-1;
    arrivalSettled=isReduced();
    Object.assign(formation,createFormationTween());
    uniforms.uMorph.value=0;uniforms.uForming.value=0;uniforms.uFlowTime.value=0;uniforms.uRainTime.value=0;uniforms.uWorld.value=0;
    scatter.forEach(spring=>Object.assign(spring,{value:0,velocity:0,target:0}));
    uniforms.uScatter.value.set(0,0);uniforms.uPulse.value=-100;
    onPointerLeave();render(performance.now());syncPlaying();
  };
  const onContextLost = (event: Event) => { event.preventDefault(); fail(); };
  function fail() {
    if(disposed) return;
    failed=true;
    running=false;
    renderer.setAnimationLoop(null);
    host.dataset.status="fallback";
    host.dataset.playing="false";
    canvas.style.opacity="0";
    options.onReady?.();
  }
  eventRoot.addEventListener("pointermove",onPointerMove,{passive:true});
  eventRoot.addEventListener("pointerleave",onPointerLeave,{passive:true});
  eventRoot.addEventListener("pointerdown",onPointerDown,{passive:true});
  scrollRoot?.addEventListener("scroll",onSceneScroll,{passive:true});
  eventRoot.addEventListener("opening:pulse",onPulse);
  eventRoot.addEventListener("opening:replay",onReplay);
  // Also support an event dispatched directly on the canvas host.
  host.addEventListener("opening:pulse",onPulse);
  host.addEventListener("opening:replay",onReplay);
  host.addEventListener("opening:reveal",onReveal);
  host.addEventListener("opening:world",onWorld);
  host.addEventListener("opening:world-city",onWorldCity);
  host.addEventListener("opening:world-rotate",onWorldRotate);
  host.addEventListener("opening:world-pointer",onWorldPointer);
  canvas.addEventListener("webglcontextlost",onContextLost);
  document.addEventListener("visibilitychange",syncPlaying);
  systemMotion.addEventListener("change",syncPlaying);
  const resizeObserver=new ResizeObserver(resize);
  resizeObserver.observe(host);
  const copy=eventRoot.querySelector(".opening-copy");
  if(copy) resizeObserver.observe(copy);
  void document.fonts.ready.then(()=>{if(!disposed){measureQuietAreas();if(!running)render(performance.now());}});
  const intersection=new IntersectionObserver(([entry])=>{
    // Edge contact alone is reported as intersecting; do not keep the film loop
    // alive after its last visible row has moved above the globe chapter.
    onScreen=entry.isIntersecting && entry.intersectionRatio>.001;
    host.dataset.onscreen=String(onScreen);
    syncPlaying();
  },{threshold:[0,.001]});
  intersection.observe(host);
  const preferenceObserver=new MutationObserver(syncPlaying);
  preferenceObserver.observe(document.documentElement,{attributes:true,attributeFilter:["data-paused"]});

  resize();
  syncPlaying();
  host.dispatchEvent(new Event("opening:ready"));

  async function loadPortrait(name: string) {
    const image = new Image();
    image.decoding="async";
    image.src=asset(name);
    await image.decode();
    if(!disposed) host.dataset.loadedAssets=String(Number(host.dataset.loadedAssets??0)+1);
    return image;
  }
  async function sampleCharacters() {
    try {
      const [holmes,conan,closed] = await Promise.all([
        loadPortrait("holmes-cinematic-v4.webp"),
        loadPortrait("conan-cinematic-v4.webp"),
        loadPortrait("conan-blink-v5.webp").catch(()=>null),
      ]);
      if(disposed || failed) return;
      const sampleCanvas=document.createElement("canvas");
      const context=sampleCanvas.getContext("2d",{willReadFrequently:true});
      if(!context) throw new Error("No sampling context");
      for (const [image,kind] of [[holmes,2],[conan,3]] as const) {
        const columns=kind===2?100:80,rows=kind===2?150:120;
        sampleCanvas.width=columns;sampleCanvas.height=rows;
        const read = (image: HTMLImageElement) => {
          context.clearRect(0,0,columns,rows);
          context.drawImage(image,0,0,columns,rows);
          return context.getImageData(0,0,columns,rows).data;
        };
        const rgba=read(image);
        const blinkRgba=kind===3 && closed ? read(closed) : rgba;
        const pixels:Sample[]=[];
        const intensity=(pixels: Uint8ClampedArray,x:number,y:number)=>{
          const offset=(clamp(y,0,rows-1)*columns+clamp(x,0,columns-1))*4;
          return (pixels[offset]*.2126+pixels[offset+1]*.7152+pixels[offset+2]*.0722)/255*(pixels[offset+3]/255);
        };
        for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
          const offset=(y*columns+x)*4;
          const brightness=intensity(rgba,x,y);
          if(rgba[offset+3]<72 || brightness<.028) continue;
          const edge=Math.min(1,Math.abs(intensity(rgba,x+1,y)-intensity(rgba,x-1,y))*3+Math.abs(intensity(rgba,x,y+1)-intensity(rgba,x,y-1))*3);
          const u=(x+.5)/columns,v=(y+.5)/rows;
          pixels.push({x:u-.5,y:v-.5,brightness,closed:intensity(blinkRgba,x,y),eye:kind===3?conanEyeMask(u,v):0,edge,binding:portraitBinding(u,v,kind)});
        }
        characters.push({kind,samples:pixels});
      }
      rebuild();
      host.dataset.portraits="ready";
      host.dataset.status="ready";
      options.onReady?.();
      if(!running) render(performance.now());
    } catch (error) {
      if(disposed) return;
      host.dataset.status="partial";
      host.dataset.assetError=error instanceof Error?error.message:"Character sampling failed";
      options.onReady?.();
    }
  }
  void sampleCharacters();

  return () => {
    disposed=true;
    running=false;
    renderer.setAnimationLoop(null);
    eventRoot.removeEventListener("pointermove",onPointerMove);
    eventRoot.removeEventListener("pointerleave",onPointerLeave);
    eventRoot.removeEventListener("pointerdown",onPointerDown);
    scrollRoot?.removeEventListener("scroll",onSceneScroll);
    eventRoot.removeEventListener("opening:pulse",onPulse);
    eventRoot.removeEventListener("opening:replay",onReplay);
    host.removeEventListener("opening:pulse",onPulse);
    host.removeEventListener("opening:replay",onReplay);
    host.removeEventListener("opening:reveal",onReveal);
    host.removeEventListener("opening:world",onWorld);
    host.removeEventListener("opening:world-city",onWorldCity);
    host.removeEventListener("opening:world-rotate",onWorldRotate);
    host.removeEventListener("opening:world-pointer",onWorldPointer);
    canvas.removeEventListener("webglcontextlost",onContextLost);
    document.removeEventListener("visibilitychange",syncPlaying);
    systemMotion.removeEventListener("change",syncPlaying);
    resizeObserver.disconnect();
    intersection.disconnect();
    preferenceObserver.disconnect();
    geometry.dispose();
    globeSurface.dispose();
    globeStrokes.forEach(stroke=>{stroke.geometry.dispose();stroke.material.dispose();});
    material.dispose();
    atlas.dispose();
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    host.dataset.playing="false";
  };
}
