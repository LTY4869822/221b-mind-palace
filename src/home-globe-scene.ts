import {greatCircle,wrapLongitude,type AtlasPoint} from "./atlas-math.ts";
import coastlines from "./data/coastlines.json" with {type:"json"};

export type HomeGlobeCityId="london"|"tokyo";
export type HomeGlobeCity={id:HomeGlobeCityId;x:number;y:number;visible:boolean};
type Vector={x:number;y:number;z:number};
type SurfaceParticle={vector:Vector;kind:"land"|"coast"|"ocean";seed:number;glyph:number;column:number;rainY:number;speed:number;dx:number;dy:number};
type Geometry={width:number;height:number;radius:number;x:number;y:number};
const PI=Math.PI,TAU=PI*2,RAD=PI/180;
const clamp=(value:number,min=0,max=1)=>Math.min(max,Math.max(min,value));
const smoother=(t:number)=>{const n=clamp(t);return n*n*n*(n*(n*6-15)+10);};
const mix=(from:number,to:number,p:number)=>from+(to-from)*p;
const hash=(n:number)=>{const value=Math.sin(n*127.1+311.7)*43758.5453123;return value-Math.floor(value);};

/** Stagger changes only the path phase, never a particle's geospatial assignment. */
export function homeGlobeMorphProgress(progress:number,seed:number) {
  const delay=.045+clamp(seed)*.115;
  return smoother((progress-delay)/(.79-delay));
}

/** A continuous curved trajectory with exactly matching rain / sphere endpoints. */
export function homeGlobeParticlePath(fromX:number,fromY:number,toX:number,toY:number,phase:number,seed:number,width:number,height:number) {
  const p=clamp(phase),q=1-p;
  const curl=(seed-.5)*Math.min(width*.12,130);
  const c1x=fromX+(toX-fromX)*.22+curl;
  const c1y=fromY+Math.min(height*.17,110);
  const c2x=toX+(fromX-toX)*.13-curl*.35;
  const c2y=toY-Math.min(height*.1,65);
  return {
    x:q*q*q*fromX+3*q*q*p*c1x+3*q*p*p*c2x+p*p*p*toX,
    y:q*q*q*fromY+3*q*q*p*c1y+3*q*p*p*c2y+p*p*p*toY,
  };
}

