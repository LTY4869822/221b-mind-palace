import { useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

function subscribe(listener:()=>void) {
  const observer=new MutationObserver(listener);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-paused"]});
  return ()=>observer.disconnect();
}
const snapshot=()=>document.documentElement.dataset.paused==="true";

/** Shared policy for all authored effects, including finite transitions. */
export function useSceneMotion() {
  const reduced=useReducedMotion();
  const paused=useSyncExternalStore(subscribe,snapshot,()=>true);
  return {paused,reduced:!!reduced,still:paused||!!reduced};
}
