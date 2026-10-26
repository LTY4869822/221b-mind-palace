import { useEffect, useRef, useState } from "react";
import type { RefObject, PointerEvent, KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, MoveUpRight, RotateCcw } from "lucide-react";
import { useSceneMotion } from "./useSceneMotion";
import { worldStage, worldStages } from "./opening-world-motion";
import "./opening-world.css";

type City="london"|"tokyo";
type CityPosition={id:City;x:number;y:number;visible:boolean};
const stories={
  london:{code:"221B",name:"London",coordinate:"51°30 N  000°08 W",title:"The art of deduction",text:"Every observation becomes a line of possibility",destination:"/cases" as const,action:"Open the case files"},
  tokyo:{code:"4869",name:"Tokyo",coordinate:"35°41 N  139°41 E",title:"A curious imagination",text:"Follow the clues where imagination comes to light",destination:"/aigc" as const,action:"Explore the darkroom"},
};

export default function OpeningWorld({sceneHost,disabled=false,onNavigate}:{sceneHost:RefObject<HTMLDivElement|null>;disabled?:boolean;onNavigate:(destination:"/"|"/aigc"|"/cases")=>void|Promise<void>}) {
  const track=useRef<HTMLElement>(null);
  const london=useRef<HTMLButtonElement>(null),tokyo=useRef<HTMLButtonElement>(null);
  const phase=useRef<HTMLOutputElement>(null),status=useRef<HTMLSpanElement>(null);
  const pointer=useRef<{x:number;y:number;dragging:boolean}|null>(null);
  const positions=useRef<CityPosition[]>([]),progress=useRef(0);
  const [city,setCity]=useState<City>("london");
  const {still}=useSceneMotion();
  const policy=useRef({disabled});policy.current={disabled};
  const updateScene=useRef<()=>void>(()=>{});
  const send=(type:string,detail:unknown)=>sceneHost.current?.dispatchEvent(new CustomEvent(type,{detail}));

  useEffect(()=>{updateScene.current();},[disabled]);
  useEffect(()=>{
    const node=track.current,field=sceneHost.current,main=node?.closest<HTMLElement>("[data-opening-scroll]");
    if(!node||!field||!main)return;
    let raf=0;
    let introRetired=false;
    const introControls=Array.from(main.querySelectorAll<HTMLElement>(".opening-stage a,.opening-stage button"));
    const originalTabIndex=new Map(introControls.map(control=>[control,control.getAttribute("tabindex")]));
    const updatePins=()=>{
      // Both layers now occupy the same sticky viewport. No per-frame DOM
      // measurements or compensating for a separately scrolling HTML chapter.
      for(const point of positions.current){
        const button=point.id==="london"?london.current:tokyo.current;
        if(!button)continue;
        button.style.transform=`translate3d(${point.x}px,${point.y}px,0)`;
        const arrival=worldStages(progress.current).route;
        button.style.visibility=point.visible&&arrival>.001&&!policy.current.disabled?"visible":"hidden";
        button.style.pointerEvents=arrival>.7?"auto":"none";
      }
    };
    const measure=()=>node.style.setProperty("--home-stage-height",`${main.clientHeight}px`);
    const applyProgress=(p:number)=>{
      // Follow the rendered, damped glyphs in both directions, rather than raw scroll.
      progress.current=p;
      const stages=worldStages(p),departure=worldStage(p,.045,.40),intro=1-departure;
      main.style.setProperty("--opening-intro",String(intro));
      main.style.setProperty("--opening-departure",String(departure));
      const opening=main.querySelector<HTMLElement>(".opening-stage");
      // Keep the pinned ancestor stable through native scrolling. Inert changes
      // can make Chromium re-anchor the scroll even after it reaches the end.
      // Tab order and aria-hidden retire the fading controls without that jump.
      if(opening)opening.inert=policy.current.disabled;
      if(opening)opening.style.pointerEvents=p>.40?"none":"auto";
      const retire=p>=.40||policy.current.disabled;
      if(retire!==introRetired){
        introRetired=retire;
        opening?.setAttribute("aria-hidden",String(retire));
        introControls.forEach(control=>{
          const saved=originalTabIndex.get(control);
          if(retire)control.setAttribute("tabindex","-1");
          else if(saved===null||saved===undefined)control.removeAttribute("tabindex");
          else control.setAttribute("tabindex",saved);
        });
      }
      node.style.setProperty("--world-reveal",String(stages.signature));
      node.style.setProperty("--world-story",String(stages.story));
      node.style.setProperty("--world-route",String(stages.route));
      node.style.setProperty("--world-arrival",String(p));
      node.dataset.progress=p.toFixed(4);
      node.dataset.phase=p<.2?"departure":p<.46?"sphere":p<.8?"continents":"connection";
      node.dataset.inView=String(p>0);
      node.inert=p<.94||policy.current.disabled;
      node.style.pointerEvents=p>=.94&&!policy.current.disabled?"auto":"none";
      if(phase.current)phase.current.value=`${String(Math.round(p*100)).padStart(2,"0")} / 100`;
      if(status.current)status.current.textContent=p<.46?"A WORLD TAKING SHAPE":p<.8?"TRACING THE CONTINENTS":"TWO CITIES  ONE CURIOSITY";
      updatePins();
    };
    const sync=()=>{
      raf=0;
      const p=Math.max(0,Math.min(1,main.scrollTop/(main.clientHeight*1.35)));
      field.dispatchEvent(new CustomEvent("opening:world",{detail:p}));
    };
    updateScene.current=()=>{sync();applyProgress(progress.current);};
    const schedule=()=>{if(!raf)raf=requestAnimationFrame(sync);};
    const onProgress=(event:Event)=>applyProgress((event as CustomEvent<number>).detail);
    const onCities=(event:Event)=>{positions.current=(event as CustomEvent<CityPosition[]>).detail;updatePins();};
    const ro=new ResizeObserver(()=>{measure();schedule();});ro.observe(main);
    // The WebGL module can finish loading after the first native scroll event.
    const ready=new MutationObserver(schedule);ready.observe(field,{attributes:true,attributeFilter:["data-status"]});
    field.addEventListener("opening:globe-cities",onCities);
    field.addEventListener("opening:world-progress",onProgress);
    field.addEventListener("opening:ready",schedule);
    main.addEventListener("scroll",schedule,{passive:true});
    measure();applyProgress(Number(field.dataset.worldProgress)||0);sync();
    return()=>{ro.disconnect();ready.disconnect();main.removeEventListener("scroll",schedule);field.removeEventListener("opening:globe-cities",onCities);field.removeEventListener("opening:world-progress",onProgress);field.removeEventListener("opening:ready",schedule);cancelAnimationFrame(raf);updateScene.current=()=>{};};
  },[sceneHost]);

  const focusCity=(next:City)=>{setCity(next);send("opening:world-city",next);};
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    const main=track.current?.closest<HTMLElement>("[data-opening-scroll]"),box=main?.getBoundingClientRect();
    if(box)send("opening:world-pointer",{x:event.clientX-box.left,y:event.clientY-box.top});
    if(pointer.current?.dragging){send("opening:world-rotate",{dx:event.clientX-pointer.current.x,dy:event.clientY-pointer.current.y});pointer.current={x:event.clientX,y:event.clientY,dragging:true};}
  };
  const down=(event:PointerEvent<HTMLDivElement>)=>{
    // Native one-finger vertical scrolling remains available through the globe.
    if(event.pointerType==="touch")return;
    pointer.current={x:event.clientX,y:event.clientY,dragging:true};event.currentTarget.setPointerCapture(event.pointerId);
  };
  const up=(event:PointerEvent<HTMLDivElement>)=>{pointer.current=null;if(event.pointerType==="touch")send("opening:world-pointer",{x:-10000,y:-10000});if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
  const keyboard=(event:KeyboardEvent<HTMLDivElement>)=>{
    const directions:Record<string,[number,number]>={ArrowLeft:[-45,0],ArrowRight:[45,0],ArrowUp:[0,-30],ArrowDown:[0,30]};
    if(directions[event.key]){event.preventDefault();send("opening:world-rotate",{dx:directions[event.key][0],dy:directions[event.key][1]});}
    if(event.key==="Home"){event.preventDefault();focusCity("london");}
  };
  const story=stories[city];
  return <section className={`home-world-track world-${city}`} ref={track} aria-labelledby="world-heading">
    <div className="home-world-scene">
      <div className="world-topline"><span>02 / THE WORLD BEYOND THE STUDY</span><span>221B <i/> 4869</span></div>
      <div className="world-editorial">
        <div className="world-kicker"><i/> FOLLOW THE THREAD</div>
        <h2 id="world-heading">Curiosity knows<br/><em>no borders</em></h2>
        <p>From a drop of code<br/>to a world of discovery</p>
        <span className="world-editorial-rule"/>
      </div>
      <div className="world-canvas-wrap">
        <div className="world-input" tabIndex={0} role="img" aria-label="代码雨汇聚的双城地球 鼠标拖动或方向键旋转 Home 定位伦敦" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={()=>{pointer.current=null;}} onPointerLeave={()=>{if(!pointer.current)send("opening:world-pointer",{x:-10000,y:-10000});}} onKeyDown={keyboard}/>
        {(["london","tokyo"] as const).map(id=><button key={id} ref={id==="london"?london:tokyo} className={`world-pin world-pin-${id}`} style={{visibility:"hidden"}} onClick={()=>focusCity(id)} aria-label={`定位${stories[id].name}灵感线索`} aria-pressed={city===id}><i/><span>{stories[id].name}<small>{stories[id].code}</small></span></button>)}
      </div>
      <div className="world-story" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={city} className="world-story-content" initial={{opacity:0,y:still?0:9}} animate={{opacity:1,y:0}} exit={{opacity:0,y:still?0:-6}} transition={{duration:still?0:.24}}>
            <span className="world-story-number">{story.code}<i>FIELD NOTE</i></span>
            <div><h3>{story.title}</h3><p>{story.text}</p><a href={`#${story.destination}`} onClick={event=>{event.preventDefault();void onNavigate(story.destination);}}>{story.action}<ArrowUpRight size={14}/></a></div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="world-bottomline">
        <div className="world-cities" aria-label="选择双城灵感">
          {(["london","tokyo"] as const).map((id,i)=><button key={id} onClick={()=>focusCity(id)} aria-pressed={city===id}><small>0{i+1}</small><span>{stories[id].name}<i>{stories[id].coordinate}</i></span><MoveUpRight size={14}/></button>)}
        </div>
        <button className="world-reset" onClick={()=>focusCity("london")} aria-label="地球复位至伦敦"><RotateCcw size={14}/></button>
      </div>
      <div className="world-instrument"><span ref={status}>A SIGNAL IN THE RAIN</span><i/><output ref={phase}>00 / 100</output><a className="world-image-credit" href={`${import.meta.env.BASE_URL}media/earth-v21/ATTRIBUTION.txt`} title="Earth imagery by Solar System Scope CC BY 4.0" target="_blank" rel="noreferrer">Earth imagery</a><span className="world-drag-hint">DRAG TO EXPLORE</span></div>
    </div>
  </section>;
}

