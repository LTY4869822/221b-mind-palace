import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { ArrowRight, ArrowUpRight, Code2, Film, AudioLines, ScanLine, Workflow, PenTool } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { useSceneMotion } from "./useSceneMotion";
import { profile } from "./content";
import "./studio-page.css";

const studio = `${import.meta.env.BASE_URL}studio-site/`;
const asset = (name: string) => `${import.meta.env.BASE_URL}media/${name}`;
const ease = [0.22, 1, 0.36, 1] as const;
const directions = {
  development: {
    index: "01",
    name: "AI development",
    title: "让想法成为可用的产品",
    description: "从品牌官网、Web 应用到智能体与自动化工作流，把产品逻辑、界面和工程实现连接起来。",
    tags: ["Web applications", "AI agents", "Automation"],
    Icon: Code2,
  },
  motion: {
    index: "02",
    name: "AI filmmaking",
    title: "让想象成为可见的故事",
    description: "从概念、脚本与分镜出发，完成品牌短片、产品广告、AI MV 与叙事影像，让每个镜头拥有自己的表达。",
    tags: ["Brand films", "AI music videos", "Visual storytelling"],
    Icon: Film,
  },
};
type Direction = keyof typeof directions;
const crew = [
  { name: "技术与工程", english: "Engineering", note: "架构 · 前端 · 产品实现", Icon: Workflow },
  { name: "视觉与设计", english: "Visual design", note: "品牌 · 界面 · 概念风格", Icon: PenTool },
  { name: "影像与叙事", english: "Film direction", note: "脚本 · 分镜 · 镜头节奏", Icon: ScanLine },
  { name: "声音与情绪", english: "Sound design", note: "配乐 · 音效 · 听觉氛围", Icon: AudioLines },
];

