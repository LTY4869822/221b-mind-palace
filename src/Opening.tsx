import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUpRight, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "./components/ui/button";
import { OPENING_EXIT_MS, OPENING_FORMATION_SECONDS } from "./opening-character-motion";
import { entrancePaint, warmOpeningEntrance } from "./opening-entrance";
import OpeningWorld from "./OpeningWorld";
import "./opening.css";

export type OpeningDestination = "/" | "/aigc" | "/cases";
type OpeningProps = { paused: boolean; onTogglePaused: () => void; onPrepare: (destination: OpeningDestination) => void; onBeginExit: () => void; onEnter: (destination: OpeningDestination) => void };
const ease = [0.22, 1, 0.36, 1] as const;

/** The optical focus mark is part of the scene, rather than a separate toolbar. */
function FocusMark() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle className="focus-outer" cx="32" cy="32" r="28" stroke="currentColor" strokeWidth=".65" strokeDasharray="55 13 7 13" />
    <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth=".5" opacity=".35" />
    <path d="M32 3v7m0 44v7M3 32h7m44 0h7" stroke="currentColor" strokeWidth=".8" />
    <path className="focus-brackets" d="M24 28v-4h4m8 0h4v4m0 8v4h-4m-8 0h-4v-4" stroke="currentColor" />
    <circle cx="32" cy="32" r="1.6" fill="currentColor" />
  </svg>;
}

