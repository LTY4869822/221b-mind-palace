import { Suspense, lazy, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, RotateCcw, Clapperboard } from "lucide-react";
import type { DetectiveMode } from "./DetectiveArtifacts";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { Button } from "./components/ui/button";
import { ClueBeam } from "./components/effects/ClueBeam";
import { useSceneMotion } from "./useSceneMotion";
const CharacterRigView=lazy(()=>import("./CharacterRigView"));

const asset = (mode: DetectiveMode) =>
  `${import.meta.env.BASE_URL}media/${mode}-cinematic-v4.webp`;
const people = {
  holmes: { name: "福尔摩斯", english: "SHERLOCK HOLMES", location: "LONDON · 221B", line: "贝克街的雾里，细节先于答案出现。" },
  conan: { name: "江户川柯南", english: "EDOGAWA CONAN", location: "TOKYO · BEIKA", line: "米花町的夜色中，好奇心仍在追寻真相。" },
};

export function CharacterFigure({ mode, priority = false }: { mode: DetectiveMode; priority?: boolean }) {
  return <div className={`character-plane character-plane-${mode}`} data-character-actor={mode}>
    <img src={asset(mode)} width="1024" height="1536" alt={mode === "holmes" ? "手持放大镜、身穿猎鹿帽与长披风的福尔摩斯人物插画" : "戴圆框眼镜、穿蓝色西服红色领结的江户川柯南人物插画"} draggable={false} fetchPriority={priority ? "high" : "auto"} decoding="async" />
  </div>;
}

export function CharacterCinema({deferRig=false}:{deferRig?:boolean}) {
  const [focus, setFocus] = useState<"duo" | DetectiveMode>("duo");
  const [take, setTake] = useState(0);
  const {still}=useSceneMotion();
  const reduced=still;
  const stage=useRef<HTMLDivElement>(null),london=useRef<HTMLButtonElement>(null),beika=useRef<HTMLButtonElement>(null),answer=useRef<HTMLAnchorElement>(null);
  return <div className={`character-cinema cinema-focus-${focus}`} aria-label="福尔摩斯与柯南的侦探电影场景">
    <div className="cinema-topline"><span className="cinema-record" /> A STUDY IN CURIOSITY <i>221B / 4869</i></div>
    <div className="cinema-stage" ref={stage}>
      <div className="cinema-architecture" aria-hidden="true"><span>221B</span><i /><i /><i /></div>
      <div className="deduction-orbit" aria-hidden="true"><svg viewBox="0 0 600 600" fill="none"><ellipse cx="300" cy="300" rx="265" ry="220" transform="rotate(-28 300 300)"/><circle cx="300" cy="300" r="240" strokeDasharray="1 14"/><path d="M300 20v22M300 558v22M20 300h22M558 300h22"/></svg></div>
      <ClueBeam container={stage} from={london} to={answer} curvature={95} activity={`${focus}-${take}`}/>
      <ClueBeam container={stage} from={beika} to={answer} curvature={75} activity={`${focus}-${take}`} blue/>
      <div className="cinema-beam beam-gold" aria-hidden="true" /><div className="cinema-beam beam-blue" aria-hidden="true" />
      <div className="cinema-characters">
        <motion.div className="cinema-person cinema-holmes" initial={false} animate={{x:focus==="holmes"?"17%":focus==="conan"?"-33%":"0%",y:focus==="holmes"?"3%":"0%",scale:focus==="holmes"?1.04:focus==="conan"?.94:1,opacity:focus==="conan"?.12:1}} transition={{duration:reduced?0:.85,ease:[.22,1,.36,1]}}><CharacterFigure mode="holmes" priority /></motion.div>
        <motion.div className="cinema-person cinema-conan" initial={false} animate={{x:focus==="conan"?"-28%":focus==="holmes"?"44%":"0%",scale:focus==="conan"?1.13:focus==="holmes"?.91:1,opacity:focus==="holmes"?.14:1}} transition={{duration:reduced?0:.85,ease:[.22,1,.36,1]}}><CharacterFigure mode="conan" priority /></motion.div>
        {!deferRig&&<Suspense fallback={null}><CharacterRigView take={take} /></Suspense>}
      </div>
      {!reduced&&!deferRig&&<motion.div key={`${focus}-${take}`} className="optical-cut" initial={{opacity:0,scale:1.12,rotate:-12}} animate={{opacity:[0,.6,0],scale:[1.12,.97,1.025],rotate:0}} transition={{duration:1.1,times:[0,.28,1],ease:[.22,1,.36,1]}} aria-hidden="true"/>}
      <div className="cinema-haze" aria-hidden="true" />
      <div className="cinema-clues">
        <button ref={london} className="city-clue clue-london" aria-label="追踪贝克街线索，聚焦福尔摩斯" aria-pressed={focus==="holmes"} onClick={()=>setFocus("holmes")}><span>01</span><i/><small>LONDON</small></button>
        <button ref={beika} className="city-clue clue-beika" aria-label="追踪米花町线索，聚焦柯南" aria-pressed={focus==="conan"} onClick={()=>setFocus("conan")}><span>02</span><i/><small>BEIKA</small></button>
        <a ref={answer} className="deduction-answer" href={focus==="conan"?"#/aigc":"#/cases"}><span>{focus==="duo"?"CONNECT THE CLUES":focus==="holmes"?"THE ART OF DEDUCTION":"FOLLOW YOUR CURIOSITY"}</span><ArrowUpRight size={13}/></a>
      </div>
      <div className="cinema-frame-corner corner-tl" aria-hidden="true" /><div className="cinema-frame-corner corner-br" aria-hidden="true" />
      <div className="cinema-title-card" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={focus} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
            <span>{focus === "duo" ? "TWO CITIES. ONE CURIOSITY." : people[focus].english}</span>
            <p>{focus === "duo" ? "两座城市，同一种好奇心。" : people[focus].line}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    <div className="cinema-controls">
      <ToggleGroup className="shot-selector" value={focus} onValueChange={value=>setFocus(value as typeof focus)} aria-label="选择人物镜头">
      {([ ["duo", "双人镜头"], ["holmes", "福尔摩斯"], ["conan", "江户川柯南"] ] as const).map(([id, name], i) => <ToggleGroupItem key={id} value={id}><span>0{i + 1}</span>{name}</ToggleGroupItem>)}
      </ToggleGroup>
      <Button className="cinema-replay" onClick={() => setTake(v => v + 1)} aria-label="重播人物表演" title="重播眨眼、推眼镜与披风动作"><RotateCcw size={14} /></Button>
    </div>
    <span className="performance-cue"><Clapperboard size={11}/>{focus==="holmes"?"披风随风，思绪未停。":focus==="conan"?"抬手，凝神；线索就在眼前。":"风过贝克街，夜临米花町。"}</span>
  </div>;
}

