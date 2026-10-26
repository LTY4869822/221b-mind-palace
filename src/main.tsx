import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  useIsPresent,
} from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  Pause,
  Play,
  X,
  Menu,
  Check,
  Copy,
  Compass,
  Film,
  Link as LinkIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { profile, projects, gallery } from "./content";
import "./styles.css";
import "./experience.css";
import "./detective.css";
import "./cinema.css";
import "./performance.css";
import "./narrative.css";
import "./discovery.css";
import "./studio-page.css";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import {
  CaseArchive,
  ClueLibrary,
  PersonalDossier,
  DarkroomConsole,
} from "./DetectivePages";
import { InspirationSignature } from "./DetectiveArtifacts";
import { EvidenceText } from "./components/effects/EvidenceText";
import { CharacterCinema, DetectiveNarrator } from "./CharacterCinema";
import { OPENING_EXIT_MS } from "./opening-character-motion";
import ChapterDirectory from "./ChapterDirectory";
const EvidenceGallery = lazy(() => import("./EvidenceGallery"));
const Opening = lazy(() => import("./Opening"));
const StudioPage = lazy(() => import("./StudioPage"));

type Route = "/" | "/aigc" | "/cases" | "/library" | "/about" | "/studio";
const routes: { path: Route; name: string; english: string; number: string }[] =
  [
    { path: "/", name: "事务所", english: "THE STUDY", number: "01" },
    { path: "/aigc", name: "AIGC 暗房", english: "THE DARKROOM", number: "02" },
    { path: "/cases", name: "项目档案", english: "CASE FILES", number: "03" },
    {
      path: "/library",
      name: "灵感书架",
      english: "THE LIBRARY",
      number: "04",
    },
    {
      path: "/about",
      name: "侦探档案",
      english: "THE DETECTIVE",
      number: "05",
    },
    { path: "/studio", name: "我的工作室", english: "THE STUDIO", number: "06" },
  ];
const getRoute = (): Route => {
  const path = location.hash.slice(1) || "/";
  return routes.some((r) => r.path === path) ? (path as Route) : "/";
};
const asset = (name: string) => `${import.meta.env.BASE_URL}media/${name}`;
const outside = { target: "_blank", rel: "noopener noreferrer" };

function Github({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.57.1.78-.25.78-.55v-2.1c-3.18.7-3.85-1.35-3.85-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.7 1.25 3.36.95.1-.74.4-1.25.73-1.54-2.54-.29-5.21-1.27-5.21-5.65 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .97-.31 3.14 1.17A10.9 10.9 0 0 1 12 6.28c.97 0 1.95.13 2.87.39 2.17-1.48 3.13-1.17 3.13-1.17.63 1.57.24 2.73.12 3.02.73.8 1.17 1.82 1.17 3.07 0 4.39-2.68 5.36-5.23 5.64.41.36.78 1.06.78 2.14v3.08c0 .3.2.66.79.55A11.4 11.4 0 0 0 12 .8Z" />
    </svg>
  );
}

function Monogram({ small = false }: { small?: boolean }) {
  return (
    <span className={`monogram ${small ? "small" : ""}`} aria-hidden="true">
      <span>
        221<span className="letter-b">B</span>
      </span>
      <i />
    </span>
  );
}

function ExtLink({
  href,
  children,
  className = "",
  ...props
}: {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <a href={href} {...outside} className={className} {...props}>
      {children}
    </a>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="eyebrow">
      <span className="tiny-diamond" />
      {typeof children==="string"?<EvidenceText text={children}/>:children}
    </div>
  );
}