const unit=([longitude,latitude]:AtlasPoint):Vector=>{
  const phi=latitude*RAD,lambda=longitude*RAD,c=Math.cos(phi);
  return {x:c*Math.sin(lambda),y:Math.sin(phi),z:c*Math.cos(lambda)};
};
const land=(coastlines as number[][][]).map(ring=>({
  points:ring,
  minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),
  minY:Math.min(...ring.map(p=>p[1])),maxY:Math.max(...ring.map(p=>p[1])),
}));
const landVectors=land.map(ring=>ring.points.map(point=>unit([point[0],point[1]])));
const isLand=(longitude:number,latitude:number)=>land.some(ring=>{
  if(longitude<ring.minX||longitude>ring.maxX||latitude<ring.minY||latitude>ring.maxY)return false;
  let inside=false;
  for(let i=0,j=ring.points.length-1;i<ring.points.length;j=i++){
    const a=ring.points[i],b=ring.points[j];
    if((a[1]>latitude)!==(b[1]>latitude)&&longitude<(b[0]-a[0])*(latitude-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
});
const grids:Vector[][]=[];
for(let lon=-180;lon<180;lon+=30)grids.push(Array.from({length:61},(_,i)=>unit([lon,-90+i*3])));
for(let lat=-60;lat<=60;lat+=30)grids.push(Array.from({length:121},(_,i)=>unit([-180+i*3,lat])));
const cityDefinitions=[
  {id:"london" as const,point:[-.13,51.51] as AtlasPoint,color:"#e7cb94"},
  {id:"tokyo" as const,point:[139.69,35.69] as AtlasPoint,color:"#9adcf8"},
];
const cityVectors=cityDefinitions.map(city=>unit(city.point));
const connection=greatCircle(cityDefinitions[0].point,cityDefinitions[1].point,110).map(unit);

function makeParticles():SurfaceParticle[] {
  const inland:Vector[]=[],ocean:Vector[]=[];
  const total=6200,golden=PI*(3-Math.sqrt(5));
  for(let i=0;i<total;i++){
    const latitude=Math.asin(1-2*(i+.5)/total)/RAD;
    const longitude=wrapLongitude(i*golden/RAD);
    (isLand(longitude,latitude)?inland:ocean).push(unit([longitude,latitude]));
  }
  const coast=landVectors.flat();
  const selected:{vector:Vector;kind:SurfaceParticle["kind"]}[]=[];
  const take=(source:Vector[],count:number,kind:SurfaceParticle["kind"])=>{
    for(let i=0;i<count;i++)selected.push({vector:source[Math.floor(i*source.length/count)],kind});
  };
  take(inland,1320,"land");take(coast,360,"coast");take(ocean,220,"ocean");
  // Shuffle once so adjacent code streams resolve into different geographic regions.
  for(let i=selected.length-1;i>0;i--){const j=Math.floor(hash(i+81)*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]];}
  return selected.map((point,i)=>({
    ...point,seed:hash(i+3),glyph:Math.floor(hash(i+91)*32),column:hash(i+712),
    rainY:hash(i+109)*1.24-.12,speed:.025+hash(i+15)*.055,dx:0,dy:0,
  }));
}

/** Canvas2D shares glyphs through the whole reveal; one bounded RAF and no added runtime. */
export function createHomeGlobeScene(canvas:HTMLCanvasElement,callbacks?:{onCities?:(cities:HomeGlobeCity[])=>void}) {
  const context=canvas.getContext("2d",{alpha:true});
  if(!context)throw new Error("The investigation globe needs Canvas2D support");
  const particles=makeParticles();
  const atlas=document.createElement("canvas"),atlasContext=atlas.getContext("2d");
  const glyphs="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0,32),tile=28;
  atlas.width=tile*32;atlas.height=tile*2;
  if(atlasContext){
    atlasContext.font="500 21px ui-monospace, SFMono-Regular, Consolas, monospace";
    atlasContext.textAlign="center";atlasContext.textBaseline="middle";
    for(let row=0;row<2;row++)for(let i=0;i<32;i++){
      atlasContext.fillStyle=row?"#b9edff":"#4fbcf2";
      atlasContext.fillText(glyphs[i],i*tile+tile/2,row*tile+tile/2);
    }
  }
  let geometry:Geometry={width:1,height:1,radius:1,x:0,y:0};
  let active=false,still=false,paused=false,disposed=false,frame=0,lastTime=0,elapsed=0;
  let targetProgress=0,progress=0,longitude=63,latitude=29,targetLongitude=63,targetLatitude=29;
  let focusLongitude=63,autoTime=0,lastInteraction=-20,lastReport=0,lastCitiesReport=0,draws=0;
  let pointer:{x:number;y:number}|null=null;
  const view={sinLon:0,cosLon:1,sinLat:0,cosLat:1};
  const project=(point:Vector):Vector=>{
    const x=point.x*view.cosLon-point.z*view.sinLon;
    const z=point.x*view.sinLon+point.z*view.cosLon;
    return {x,y:point.y*view.cosLat-z*view.sinLat,z:point.y*view.sinLat+z*view.cosLat};
  };
  const projectLine=(points:Vector[],alpha:number,color:string,width:number,limit=points.length)=>{
    if(alpha<=.002)return;
    const g=geometry;
    context.beginPath();let pen=false;
    for(let index=0;index<limit;index++){
      const p=project(points[index]);
      if(p.z<.008){pen=false;continue;}
      const x=g.x+p.x*g.radius,y=g.y-p.y*g.radius;
      if(pen)context.lineTo(x,y);else context.moveTo(x,y);
      pen=true;
    }
    context.globalAlpha=alpha;context.strokeStyle=color;context.lineWidth=width;context.stroke();
  };
  const reportCities=(force=false)=>{
    if(!force&&elapsed-lastCitiesReport<1/30)return;
    lastCitiesReport=elapsed;
    callbacks?.onCities?.(cityDefinitions.map((city,i)=>{
      const p=project(cityVectors[i]);
      return {id:city.id,x:geometry.x+p.x*geometry.radius,y:geometry.y-p.y*geometry.radius,visible:p.z>.06&&(still||progress>.66)};
    }));
  };
  const draw=(dt:number)=>{
    const g=geometry;
    elapsed+=dt;
    const damping=1-Math.exp(-dt*12);
    progress=still?1:paused?progress:mix(progress,targetProgress,damping);
    if(Math.abs(progress-targetProgress)<.0001&&!still&&!paused)progress=targetProgress;
    if(!still&&!paused&&progress>.94&&elapsed-lastInteraction>5){
      autoTime+=dt;
      targetLongitude=focusLongitude+Math.sin(autoTime*.08)*3.4;
    }
    const turn=still?1:1-Math.exp(-dt*5.7);
    longitude=mix(longitude,targetLongitude,turn);latitude=mix(latitude,targetLatitude,turn);
    view.sinLon=Math.sin(longitude*RAD);view.cosLon=Math.cos(longitude*RAD);
    view.sinLat=Math.sin(latitude*RAD);view.cosLat=Math.cos(latitude*RAD);
    context.clearRect(0,0,g.width,g.height);
    const globeReveal=smoother((progress-.24)/.54);
    if(globeReveal>.001){
      context.globalAlpha=globeReveal;
      const atmosphere=context.createRadialGradient(g.x,g.y,g.radius*.88,g.x,g.y,g.radius*1.12);
      atmosphere.addColorStop(0,"#1b709c00");atmosphere.addColorStop(.47,"#3cafd21a");atmosphere.addColorStop(.7,"#185d8c08");atmosphere.addColorStop(1,"#12476d00");
      context.fillStyle=atmosphere;context.beginPath();context.arc(g.x,g.y,g.radius*1.12,0,TAU);context.fill();
      const surface=context.createRadialGradient(g.x-g.radius*.34,g.y-g.radius*.37,g.radius*.03,g.x,g.y,g.radius);
      surface.addColorStop(0,"#0d2d3b85");surface.addColorStop(.7,"#07192375");surface.addColorStop(1,"#041018b5");
      context.fillStyle=surface;context.beginPath();context.arc(g.x,g.y,g.radius,0,TAU);context.fill();
      for(const grid of grids)projectLine(grid,globeReveal*.17,"#6badcd",.55);
    }
    const fontSize=mix(clamp(g.width/115,10,13),clamp(g.radius/62,4.4,6.2),smoother(progress));
    const rainAdvance=still?0:1-smoother((progress-.025)/.17);
    const columns=Math.ceil(g.width/17);
    const settle=smoother((progress-.43)/.42);
    for(const particle of particles){
      if(rainAdvance>.001){
        particle.rainY+=particle.speed*dt*rainAdvance;
        if(progress<.045&&particle.rainY>1.14)particle.rainY=-.14;
      }
      const p=project(particle.vector),phase=still?1:homeGlobeMorphProgress(progress,particle.seed);
      const sourceX=(Math.floor(particle.column*columns)+.5)*g.width/columns;
      const sourceY=particle.rainY*g.height;
      const sphereX=g.x+p.x*g.radius,sphereY=g.y-p.y*g.radius;
      const path=homeGlobeParticlePath(sourceX,sourceY,sphereX,sphereY,phase,particle.seed,g.width,g.height);
      let dx=0,dy=0;
      if(pointer&&!still&&!paused){
        const px=path.x-pointer.x,py=path.y-pointer.y,distance=Math.hypot(px,py),reach=mix(105,72,phase);
        if(distance<reach&&distance>.01){const force=(1-distance/reach)**2*mix(40,17,phase);dx=px/distance*force;dy=py/distance*force;}
      }
      particle.dx=mix(particle.dx,dx,damping);particle.dy=mix(particle.dy,dy,damping);
      const x=path.x+particle.dx,y=path.y+particle.dy;
      if(x< -20||x>g.width+20||y< -20||y>g.height+20)continue;
      const depth=smoother((p.z+.04)/.15);
      const sphereAlpha=(particle.kind==="ocean"?.22:particle.kind==="coast"?.87:.62)*(.35+clamp(p.z)*.65)*depth;
      const rainAlpha=.12+particle.seed**3*.56;
      context.globalAlpha=mix(rainAlpha,sphereAlpha,phase);
      // Oceans lose their glyph very gradually; this keeps the silhouette readable.
      if(particle.kind==="ocean"&&settle>.01){
        context.globalAlpha*=1-settle;
        context.drawImage(atlas,particle.glyph*tile,0,tile,tile,x-fontSize/2,y-fontSize/2,fontSize,fontSize);
        context.globalAlpha=sphereAlpha*settle*.72;
        context.fillStyle="#70c6ea";context.fillRect(x-.55,y-.55,1.1,1.1);
      }else{
        const row=particle.kind==="coast"||particle.seed>.87?1:0;
        context.drawImage(atlas,particle.glyph*tile,row*tile,tile,tile,x-fontSize/2,y-fontSize/2,fontSize,fontSize);
      }
    }
    if(globeReveal>.001){
      const contour=smoother((progress-.48)/.35);
      for(const coast of landVectors)projectLine(coast,contour*.49,"#91d6ed",.64);
      context.globalAlpha=globeReveal*.44;context.strokeStyle="#83d0ed";context.lineWidth=.8;
      context.beginPath();context.arc(g.x,g.y,g.radius,0,TAU);context.stroke();
      context.globalAlpha=globeReveal*.13;context.lineWidth=.6;
      context.beginPath();context.arc(g.x,g.y,g.radius+9,-PI*.1,PI*1.21);context.stroke();
      // The route is a thin evidence thread, progressively written after the land emerges.
      const routeReveal=smoother((progress-.62)/.29);
      const routeCount=Math.max(2,Math.ceil(connection.length*routeReveal));
      context.setLineDash([2,4]);projectLine(connection,routeReveal*.82,"#dfc799",1,routeCount);context.setLineDash([]);
      for(let i=0;i<cityDefinitions.length;i++){
        const point=project(cityVectors[i]);if(point.z<.02)continue;
        const reveal=smoother((progress-.67-i*.035)/.2);if(reveal<=0)continue;
        const x=g.x+point.x*g.radius,y=g.y-point.y*g.radius;
        const color=cityDefinitions[i].color,pulse=still?0:(Math.sin(elapsed*1.4+i)+1)*.5;
        context.globalAlpha=reveal*.16;context.fillStyle=color;
        context.beginPath();context.arc(x,y,9+pulse*3,0,TAU);context.fill();
        context.globalAlpha=reveal*.65;context.strokeStyle=color;context.lineWidth=.7;
        context.beginPath();context.arc(x,y,6,0,TAU);context.stroke();
        context.globalAlpha=reveal;context.fillStyle=color;context.beginPath();context.arc(x,y,2,0,TAU);context.fill();
      }
      context.globalAlpha=globeReveal*.25;context.strokeStyle="#91bac7";context.lineWidth=.55;
      for(let i=0;i<72;i++){
        const angle=i*TAU/72;if(i>25&&i<42)continue;
        const r=g.radius+18,length=i%6===0?6:2;
        context.beginPath();context.moveTo(g.x+Math.cos(angle)*r,g.y+Math.sin(angle)*r);context.lineTo(g.x+Math.cos(angle)*(r+length),g.y+Math.sin(angle)*(r+length));context.stroke();
      }
    }
    context.globalAlpha=1;draws++;reportCities(still||paused);
    if(elapsed-lastReport>.2||still||paused){
      lastReport=elapsed;canvas.dataset.progress=progress.toFixed(3);canvas.dataset.longitude=wrapLongitude(longitude).toFixed(2);
      canvas.dataset.draws=String(draws);canvas.dataset.state=still?"still":progress>.9?"globe":progress>.08?"forming":"rain";
    }
  };
  const tick=(now:number)=>{
    frame=0;if(disposed||!active||document.hidden)return;
    const dt=paused||still?0:lastTime?clamp((now-lastTime)/1000,1/240,.045):1/60;lastTime=now;
    draw(dt);
    if(!still&&!paused)frame=requestAnimationFrame(tick);
  };
  const request=()=>{if(!disposed&&active&&!document.hidden&&!frame)frame=requestAnimationFrame(tick);};
  const resize=()=>{
    const bounds=canvas.getBoundingClientRect();
    const width=Math.max(1,bounds.width),height=Math.max(1,bounds.height),dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);
    const mobile=width<760;
    const radius=Math.max(1,Math.min(height*.43,width*(mobile?.44:.34),width*(mobile?.5:.36)-22));
    geometry={width,height,radius,x:width*(mobile?.5:.64),y:height*.5};
    if(active)request();else{draw(0);reportCities(true);}
  };
  const visibility=()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTime=0;}
    else request();
  };
  const observer=new ResizeObserver(resize);observer.observe(canvas);document.addEventListener("visibilitychange",visibility);
  resize();canvas.dataset.status="ready";canvas.dataset.particles=String(particles.length);
  return {
    setProgress(value:number){targetProgress=clamp(value);if(still)progress=1;request();},
    setActive(value:boolean){
      if(active===value)return;active=value;canvas.dataset.active=String(value);lastTime=0;
      if(value)request();else{cancelAnimationFrame(frame);frame=0;pointer=null;}
    },
    setStill(value:boolean){still=value;canvas.dataset.still=String(value);cancelAnimationFrame(frame);frame=0;lastTime=0;request();},
    setPaused(value:boolean){
      canvas.dataset.paused=String(value);if(paused===value)return;
      paused=value;pointer=null;cancelAnimationFrame(frame);frame=0;lastTime=0;request();
    },
    focusCity(id:HomeGlobeCityId){
      const destination=id==="london"?{lon:14,lat:36}:{lon:119,lat:33};
      targetLongitude=longitude+wrapLongitude(destination.lon-longitude);targetLatitude=destination.lat;
      focusLongitude=targetLongitude;lastInteraction=elapsed;autoTime=0;
      if(still||paused){longitude=targetLongitude;latitude=targetLatitude;}request();
    },
    rotate(dx:number,dy:number){
      targetLongitude-=dx*.22;targetLatitude=clamp(targetLatitude+dy*.17,-58,66);
      focusLongitude=targetLongitude;lastInteraction=elapsed;autoTime=0;
      if(still||paused){longitude=targetLongitude;latitude=targetLatitude;}request();
    },
    setPointer(x:number,y:number){if(still||paused)return;pointer={x,y};request();},
    clearPointer(){pointer=null;request();},
    dispose(){
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener("visibilitychange",visibility);
      atlas.width=0;atlas.height=0;canvas.dataset.status="disposed";
    },
  };
}
