/** Adapted from Magic UI AnimatedBeam, MIT, Copyright (c) Magic UI.
 * Source: apps/www/registry/magicui/animated-beam.tsx.
 * Uses the existing Motion runtime; finite light travel and shared pause policy.
 * Full notice: public/THIRD_PARTY_MOTION_V11.txt. */
import { useEffect, useId, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { useSceneMotion } from "../../useSceneMotion";

type Anchor=RefObject<HTMLElement|null>;
export function ClueBeam({container,from,to,curvature=60,activity=0,blue=false,className=""}:{
  container:Anchor;from:Anchor;to:Anchor;curvature?:number;activity?:string|number;blue?:boolean;className?:string;
}) {
  const id=useId(),{still}=useSceneMotion();
  const [path,setPath]=useState({d:"",width:1,height:1});
  useEffect(()=>{
    const update=()=>{
      if(!container.current||!from.current||!to.current)return;
      const root=container.current.getBoundingClientRect(),a=from.current.getBoundingClientRect(),b=to.current.getBoundingClientRect();
      const x1=a.left-root.left+a.width/2,y1=a.top-root.top+a.height/2,x2=b.left-root.left+b.width/2,y2=b.top-root.top+b.height/2;
      setPath({d:`M ${x1},${y1} Q ${(x1+x2)/2},${Math.min(y1,y2)-curvature} ${x2},${y2}`,width:root.width,height:root.height});
    };
    const observer=new ResizeObserver(update);
    if(container.current)observer.observe(container.current);
    update();
    return ()=>observer.disconnect();
  },[container,from,to,curvature,activity]);
  return <svg className={`clue-beam ${className}`} width={path.width} height={path.height} viewBox={`0 0 ${path.width} ${path.height}`} fill="none" aria-hidden="true">
    <path d={path.d} stroke={blue?"#6facc1":"#af8064"} strokeWidth=".8" strokeOpacity=".24"/>
    {!still&&<path key={`${activity}-path`} d={path.d} stroke={`url(#${id})`} strokeWidth="1.5" strokeLinecap="round"/>}
    {!still&&<defs><motion.linearGradient key={activity} id={id} gradientUnits="userSpaceOnUse"
      initial={{x1:"-20%",x2:"0%",y1:"0%",y2:"0%"}}
      animate={{x1:["-20%","100%"],x2:["0%","120%"]}}
      transition={{duration:2.4,ease:[.16,1,.3,1],repeat:1,repeatDelay:1.2}}>
      <stop stopColor={blue?"#8bc9e2":"#d8ba88"} stopOpacity="0"/>
      <stop offset="45%" stopColor={blue?"#c9efff":"#f1d6a2"}/>
      <stop offset="100%" stopColor={blue?"#6aa9c7":"#a36350"} stopOpacity="0"/>
    </motion.linearGradient></defs>}
  </svg>;
}