function RouteScene({
  children,
  paused,
  prepared=false,
}: {
  children: ReactNode;
  paused: boolean;
  prepared?: boolean;
}) {
  const reduced = useReducedMotion();
  const present = useIsPresent();
  return (
    <motion.div
      className="route-scene"
      aria-hidden={present ? undefined : true}
      inert={!present}
      initial={prepared?false:{
        opacity: 0,
        x: reduced || paused ? 0 : 45,
      }}
      animate={{ opacity: 1, x: 0 }}
      exit={{
        opacity: 0,
        x: reduced || paused ? 0 : -35,
      }}
      transition={{
        duration: reduced || paused ? 0.08 : present ? 0.48 : 0.2,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function ChapterShutter({ label }: { label: string }) {
  const reduced=useReducedMotion();
  if(reduced)return null;
  return <div className="chapter-shutter" aria-hidden="true"><motion.div className="chapter-shutter-fill" initial={{scaleY:0}} animate={{scaleY:[0,1,1,0]}} transition={{duration:.68,times:[0,.22,.42,1],ease:[.22,1,.36,1]}}/><motion.div className="chapter-shutter-label" initial={{opacity:0}} animate={{opacity:[0,1,1,0]}} transition={{duration:.68,times:[0,.22,.42,1]}}><span>THE MIND PALACE</span><strong>{label}</strong><i /></motion.div></div>;
}

function FilmBackground({ paused }: { paused: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const update = () => {
      if (paused || reduced || document.hidden) el.pause();
      else void el.play().catch(() => {});
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [paused, reduced]);
  return (
    <div className="film-scene" aria-hidden="true">
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="auto"
        poster={asset("baker-street.webp")}
      >
        <source src={asset("baker-street-loop.mp4")} type="video/mp4" />
      </video>
      <div className="scene-shade" />
      {!paused && !reduced && (
        <div className="rain-window">
          {Array.from({ length: 21 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 17 + 7) % 100}%`,
                animationDelay: `${-i * 0.37}s`,
                animationDuration: `${1.2 + (i % 5) * 0.25}s`,
              }}
            />
          ))}
        </div>
      )}
      <div className="grain" />
    </div>
  );
}

function Home({deferEntrance=false,deferRig=false}:{deferEntrance?:boolean;deferRig?:boolean}) {
  return (
    <section className="home scene-page" aria-labelledby="home-title">
      <div className="home-vertical">
        OBSERVE THE ORDINARY. CREATE THE EXTRAORDINARY.
      </div>
      <div className="home-copy">
        <Eyebrow>FROM BAKER STREET TO BEIKA CITY</Eyebrow>
        <h1 id="home-title" className="hero-display">
          <span className="hero-line">
            <motion.span
              initial={{ y: "115%", rotate: 3 }}
              animate={{ y: deferEntrance?"115%":"0%", rotate: deferEntrance?3:0 }}
              transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
            >
              The art of
            </motion.span>
          </span>
          <span className="hero-line">
            <motion.em
              initial={{ y: "115%", rotate: 3 }}
              animate={{ y: deferEntrance?"115%":"0%", rotate: deferEntrance?3:0 }}
              transition={{
                duration: 1.05,
                delay: 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              observation.
            </motion.em>
          </span>
        </h1>
        <motion.div
          className="hero-identity"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: deferEntrance?0:1, y: deferEntrance?15:0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <span className="hero-identity-line" />
          <h2>举觞白眼望青天</h2>
          <span className="hero-role">CREATOR & EXPLORER</span>
        </motion.div>
        <p className="home-description">
          在看似寻常的世界里，发现不寻常的可能。
          <br />
          以代码为线索，以想象为答案。
        </p>
        <div className="home-actions">
          <a className="button primary" href="#/cases">
            <span>探索我的创作</span>
            <ArrowUpRight size={18} />
          </a>
          <a className="text-link" href="#/aigc">
            走进 AIGC 暗房 <ArrowRight size={16} />
          </a>
        </div>
        <div className="home-signature">
          <InspirationSignature />
        </div>
      </div>
      <CharacterCinema deferRig={deferRig} />
      <a className="latest-case" href="#/aigc">
        <div className="latest-image">
          <img
            src={asset("aigc-portal.webp")}
            alt="汽车与超现实空间的 AIGC 视觉实验"
          />
        </div>
        <div>
          <span className="micro-label">FROM IMAGINATION TO REALITY</span>
          <strong>让灵感，成为可见的世界。</strong>
          <span className="latest-meta">AIGC EXPLORATIONS / 2026</span>
        </div>
        <span className="circle-arrow">
          <ArrowUpRight size={19} />
        </span>
      </a>
      <a className="hero-index studio-home-entry" href="#/studio">
        <span>THE NEXT CHAPTER</span>
        <b>My studio</b>
        <ArrowUpRight size={18} strokeWidth={1.2} />
      </a>
    </section>
  );
}

function Aigc({
  onArtwork,
  promptSite,
  paused,
}: {
  onArtwork: (index: number) => void;
  promptSite: string;
  paused: boolean;
}) {
  const [filter, setFilter] = useState("全部");
  const [developmentKey, setDevelopmentKey] = useState(0);
  const [developing, setDeveloping] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!developmentKey || paused || reduced) {
      setDeveloping(false);
      return;
    }
    setDeveloping(true);
    const timer = setTimeout(() => setDeveloping(false), 1950);
    return () => clearTimeout(timer);
  }, [developmentKey, paused, reduced]);
  return (
    <section className="aigc-page inner-page" aria-labelledby="aigc-title">
      <div className="page-heading">
        <div>
          <Eyebrow>02 / THE EVIDENCE DARKROOM</Eyebrow>
          <h1 id="aigc-title">
            想象力，<span className="serif-italic">显影中。</span>
          </h1>
          <p>让一个念头穿过算法，成为可以看见的世界。</p>
        </div>
        <DetectiveNarrator mode="conan" label="BEIKA PHOTO LAB" line="让想象，成为新的线索。" />
      </div>
      <div className="aigc-layout">
        <div className="gallery-area" data-developing={developing}>
          <div className="section-bar">
            <ToggleGroup className="filter-tabs" value={filter} onValueChange={setFilter} aria-label="AIGC 作品分类">
              {["全部", "图像", "提示词"].map((x) => (
                <ToggleGroupItem
                  key={x}
                  aria-pressed={filter === x}
                  className={filter === x ? "active" : ""}
                  value={x}
                >
                  {x}
                  <span>
                    {x === "提示词" ? "↗" : x === "图像" ? "03" : "04"}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="micro-label">SELECTED EXPLORATIONS</span>
          </div>
          {filter !== "提示词" ? (
            <Suspense
              fallback={
                <div className="gallery-loading">正在打开空间档案…</div>
              }
            >
              <EvidenceGallery
                onOpen={onArtwork}
                paused={paused}
                developmentKey={developmentKey}
              />
            </Suspense>
          ) : (
            <div className="prompt-filter-result">
              <Compass size={48} strokeWidth={1} />
              <h2>每一份想象，都有方法。</h2>
              <p>完整的提示词与创作方法，收进了 PromptHub。</p>
              <ExtLink
                href={promptSite || profile.promptHub}
                className="button primary"
              >
                {promptSite ? "访问提示词网站" : "打开 PromptHub 项目"}
                <ArrowUpRight size={16} />
              </ExtLink>
            </div>
          )}
          {filter !== "提示词" && (
            <DarkroomConsole
              onDevelop={() => setDevelopmentKey((k) => k + 1)}
              developing={developing}
            />
          )}
          <p className="gallery-footnote">
            原有汽车视觉实验 · 点击作品查看创作方向
          </p>
        </div>
        <aside className="prompthub-card">
          <div className="hub-top">
            <span className="micro-label">MY CREATIVE TOOLBOX</span>
            <ArrowUpRight size={18} />
          </div>
          <div className="hub-symbol">
            <img src={asset("prompthub-mark.png")} alt="PromptHub 标志" />
          </div>
          <span className="tag-outline">PERSONAL PROJECT</span>
          <h2>
            PromptHub<span>灵感，不止于收藏。</span>
          </h2>
          <p>
            我的提示词分享社区。
            <br />
            先看效果，再探索背后的方法。
            <br />
            让好的灵感，被看见、被复用。
          </p>
          <ExtLink
            href={promptSite || profile.promptHub}
            className="button primary"
          >
            {promptSite ? "访问提示词网站" : "探索 PromptHub"}{" "}
            <ArrowUpRight size={17} />
          </ExtLink>
          <ExtLink href={profile.promptHub} className="hub-github">
            <Github size={14} /> 查看项目源码 <ArrowUpRight size={13} />
          </ExtLink>
          <div className="hub-bottom">
            <span className="live-dot" /> ALWAYS EXPLORING
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProjectVisual({ visual }: { visual: string }) {
  if (visual === "portal")
    return (
      <img src={asset("aigc-portal.webp")} alt="PromptHub 的汽车视觉实验" />
    );
  if (visual === "director")
    return (
      <div className="design-visual">
        <span className="design-cross top">+</span>
        <span className="design-cross bottom">+</span>
        <div className="design-orbit" />
        <span className="design-type">
          Dd<span>®</span>
        </span>
        <span className="design-label">
          DESIGN IS A WAY
          <br />
          OF SEEING.
        </span>
        <div className="design-swatches">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  if (visual === "mcworth")
    return (
      <div className="mcworth-visual">
        <div className="receipt">
          <span>McWORTH</span>
          <i />
          <p>
            GOOD FOOD.
            <br />
            <em>Better math.</em>
          </p>
          <div className="receipt-formula">YOUR PLATE × SMARTER CHOICES</div>
          <div className="receipt-barcode" />
        </div>
        <span className="mcworth-corner">
          AN OPEN-SOURCE INVESTIGATION
          <br />
          INTO THE ART OF ORDERING.
        </span>
      </div>
    );
  return (
    <div className="model-visual">
      <div className="model-grid" />
      <div className="model-orb">
        <div className="model-eye" />
        <div className="model-eye second" />
        <div className="model-smile" />
      </div>
      <div className="orbit-ring" />
      <span className="model-label">
        EXPERIMENT N°003
        <br />
        THREE DIMENSIONS. ENDLESS POSSIBILITIES.
      </span>
    </div>
  );
}

function Cases({ onProject, promptSite }: { onProject: (i: number) => void; promptSite: string }) {
  return <CaseArchive onProject={onProject} Visual={ProjectVisual} promptSite={promptSite} />;
}

function Library() {
  return <ClueLibrary />;
}

function About({ onSettings }: { onSettings: () => void }) {
  return <PersonalDossier onSettings={onSettings} />;
}

function Modal({
  open,
  onClose,
  children,
  className = "",
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closer = useRef(onClose);
  closer.current = onClose;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    const cancel = (e: Event) => {
      e.preventDefault();
      closer.current();
    };
    d.addEventListener("cancel", cancel);
    return () => d.removeEventListener("cancel", cancel);
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-content">
        <button
          className="modal-close icon-button"
          aria-label="关闭弹窗"
          onClick={onClose}
        >
          <X size={21} />
        </button>
        {children}
      </div>
    </dialog>
  );
}

function useRainSound() {
  const [enabled, setEnabled] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const toggle = async () => {
    if (enabled) {
      await audio.current?.suspend();
      setEnabled(false);
      return;
    }
    try {
      if (!audio.current) {
        const ctx = new AudioContext();
        audio.current = ctx;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
        const channel = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < channel.length; i++) {
          last = (last + Math.random() * 0.04 - 0.02) / 1.02;
          channel[i] = last * 3.5;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1000;
        gain.current = ctx.createGain();
        gain.current.gain.value = 0.14;
        noise.connect(filter);
        filter.connect(gain.current);
        gain.current.connect(ctx.destination);
        noise.start();
      }
      await audio.current.resume();
      setEnabled(true);
    } catch {
      setEnabled(false);
    }
  };
  useEffect(() => {
    const pause = () => {
      if (document.hidden && audio.current) {
        void audio.current.suspend();
        setEnabled(false);
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      document.removeEventListener("visibilitychange", pause);
      void audio.current?.close();
    };
  }, []);
  return { enabled, toggle };
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute);
  const [entrance,setEntrance]=useState<"idle"|"preparing"|"revealing">("idle");
  const entranceRoute=useRef<Route|null>(null);
  const [openingOpen, setOpeningOpen] = useState(() => {
    if (location.hash === "#/opening") return true;
    if (getRoute() !== "/") return false;
    try { return sessionStorage.getItem("221b-opening-seen-v6") !== "true"; }
    catch { return true; }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(
    () => localStorage.getItem("221b-motion-paused") === "true",
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [artwork, setArtwork] = useState<number | null>(null);
  const [project, setProject] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptSite, setPromptSite] = useState(
    () => localStorage.getItem("221b-prompt-url") || profile.promptHubSite,
  );
  const [draftUrl, setDraftUrl] = useState(promptSite);
  const [urlError, setUrlError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const reduced = useReducedMotion();
  const rain = useRainSound();
  const currentIndex = routes.findIndex((r) => r.path === route);
  const current = routes[currentIndex];
  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => {
      setRoute(getRoute());
      if(location.hash==="#/opening" || getRoute()!==entranceRoute.current) {setEntrance("idle");entranceRoute.current=null;}
      if (location.hash === "#/opening") setOpeningOpen(true);
      else setOpeningOpen(false);
      setMenuOpen(false);
      setCommandOpen(false);
      setArtwork(null);
      setProject(null);
      setSettingsOpen(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.title = `${openingOpen ? "序章 · 思维殿堂" : current.name} — ${profile.name} · 221B`;
    pageRef.current?.scrollTo(0, 0);
    pageRef.current?.focus({ preventScroll: true });
  }, [route, current.name, openingOpen]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    localStorage.setItem("221b-motion-paused", String(paused));
    document.documentElement.dataset.paused = String(paused || reduced);
  }, [paused, reduced]);
  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [artwork]);
  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (draftUrl && !["https:", "http:"].includes(new URL(draftUrl).protocol))
        throw new Error();
    } catch {
      setUrlError("请输入以 https:// 或 http:// 开头的有效网址。");
      return;
    }
    localStorage.setItem("221b-prompt-url", draftUrl);
    setPromptSite(draftUrl);
    setSettingsOpen(false);
    setUrlError("");
  };
  const copyPrompt = async () => {
    if (artwork === null) return;
    const text = gallery[artwork].prompt;
    const fallback = () => {
      const focused = document.activeElement as HTMLElement | null;
      const area = document.createElement("textarea");
      area.value = text;
      area.style.cssText =
        "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
      (document.querySelector(".art-modal[open]") || document.body).appendChild(
        area,
      );
      area.focus();
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        /* Manual copy remains available. */
      }
      area.remove();
      focused?.focus();
      return ok;
    };
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
    } catch {
      const ok = fallback();
      setCopied(ok);
      setCopyError(!ok);
    }
  };
  const openSettings = () => {
    setDraftUrl(promptSite);
    setUrlError("");
    setSettingsOpen(true);
  };
  const finishOpening = (destination: "/" | "/aigc" | "/cases") => {
    try { sessionStorage.setItem("221b-opening-seen-v6", "true"); } catch { /* The entrance remains usable without storage. */ }
    setOpeningOpen(false);
    setRoute(destination);
    location.hash = destination;
  };
  const prepareOpening = (destination:"/"|"/aigc"|"/cases") => {
    entranceRoute.current=destination;
    setRoute(destination);
    setEntrance("preparing");
  };
  return (
    <MotionConfig reducedMotion={paused ? "always" : "user"}>
      <AnimatePresence initial={false}>
      {openingOpen && <Suspense key="prologue" fallback={<div className="opening-loading"><span>221B</span><p>每个故事，都始于好奇。</p></div>}><Opening paused={paused} onTogglePaused={() => setPaused(v => !v)} onPrepare={prepareOpening} onBeginExit={()=>setEntrance("revealing")} onEnter={finishOpening} /></Suspense>}
      {(!openingOpen || entrance!=="idle") && <motion.div key="palace" className={`app route-${route === "/" ? "home" : route.slice(1)}`} data-entrance={openingOpen?entrance:"settled"} inert={openingOpen} aria-hidden={openingOpen || undefined} style={{transformOrigin:"57% 52%"}} initial={openingOpen?false:{opacity:0}} animate={{opacity:1,scale:openingOpen&&entrance==="preparing"?1.035:1}} transition={{duration:paused || reduced ? 0 : entrance!=="idle"?OPENING_EXIT_MS/1000:.42,ease:[.22,1,.36,1]}} onAnimationComplete={() => { if (!openingOpen && document.activeElement === document.body) pageRef.current?.focus({preventScroll:true}); }}>
        <FilmBackground paused={paused || openingOpen || commandOpen || route !== "/"} />
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            pageRef.current?.focus();
          }}
        >
          跳到主要内容
        </a>
        <header className="site-header">
          <a className="brand" href="#/" aria-label="221B 事务所首页">
            <Monogram small />
            <span className="brand-rule" />
            <span className="brand-copy">
              THE MIND PALACE<small>举觞的创意事务所</small>
            </span>
          </a>
          <nav
            className={menuOpen ? "main-nav open" : "main-nav"}
            aria-label="主要导航"
          >
            {routes.map((r) => (
              <a
                href={`#${r.path}`}
                key={r.path}
                className={route === r.path ? "active" : ""}
                aria-current={route === r.path ? "page" : undefined}
              >
                <span className="nav-dot" />
                {r.name}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="command-trigger"
              onClick={() => {
                setCommandOpen(true);
              }}
              aria-label="搜索与快速跳转"
            >
              <Search size={17} />
              <kbd>⌘ K</kbd>
            </button>
            <ExtLink
              className="header-github icon-button"
              href={profile.github}
              title="访问 GitHub 主页"
            >
              <Github size={19} />
            </ExtLink>
            <button
              className="mobile-menu icon-button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "关闭导航" : "打开导航"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </header>
        <main
          id="main-content"
          ref={pageRef}
          tabIndex={-1}
          className="main-stage"
        >
          {!paused && entrance==="idle" && <ChapterShutter key={route} label={routes.find(r=>r.path===route)!.english} />}
          <AnimatePresence mode="wait" initial={false}>
            <RouteScene key={route} paused={paused} prepared={entrance!=="idle"}>
              {route === "/" ? (
                <Home deferEntrance={openingOpen && entrance==="preparing"} deferRig={openingOpen} />
              ) : route === "/aigc" ? (
                <Aigc
                  onArtwork={setArtwork}
                  promptSite={promptSite}
                  paused={paused}
                />
              ) : route === "/cases" ? (
                <Cases onProject={setProject} promptSite={promptSite} />
              ) : route === "/library" ? (
                <Library />
              ) : route === "/studio" ? (
                <Suspense fallback={<div className="studio-dossier" role="status">正在打开工作室档案</div>}><StudioPage /></Suspense>
              ) : (
                <About onSettings={openSettings} />
              )}
            </RouteScene>
          </AnimatePresence>
        </main>
        <footer className="site-footer">
          <div className="footer-motto">
            <span className="tiny-diamond" />
            <span>保持好奇，持续破案。</span>
          </div>
          <div className="chapter-nav" aria-label="页面章节">
            {routes.map((r) => (
              <a
                href={`#${r.path}`}
                aria-label={`第 ${r.number} 章 ${r.name}`}
                aria-current={r.path === route ? "page" : undefined}
                className={r.path === route ? "active" : ""}
                key={r.path}
              >
                <span>{r.number}</span>
                <i />
              </a>
            ))}
          </div>
          <div className="atmosphere-controls">
            <button className="opening-replay" onClick={() => { location.hash = "/opening"; }} aria-label="重看开场序章" title="重看开场序章"><Film size={14} /><span>序章</span></button>
            <span className="footer-divider" />
            <button
              onClick={() => {
                void rain.toggle();
              }}
              aria-label={rain.enabled ? "关闭雨声" : "开启雨声"}
              aria-pressed={rain.enabled}
            >
              {rain.enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>雨声 {rain.enabled ? "ON" : "OFF"}</span>
            </button>
            <span className="footer-divider" />
            <button
              onClick={() => setPaused((v) => !v)}
              aria-label={paused ? "播放背景动效" : "暂停背景动效"}
              aria-pressed={paused}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
              <span>动效</span>
            </button>
          </div>
        </footer>
        <Modal
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          title="线索检索与快速跳转"
          className="command-modal"
        >
          <ChapterDirectory chapters={routes} current={route} open={commandOpen} onClose={()=>setCommandOpen(false)}/>
        </Modal>
        <Modal
          open={artwork !== null}
          onClose={() => setArtwork(null)}
          title="AIGC 视觉实验详情"
          className="art-modal"
        >
          {artwork !== null && (
            <>
              <div className="art-modal-image">
                <img
                  src={asset(gallery[artwork].image)}
                  alt={gallery[artwork].note}
                />
              </div>
              <div className="art-modal-copy">
                <Eyebrow>
                  EXPERIMENT {gallery[artwork].id} / {gallery[artwork].english}
                </Eyebrow>
                <h2>{gallery[artwork].title}</h2>
                <p>{gallery[artwork].note}</p>
                <div className="prompt-box">
                  <div>
                    <span className="micro-label">
                      创作方向参考 · 非原始提示词存档
                    </span>
                    <button
                      onClick={() => {
                        void copyPrompt();
                      }}
                      className="text-link"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <p className="prompt-text">{gallery[artwork].prompt}</p>
                  {copyError && (
                    <p className="copy-error" role="status">
                      未能自动复制，请选中上方文本手动复制。
                    </p>
                  )}
                </div>
                <div className="art-modal-bottom">
                  <button
                    className="outline-button"
                    onClick={() => setArtwork((artwork + 2) % 3)}
                  >
                    <ArrowLeft size={15} /> 上一幅
                  </button>
                  <ExtLink
                    href={promptSite || profile.promptHub}
                    className="text-link"
                  >
                    探索 PromptHub <ArrowUpRight size={16} />
                  </ExtLink>
                  <button
                    className="outline-button"
                    onClick={() => setArtwork((artwork + 1) % 3)}
                  >
                    下一幅 <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </Modal>
        <Modal
          open={project !== null}
          onClose={() => setProject(null)}
          title="项目档案详情"
          className="project-modal"
        >
          {project !== null && (
            <>
              <div
                className={`project-modal-visual ${projects[project].visual}`}
              >
                <ProjectVisual visual={projects[project].visual} />
              </div>
              <div className="project-modal-copy">
                <Eyebrow>
                  CASE NO. {projects[project].id} / {projects[project].type}
                </Eyebrow>
                <h2>{projects[project].title}</h2>
                <p>{projects[project].description}</p>
                <div className="project-tags">
                  {projects[project].tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                {projects[project].href ? (
                  <div className="project-destination-actions">
                    {projects[project].href === profile.promptHub && promptSite && <ExtLink href={promptSite} className="button primary">访问网站 <ArrowUpRight size={16} /></ExtLink>}
                    <ExtLink
                      href={projects[project].href}
                      className={projects[project].href === profile.promptHub && promptSite ? "outline-button" : "button primary"}
                    >
                      <Github size={16} /> {projects[project].href === profile.promptHub ? "GitHub 源码" : "打开 GitHub 项目"}{" "}
                      <ArrowUpRight size={16} />
                    </ExtLink>
                  </div>
                ) : (
                  <>
                    <p className="local-project-note">
                      本地创作档案 · 暂未提供公开仓库链接
                    </p>
                    <ExtLink
                      href={`${profile.github}?tab=repositories`}
                      className="outline-button"
                    >
                      <Github size={16} /> 浏览我的公开项目{" "}
                      <ArrowUpRight size={16} />
                    </ExtLink>
                  </>
                )}
              </div>
            </>
          )}
        </Modal>
        <Modal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title="站点设置"
          className="settings-modal"
        >
          <Eyebrow>THE CONTROL ROOM</Eyebrow>
          <h2>为下一条线索，留一个入口。</h2>
          <p>
            添加 PromptHub 在线地址后，AIGC 暗房会直接跳转到你的提示词网站。
          </p>
          <form onSubmit={saveSettings}>
            <label htmlFor="prompt-site-url">PromptHub 在线网址</label>
            <div className="url-input">
              <LinkIcon size={17} />
              <input
                id="prompt-site-url"
                type="url"
                placeholder="https://your-prompthub.com"
                value={draftUrl}
                onChange={(e) => {
                  setDraftUrl(e.target.value);
                  setUrlError("");
                }}
              />
            </div>
            {urlError && (
              <p className="form-error" role="alert">
                {urlError}
              </p>
            )}
            <p className="settings-note">
              设置保存在当前浏览器。发布时可在 src/content.ts
              中配置默认地址。留空时连接 PromptHub 仓库。
            </p>
            <button className="button primary" type="submit">
              保存入口 <Check size={17} />
            </button>
          </form>
        </Modal>
        <div className="page-announcer" role="status" aria-live="polite">
          {current.name}
        </div>
      </motion.div>}
      </AnimatePresence>
    </MotionConfig>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
