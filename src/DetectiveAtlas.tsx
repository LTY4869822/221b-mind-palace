import {useEffect,useRef,useState,type KeyboardEvent,type PointerEvent} from "react";
import {animate,useMotionValue} from "motion/react";
import {RotateCcw,ArrowUpRight} from "lucide-react";
import {useSceneMotion} from "./useSceneMotion";
import {greatCircle,projectAtlas,unprojectAtlas,wrapLongitude,type AtlasPoint} from "./atlas-math";
import coastlines from "./data/coastlines.json";
import type {DetectiveMode} from "./DetectiveArtifacts";

const cities=[
  {mode:"holmes" as const,name:"London",code:"221B",point:[-.13,51.51] as AtlasPoint,zone:"Europe/London"},
  {mode:"conan" as const,name:"Tokyo",code:"4869",point:[139.69,35.69] as AtlasPoint,zone:"Asia/Tokyo"},
];
const route=greatCircle(cities[0].point,cities[1].point);
const land:AtlasPoint[][]=coastlines.map(ring=>ring.map(point=>[point[0],point[1]]));
const graticules:AtlasPoint[][]=[];
for(let lon=-180;lon<180;lon+=30)graticules.push(Array.from({length:61},(_,i)=>[lon,-90+i*3]));
for(let lat=-60;lat<=60;lat+=30)graticules.push(Array.from({length:121},(_,i)=>[-180+i*3,lat]));
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const coordinates=([lon,lat]:AtlasPoint)=>`${Math.abs(lat).toFixed(2)}° ${lat<0?"S":"N"}   ${Math.abs(lon).toFixed(2)}° ${lon<0?"W":"E"}`;