export default function Opening({ paused, onTogglePaused, onPrepare, onBeginExit, onEnter }: OpeningProps) {
  const reduced = useReducedMotion();
  const still = paused || !!reduced;
  const field = useRef<HTMLDivElement>(null);
  const scroll=useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive=useRef(true),entering=useRef(false);
  const [preparing,setPreparing]=useState(false);
  const [exiting, setExiting] = useState(false);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [formed, setFormed] = useState(false);
  const [phase,setPhase] = useState("rain");

  useEffect(() => {
    const node = field.current;
    if (!node) return;
    setReady(false);
    setAvailable(false);
    setRevealed(false);
    setFormed(false);
    setPhase("rain");
    let dead = false;
    let dispose: (() => void) | undefined;
    void import("./opening-scene").then(({ mountOpeningScene }) => {
      if (dead) return;
      dispose = mountOpeningScene(node, {
        reduced: !!reduced,
        onReady: () => { if (!dead) { setReady(true); setAvailable(node.dataset.portraits === "ready" && node.dataset.status === "ready"); } },
        onFormed: visible => { if (!dead) setFormed(visible); },
        onPhase: value => { if (!dead) setPhase(value); },
      });
    }).catch(() => { if (!dead) { node.dataset.status = "fallback"; setReady(true); } });
    return () => { dead = true; dispose?.(); };
  }, [reduced]);

  useEffect(() => {alive.current=true;return () => {alive.current=false;clearTimeout(timer.current);};}, []);
  const enter = useCallback(async (destination: OpeningDestination) => {
    if (entering.current) return;
    entering.current=true;
    if(still) {onEnter(destination);return;}
    setPreparing(true);
    onPrepare(destination);
    await warmOpeningEntrance();
    await entrancePaint();
    if(!alive.current)return;
    onBeginExit();
    setExiting(true);
    if (field.current) {
      field.current.dataset.exitStartedAt=String(performance.now());
      field.current.dataset.exiting = "true";
    }
    timer.current = setTimeout(() => onEnter(destination), OPENING_EXIT_MS);
  }, [still, onEnter, onPrepare, onBeginExit]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); enter("/"); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [enter]);

  const reveal = () => {
    scroll.current?.scrollTo({top:0,behavior:still?"instant":"smooth"});
    const next = !revealed;
    setRevealed(next);
    setFormed(false);
    field.current?.dispatchEvent(new CustomEvent("opening:reveal", { detail: next }));
  };
  const replay = () => {
    scroll.current?.scrollTo({top:0,behavior:still?"instant":"smooth"});
    setRevealed(false);
    setFormed(false);
    setPhase("rain");
    field.current?.dispatchEvent(new Event("opening:replay"));
  };
  const arrive = (delay: number) => ({
    initial: still ? false as const : { opacity: 0, y: 14 },
    animate: { opacity: exiting ? 0 : 1, y: exiting ? -12 : 0 },
    transition: { duration: exiting ? 0.32 : 1, delay: exiting || still ? 0 : delay, ease },
  });
  const exploreWorld=()=>{
    const root=scroll.current;
    if(root)root.scrollTo({top:root.clientHeight*1.35,behavior:still?"instant":"smooth"});
  };

  return <motion.main ref={scroll} data-opening-scroll className={`opening ${still ? "is-still" : ""} ${exiting ? "is-exiting" : ""}`} aria-label="221B 思维殿堂开场" data-ready={ready} data-revealed={revealed} data-formed={formed} data-phase={phase} data-preparing={preparing} initial={{ opacity: 0 }} animate={{ opacity: exiting ? 0 : 1 }} exit={{ opacity: 0, transition: { duration: 0 } }} transition={{ duration: still ? 0.05 : exiting ? .72 : .4,delay:exiting?.16:0,ease:exiting?[.4,0,.2,1]:ease }}>
    <div className="opening-sequence">
    <div className="opening-visual-rail" aria-hidden="true"><div ref={field} className="opening-field" /></div>
    <div className="opening-stage">
    <motion.svg className="opening-formation-optics" viewBox="0 0 320 320" fill="none" aria-hidden="true" initial={false} animate={{opacity:(revealed && !formed && !still && !exiting) ? .38 : 0}} transition={{duration:still?0:.6}}>
      <motion.g style={{transformOrigin:"160px 160px"}} animate={{rotate:revealed?125:0}} transition={{duration:OPENING_FORMATION_SECONDS,ease:[1/3,0,2/3,1]}}>
        <circle cx="160" cy="160" r="141" stroke="currentColor" strokeWidth=".5" strokeDasharray="96 17 12 31" />
        <circle cx="160" cy="160" r="128" stroke="currentColor" strokeWidth=".35" strokeDasharray="2 8" />
      </motion.g>
      <path d="M160 8v17m0 270v17M8 160h17m270 0h17M58 58l11 11m182 182 11 11M58 262l11-11M251 69l11-11" stroke="currentColor" strokeWidth=".6" />
    </motion.svg>
    <img className="opening-static-holmes" src={`${import.meta.env.BASE_URL}media/holmes-cinematic-v4.webp`} alt="" aria-hidden="true" />
    <div className="opening-grain" aria-hidden="true" />
    <motion.header className="opening-header" {...arrive(.15)}>
      <a className="opening-brand" href="#/" aria-label="221B，进入事务所" onClick={event => { event.preventDefault(); enter("/"); }}>221<span>B</span><i>®</i></a>
      <Button variant="ghost" className="opening-skip" onClick={() => enter("/")} disabled={preparing}>跳过 <ArrowUpRight size={15} /><kbd>ESC</kbd></Button>
    </motion.header>
    <motion.section className="opening-copy" {...arrive(.45)}>
      <p className="opening-kicker"><span /> THE MIND PALACE</p>
      <h1 className="opening-manifesto" lang="en" aria-label="There is only one truth">
        <span className="manifesto-lead">There is only</span>{" "}
        <span className="manifesto-truth">one truth</span>
        <motion.svg className="manifesto-flourish" viewBox="0 0 390 36" fill="none" aria-hidden="true">
          <motion.path d="M6 25C94 2 217 8 341 14C368 16 380 8 369 5C350 0 314 14 301 28M48 33C126 18 215 16 275 21" stroke="currentColor" strokeWidth=".85" strokeLinecap="round" initial={still?false:{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:.65}} transition={{duration:still?0:1.35,delay:still?0:.75,ease}}/>
        </motion.svg>
      </h1>
      <p className="opening-identity">举觞白眼望青天</p>
      <Button className="opening-enter" variant="ghost" onPointerEnter={() => { void warmOpeningEntrance(); }} onFocus={() => { void warmOpeningEntrance(); }} onClick={() => enter("/")} disabled={preparing} aria-busy={preparing && !exiting}>
        进入事务所 <span className="opening-enter-arrow"><ArrowRight size={22} strokeWidth={1} /></span>
      </Button>
    </motion.section>
    <motion.div className="opening-reveal-anchor" {...arrive(1.25)}>
      <Button className="opening-reveal" variant="ghost" onClick={reveal} disabled={preparing || !available} aria-pressed={revealed} aria-label={revealed ? "将柯南散回代码雨" : "将代码雨汇聚成柯南"} title={ready && !available ? "当前设备无法显示字符人物" : undefined}>
        <span className="opening-focus"><FocusMark /><i className="opening-focus-code" aria-hidden="true">4869</i><span className="opening-focus-progress" aria-hidden="true"><i/><i/><i/></span></span>
        <span className="opening-reveal-label">{revealed ? "隐入雨中" : "真相显影"}<span className="opening-reveal-rule" aria-hidden="true"><i /></span></span>
      </Button>
    </motion.div>
    <motion.div className="opening-signature" {...arrive(1)} aria-hidden="true"><span>01</span><i />Sherlock Holmes</motion.div>
    <div className="opening-conan-signature" aria-hidden="true">江户川 柯南</div>
    <motion.footer className="opening-footer" {...arrive(1.3)}>
      <span className="opening-scene-index" aria-hidden="true">221B <i> / </i> 4869</span>
      <div className="opening-controls">
        <Button variant="ghost" aria-label="重播开场" title="重播开场" disabled={preparing} onClick={replay}><RotateCcw size={14} /></Button>
        <Button variant="ghost" aria-label={paused ? "播放开场动效" : "暂停开场动效"} title={paused ? "播放开场动效" : "暂停开场动效"} aria-pressed={paused} onClick={onTogglePaused}>{paused ? <Play size={14} /> : <Pause size={14} />}</Button>
      </div>
    </motion.footer>
    <motion.button className="opening-scroll-cue" onClick={event=>{event.currentTarget.blur();exploreWorld();}} disabled={preparing} aria-label="向下探索代码雨地球" {...arrive(1.4)}><span>Follow the clues</span><ArrowDown size={14} strokeWidth={1}/></motion.button>
    </div>
    <OpeningWorld sceneHost={field} disabled={preparing||exiting} onNavigate={enter}/>
    </div>
    <div className="opening-scroll-distance" aria-hidden="true"/>
    <span className="opening-announcer" role="status">{exiting ? "正在进入事务所" : formed ? "代码雨已汇聚成江户川柯南。再次点击可回到代码雨。" : revealed ? phase==="gather"?"正在收拢代码雨":phase==="trace"?"正在描绘人物轮廓":phase==="develop"?"正在显影人物细节":"" : ""}</span>
  </motion.main>;
}