/** A small, local composition; the studio itself remains a separate destination. */
export default function StudioPage() {
  const { still } = useSceneMotion();
  const [direction, setDirection] = useState<Direction>("development");
  const artifact = useRef<HTMLDivElement>(null);
  const visible = useInView(artifact, { amount: 0.1 });
  const current = directions[direction];
  const DirectionIcon = current.Icon;
  const enter = (delay: number) => ({
    initial: still ? false as const : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: still ? 0 : 0.7, delay: still ? 0 : delay, ease },
  });

  return <section className="studio-dossier" aria-labelledby="studio-title" data-direction={direction} data-still={still}>
    <div className="studio-dossier-topline"><span>06 <i /> THE INDEPENDENT STUDIO</span><span>221B / CODE-ADVENTURE</span></div>
    <div className="studio-intro-grid">
      <motion.header className="studio-intro-copy" {...enter(0)}>
        <p className="studio-intro-eyebrow">MY PRACTICE BEYOND THE STUDY</p>
        <h1 id="studio-title">Code meets<br /><em>Adventure</em></h1>
        <div className="studio-name-line"><i /><span>Code-Adventure <small>AI 工作室</small></span></div>
        <p className="studio-intro-lead">一个人 一群 AI<br />用代码与影像 把想法带到真实世界</p>
        <p className="studio-intro-note">这是我的另一处创作现场。以 OPC 的方式，让 AI 开发与 AI 视频创作在同一张工作台上相遇。</p>
        <div className="studio-primary-actions">
          <a className="studio-visit" href={`${studio}#/`}><span>走进我的工作室</span><ArrowUpRight size={19} strokeWidth={1.4} /></a>
          <a className="studio-conversation" href={`${studio}#/contact`}>聊聊一个想法 <ArrowRight size={15} /></a>
        </div>
      </motion.header>

      <motion.div ref={artifact} className="studio-artifact" {...enter(0.12)} aria-label="Code-Adventure 工作室品牌标志">
        <div className="studio-artifact-corner corner-top" aria-hidden="true" />
        <div className="studio-artifact-corner corner-bottom" aria-hidden="true" />
        <span className="studio-artifact-label">FIELD OBJECT / 006</span>
        <svg className="studio-orbit" viewBox="0 0 640 420" fill="none" aria-hidden="true">
          <ellipse cx="320" cy="210" rx="282" ry="153" stroke="currentColor" strokeWidth=".55" strokeDasharray="1 8" />
          <ellipse cx="320" cy="210" rx="236" ry="181" stroke="currentColor" strokeWidth=".4" opacity=".4" transform="rotate(-23 320 210)" />
          <path className="studio-infinity-trace" d="M320 210C236 82 61 108 72 213C84 334 246 322 320 210C395 99 557 87 568 207C579 312 405 338 320 210Z" stroke="currentColor" strokeWidth=".75" />
          <motion.path key={direction} d="M320 210C236 82 61 108 72 213C84 334 246 322 320 210C395 99 557 87 568 207C579 312 405 338 320 210Z" stroke={direction === "development" ? "#95c9e3" : "#dec49c"} strokeWidth="1.5" initial={still ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.8 }} transition={{ duration: still ? 0 : 1.15, ease }} />
          <path d="M320 16v17m0 354v17M16 210h17m574 0h17" stroke="currentColor" strokeWidth=".75" />
          <circle cx="72" cy="213" r="4" fill="#8abbd3" stroke="#13212b" strokeWidth="2" />
          <circle cx="568" cy="207" r="4" fill="#d9bd8b" stroke="#13212b" strokeWidth="2" />
        </svg>
        <motion.div className="studio-brand-object" animate={still || !visible ? { y: 0, rotate: -7 } : { y: [0, -8, 0], rotate: [-7, -5, -7] }} transition={{ duration: 7, ease: "easeInOut", repeat: still || !visible ? 0 : Infinity }}>
          <img src={asset("studio-mark-neon.png")} alt="Code-Adventure 紫色与粉色立体 A 形标志" width="512" height="512" decoding="async" />
        </motion.div>
        <span className="studio-orbit-label orbit-label-code">CODE <i>01</i></span>
        <span className="studio-orbit-label orbit-label-film">FILM <i>02</i></span>
        <div className="studio-artifact-caption"><span>One mind <i>Infinite possibilities</i></span><small>THE NEXT ADVENTURE IS TAKING SHAPE</small></div>
      </motion.div>
    </div>

    <motion.section className="studio-directions" aria-labelledby="studio-directions-title" {...enter(0.2)}>
      <div className="studio-section-caption"><span>THE TWO PRACTICES</span><h2 id="studio-directions-title">两种语言 同一种好奇心</h2></div>
      <div className="studio-direction-workbench">
        <ToggleGroup className="studio-direction-selector" aria-label="选择工作室创作方向" value={direction} onValueChange={value => { if (value in directions) setDirection(value as Direction); }}>
          <ToggleGroupItem value="development"><span>01</span><Code2 size={17} strokeWidth={1.3} /><b>AI 开发</b><ArrowUpRight size={15} /></ToggleGroupItem>
          <ToggleGroupItem value="motion"><span>02</span><Film size={17} strokeWidth={1.3} /><b>AI 影像</b><ArrowUpRight size={15} /></ToggleGroupItem>
        </ToggleGroup>
        <div className="studio-direction-stage" aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={direction} className="studio-direction-detail" initial={still ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: still ? 0 : 0.22, ease }}>
              <div className="studio-direction-heading"><span><DirectionIcon size={19} strokeWidth={1.2} /> {current.name}</span><span>{current.index} / 02</span></div>
              <h3>{current.title}</h3>
              <p>{current.description}</p>
              <div className="studio-direction-tags">{current.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              <a href={`${studio}#/${direction === "development" ? "services" : "works"}`}>在工作室继续探索 <ArrowRight size={14} /></a>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.section>

    <section className="studio-crew" aria-labelledby="studio-crew-title">
      <div className="studio-crew-intro"><span className="studio-small-label">THE HUMAN IN THE LOOP</span><h2 id="studio-crew-title">一位主理人<br /><em>一群 AI 搭档</em></h2><p>由{profile.name}主理。方向、判断与最终表达由我负责，AI 在研究、开发、设计与影像中协作。</p><a href={`${studio}#/team`}>认识工作室 <ArrowUpRight size={15} /></a></div>
      <div className="studio-crew-ledger"><span className="studio-crew-ledger-label">AI COLLABORATION / 按创作职能协作</span>{crew.map(({ name, english, note, Icon }, index) => <div className="studio-crew-row" key={english}><span className="studio-crew-index">0{index + 1}</span><Icon size={20} strokeWidth={1.2} /><div><h3>{name}<small>{english}</small></h3><p>{note}</p></div></div>)}</div>
    </section>
    <footer className="studio-dossier-end"><span>FROM A CLUE TO A CREATION</span><a href={`${studio}#/contact`}>Every adventure begins with a conversation <ArrowUpRight size={20} strokeWidth={1} /></a><small>举觞的创意事务所 <i /> Code-Adventure</small></footer>
  </section>;
}
