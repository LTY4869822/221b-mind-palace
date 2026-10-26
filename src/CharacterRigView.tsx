import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { mountCharacterRig } from "./character-rig";

export default function CharacterRigView({take=0}:{take?:number}) {
  const host=useRef<HTMLDivElement>(null);
  const reduced=useReducedMotion();
  useEffect(()=>{
    if(!host.current)return;
    try { return mountCharacterRig(host.current,!!reduced); }
    catch { host.current.dataset.status="fallback"; }
  },[reduced]);
  useEffect(()=>{host.current?.dispatchEvent(new Event("character:replay"));},[take]);
  return <div className="character-rig-viewport" ref={host} aria-hidden="true" data-status="loading" />;
}