/** On-demand Canvas2D atlas: no WebGL context, no idle animation loop. */
export default function DetectiveAtlas({mode,onSelect}:{mode:DetectiveMode;onSelect:(mode:DetectiveMode)=>void}) {
  const {still}=useSceneMotion();
  const longitude=useMotionValue(58),latitude=useMotionValue(33);
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const markers=useRef<(HTMLButtonElement|null)[]>([]),reading=useRef<HTMLOutputElement>(null);
  const controls=useRef<{stop:()=>void}[]>([]),lastMode=useRef(mode);
  const geometry=useRef({width:0,height:0,radius:1,x:0,y:0});
  const drag=useRef<{id:number;x:number;y:number;lon:number;lat:number;lastX:number;stamp:number;velocity:number}|null>(null);
  const [time,setTime]=useState(()=>new Date());
  const stop=()=>{controls.current.forEach(control=>control.stop());controls.current=[];};
  const fly=(lon:number,lat:number)=>{
    stop();
    const end=longitude.get()+wrapLongitude(lon-longitude.get());
    if(still){longitude.set(end);latitude.set(lat);return;}
    controls.current=[animate(longitude,end,{duration:1.05,ease:[.22,1,.36,1]}),animate(latitude,lat,{duration:1.05,ease:[.22,1,.36,1]})];
  };
  const focusCity=(next:DetectiveMode)=>{
    onSelect(next);
    fly(next==="holmes"?25:120,next==="holmes"?35:40);
    if(reading.current)reading.current.textContent=coordinates(cities[next==="holmes"?0:1].point);
  };
  useEffect(()=>{const timer=setInterval(()=>setTime(new Date()),60000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{if(lastMode.current!==mode){lastMode.current=mode;focusCity(mode);}},[mode]);
  useEffect(()=>{if(still)stop();},[still]);
  useEffect(()=>{
    const surface=canvas.current,node=host.current;
    if(!surface || !node)return;
    const context=surface.getContext("2d");
    if(!context)return;
    let alive=true,frame=0,drawCount=0,lastReport=0;
    const line=(points:readonly AtlasPoint[],color:string,width=.65)=>{
      const g=geometry.current;
      context.beginPath();let pen=false;
      for(const point of points){
        const p=projectAtlas(point,longitude.get(),latitude.get());
        if(p.z<0){pen=false;continue;}
        const x=g.x+p.x*g.radius,y=g.y-p.y*g.radius;
        if(pen)context.lineTo(x,y);else context.moveTo(x,y);
        pen=true;
      }
      context.strokeStyle=color;context.lineWidth=width;context.stroke();
    };
    const draw=()=>{
      frame=0;if(!alive)return;
      const g=geometry.current,blue=mode==="conan";
      context.clearRect(0,0,g.width,g.height);
      const glow=context.createRadialGradient(g.x-g.radius*.3,g.y-g.radius*.4,g.radius*.1,g.x,g.y,g.radius);
      glow.addColorStop(0,blue?"#14303d":"#24312c");glow.addColorStop(1,"#0b1417");
      context.fillStyle=glow;context.beginPath();context.arc(g.x,g.y,g.radius,0,Math.PI*2);context.fill();
      context.save();context.beginPath();context.arc(g.x,g.y,g.radius,0,Math.PI*2);context.clip();
      for(const grid of graticules)line(grid,blue?"#7bb6cb25":"#c6b38b22",.55);
      for(const coast of land)line(coast,blue?"#9bbdcd91":"#d0be9591",.8);
      context.setLineDash([3,4]);line(route,blue?"#a9dbf3":"#d8bc83",1.15);context.setLineDash([]);
      context.restore();
      context.strokeStyle=blue?"#73b9d45c":"#d1b57959";context.lineWidth=.8;
      context.beginPath();context.arc(g.x,g.y,g.radius,0,Math.PI*2);context.stroke();
      context.strokeStyle=blue?"#82bac525":"#b8a47625";
      context.beginPath();context.ellipse(g.x,g.y,g.radius+8,g.radius+8,0,.05,Math.PI*1.28);context.stroke();
      for(let i=0;i<48;i++){
        const angle=i*Math.PI/24,len=i%4?3:7,r=g.radius+13;
        context.beginPath();context.moveTo(g.x+Math.cos(angle)*r,g.y+Math.sin(angle)*r);context.lineTo(g.x+Math.cos(angle)*(r+len),g.y+Math.sin(angle)*(r+len));context.stroke();
      }
      cities.forEach((city,index)=>{
        const marker=markers.current[index];if(!marker)return;
        const p=projectAtlas(city.point,longitude.get(),latitude.get());
        marker.style.transform=`translate3d(${g.x+p.x*g.radius}px,${g.y-p.y*g.radius}px,0)`;
        marker.style.visibility=p.z>0?"visible":"hidden";
      });
      drawCount++;
      if(performance.now()-lastReport>100){lastReport=performance.now();node.dataset.longitude=wrapLongitude(longitude.get()).toFixed(2);node.dataset.latitude=latitude.get().toFixed(2);node.dataset.draws=String(drawCount);}
    };
    const request=()=>{if(!frame&&alive)frame=requestAnimationFrame(draw);};
    const resize=()=>{
      const width=node.clientWidth,height=node.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);
      surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);
      geometry.current={width,height,radius:Math.max(1,Math.min(width*.38,height*.46)),x:width*.5,y:height*.48};request();
    };
    const a=longitude.on("change",request),b=latitude.on("change",request);
    const observer=new ResizeObserver(resize);observer.observe(node);resize();node.dataset.status="ready";
    return()=>{alive=false;stop();cancelAnimationFrame(frame);observer.disconnect();a();b();};
  },[mode]);

  const pointAt=(event:PointerEvent<HTMLCanvasElement>)=>{
    const g=geometry.current;
    return unprojectAtlas((event.nativeEvent.offsetX-g.x)/g.radius,-(event.nativeEvent.offsetY-g.y)/g.radius,longitude.get(),latitude.get());
  };
  const move=(event:PointerEvent<HTMLCanvasElement>)=>{
    const d=drag.current;
    if(d){
      const now=performance.now(),dt=Math.max(8,now-d.stamp);
      d.velocity=(event.clientX-d.lastX)/dt*150;d.lastX=event.clientX;d.stamp=now;
      longitude.set(d.lon-(event.clientX-d.x)*.35);latitude.set(clamp(d.lat+(event.clientY-d.y)*.24,-65,65));
    }
    const point=pointAt(event);if(point&&reading.current)reading.current.textContent=coordinates(point);
  };
  const release=(event:PointerEvent<HTMLCanvasElement>)=>{
    const d=drag.current;if(!d)return;
    drag.current=null;if(canvas.current?.hasPointerCapture(event.pointerId))canvas.current.releasePointerCapture(event.pointerId);
    if(!still&&Math.abs(d.velocity)>.2)controls.current=[animate(longitude,longitude.get()-clamp(d.velocity,-24,24),{duration:.65,ease:[.16,1,.3,1]})];
  };
  const key=(event:KeyboardEvent<HTMLCanvasElement>)=>{
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home"].includes(event.key))return;
    event.preventDefault();
    if(event.key==="Home")fly(58,33);
    else fly(longitude.get()+(event.key==="ArrowLeft"?-14:event.key==="ArrowRight"?14:0),clamp(latitude.get()+(event.key==="ArrowUp"?9:event.key==="ArrowDown"?-9:0),-65,65));
  };
  return <figure className={`detective-atlas atlas-${mode}`}>
    <figcaption><span>THE TWO CITY CONNECTION</span><button onClick={()=>fly(58,33)} aria-label="重置双城地球视角" title="回到双城全景"><RotateCcw size={12}/></button></figcaption>
    <div className="atlas-viewport" ref={host}>
      <canvas ref={canvas} tabIndex={0} role="img" aria-label="双城灵感地球 拖动或使用方向键旋转 Home 键复位" onKeyDown={key} onPointerDown={event=>{
        if(event.button!==0||!pointAt(event))return;stop();event.currentTarget.setPointerCapture(event.pointerId);
        drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,lon:longitude.get(),lat:latitude.get(),lastX:event.clientX,stamp:performance.now(),velocity:0};
      }} onPointerMove={move} onPointerUp={release} onPointerCancel={()=>{drag.current=null;stop();}}/>
      {cities.map((city,index)=><button key={city.mode} ref={node=>{markers.current[index]=node;}} className={`atlas-marker marker-${city.mode}`} onClick={()=>focusCity(city.mode)} aria-label={`定位${city.name}故事线索`} aria-pressed={mode===city.mode}><i/><span>{city.name}<small>{city.code}</small></span></button>)}
      <span className="atlas-crosshair" aria-hidden="true">+</span>
      <output className="atlas-coordinates" ref={reading} aria-live="off">51.51° N   0.13° W</output>
      <span className="atlas-drag-note">DRAG TO EXPLORE</span>
    </div>
    <div className="atlas-city-index" aria-label="选择双城故事坐标">{cities.map(city=><button key={city.mode} onClick={()=>focusCity(city.mode)} aria-pressed={mode===city.mode}><span>{city.name}<small>{new Intl.DateTimeFormat("en-GB",{timeZone:city.zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(time)}</small></span><b>{city.code}</b><ArrowUpRight size={12}/></button>)}</div>
  </figure>;
}