export function DossierCharacter({ mode }: { mode: DetectiveMode }) {
  const {still}=useSceneMotion();
  return <motion.div key={mode} className={`dossier-character dossier-character-${mode}`} initial={{ opacity: 0,clipPath:still?"inset(0)":"inset(0 100% 0 0)" }} animate={{ opacity: 1,clipPath:"inset(0 0% 0 0)" }} transition={{ duration:still?0:.8,ease:[.22,1,.36,1] }}>
    <div className="portrait-architecture" aria-hidden="true">{mode === "holmes" ? "221B" : "4869"}</div>
    <div className="portrait-light" aria-hidden="true" />
    <div className="dossier-character-figure"><CharacterFigure mode={mode} /><Suspense fallback={null}><CharacterRigView /></Suspense></div>
    <div className="portrait-vignette" aria-hidden="true" />
    <div className="portrait-location"><span />{people[mode].location}</div>
    <div className="portrait-name"><span>THE INSPIRATION</span><strong>{people[mode].name}</strong><i>{people[mode].english}</i></div>
  </motion.div>;
}

export function DetectiveNarrator({ mode, line, label }: { mode: DetectiveMode; line: string; label: string }) {
  return <a className={`detective-narrator narrator-${mode}`} href="#/about" aria-label={`查看${people[mode].name}人物档案`}>
    <div className="narrator-portrait"><CharacterFigure mode={mode} /></div>
    <span className="narrator-lines"><small>{label}</small><strong>{line}</strong><i>{people[mode].english} <ArrowUpRight size={12} /></i></span>
  </a>;
}
