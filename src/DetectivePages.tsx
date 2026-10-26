import { forwardRef,lazy,Suspense,useRef,useState, type ComponentType } from "react";
import { AnimatePresence,motion,useIsPresent,useMotionValue,useSpring,type HTMLMotionProps } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  SlidersHorizontal,
  Fingerprint,
  ScanLine,
  RotateCcw,
  Aperture,
  FolderOpen,
} from "lucide-react";
import { profile, projects } from "./content";
import resourceData from "./resources.json";
import { DossierCharacter, DetectiveNarrator } from "./CharacterCinema";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { EvidenceText } from "./components/effects/EvidenceText";
import { ClueBeam } from "./components/effects/ClueBeam";
import { EvidencePhoto } from "./components/effects/EvidencePhoto";
import { useSceneMotion } from "./useSceneMotion";
import {
  ArtifactPlate,
  DetectiveCrest,
  PocketWatch,
  ThreadMap,
  Github,
  type DetectiveMode,
} from "./DetectiveArtifacts";

const outside = { target: "_blank", rel: "noopener noreferrer" };
const ease = [0.22, 1, 0.36, 1] as const;
const DetectiveAtlas=lazy(()=>import("./DetectiveAtlas"));

const CasePaper=forwardRef<HTMLElement,HTMLMotionProps<"article">>(function CasePaper(props,ref){
  const present=useIsPresent();
  return <motion.article {...props} ref={ref} inert={!present} aria-hidden={present?undefined:true}/>;
});

function Chapter({ number, english }: { number: string; english: string }) {
  return (
    <div className="chapter-label">
      <span>{number}</span>
      <i />
      <EvidenceText text={english}/>
    </div>
  );
}

export function CaseArchive({
  onProject,
  Visual,
  promptSite,
}: {
  onProject: (i: number) => void;
  Visual: ComponentType<{ visual: string }>;
  promptSite: string;
}) {
  const [filter, setFilter] = useState("全部档案");
  const [selected, setSelected] = useState("001");
  const [preview,setPreview]=useState<string|null>(null);
  const previewBounds=useRef<DOMRect|null>(null);
  const peekX=useMotionValue(0),peekY=useMotionValue(0);
  const springX=useSpring(peekX,{stiffness:190,damping:27}),springY=useSpring(peekY,{stiffness:190,damping:27});
  const {still:reduced}=useSceneMotion();
  const [direction,setDirection]=useState(1);
  const desk=useRef<HTMLDivElement>(null),selectedFile=useRef<HTMLButtonElement>(null),pin=useRef<HTMLSpanElement>(null);
  const visible = projects.filter(
    (p) => filter === "全部档案" || p.category === filter,
  );
  const current = visible.find((p) => p.id === selected) || visible[0];
  const website = current.href === profile.promptHub ? promptSite : "";
  const previewProject=visible.find(project=>project.id===preview&&project.id!==current.id);
  const activeIndex = visible.indexOf(current);
  const choose = (direction: number) => {
    setDirection(direction);
    setSelected(
      visible[(activeIndex + direction + visible.length) % visible.length].id,
    );
  };
  const selectFile=(id:string)=>{setDirection(visible.findIndex(p=>p.id===id)>=activeIndex?1:-1);setSelected(id);};
  return (
    <section className="case-archive inner-page" aria-labelledby="cases-title">
      <div className="archive-heading">
        <div>
          <Chapter number="03" english="THE CASE ARCHIVE" />
          <h1 id="cases-title">
            每个项目，<em>一桩新案。</em>
          </h1>
          <p>灵感是起点，作品是证据。打开一份仍在续写的创作卷宗。</p>
        </div>
        <DetectiveNarrator mode="holmes" label="THE INVESTIGATION" line="每一份作品，都经得起观察。" />
      </div>
      <div className="archive-filter">
        <ToggleGroup className="filter-tabs" value={filter} onValueChange={value=>{setFilter(value);setPreview(null);}} aria-label="项目分类">
          {["全部档案", "AIGC", "Skill", "实验"].map((f) => (
            <ToggleGroupItem
              key={f}
              aria-pressed={f === filter}
              className={f === filter ? "active" : ""}
              value={f}
            >
              {f}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <a href={`${profile.github}?tab=repositories`} {...outside}>
          <Github size={14} />
          查看 GitHub
          <ArrowUpRight size={14} />
        </a>
      </div>
      <div className="case-desk" ref={desk}>
        <ClueBeam container={desk} from={selectedFile} to={pin} curvature={35} activity={current.id} className="case-thread"/>
        <aside className="case-directory" data-preview={previewProject?.id||"none"}>
          <div className="directory-caption">
            <FolderOpen size={15} />
            <span>案件目录</span>
            <b>{String(visible.length).padStart(2, "0")}</b>
          </div>
          <div className="directory-files">
            {visible.map((p) => (
              <button
                key={p.id}
                ref={p.id===current.id?selectedFile:undefined}
                className={`directory-file ${p.id === current.id ? "active" : ""}`}
                aria-pressed={p.id === current.id}
                onClick={() => selectFile(p.id)}
                onPointerEnter={event=>{if(event.pointerType==="touch")return;previewBounds.current=event.currentTarget.getBoundingClientRect();setPreview(p.id);}}
                onPointerMove={event=>{const bounds=previewBounds.current;if(reduced||!bounds)return;peekX.set(Math.max(-8,Math.min(8,(event.clientX-bounds.left-bounds.width*.5)*.08)));peekY.set(Math.max(-7,Math.min(7,(event.clientY-bounds.top-bounds.height*.5)*.15)));}}
                onPointerLeave={()=>{setPreview(null);peekX.set(0);peekY.set(0);}}
                onFocus={()=>setPreview(p.id)}
                onBlur={()=>setPreview(null)}
                aria-label={`选择项目 ${p.title}`}
              >
                <span className="directory-number">{p.id}</span>
                <div>
                  <small>{p.type}</small>
                  <strong>{p.title}</strong>
                </div>
                <ChevronRight size={14} />
                {p.id===current.id&&<motion.i className="directory-active-line" layoutId="case-index-line" transition={{type:"spring",stiffness:360,damping:32}}/>}
              </button>
            ))}
          </div>
          <AnimatePresence>{previewProject&&<motion.div className="case-hover-preview" key={previewProject.id} aria-hidden="true" style={{x:reduced?0:springX,y:reduced?0:springY}} initial={{opacity:0,scale:reduced?1:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:reduced?1:.98}} transition={{duration:reduced?0:.25}}><span className="photo-back photo-back-one"/><span className="photo-back photo-back-two"/><EvidencePhoto title={previewProject.title} index={previewProject.id} kind={previewProject.type}><Visual visual={previewProject.visual}/></EvidencePhoto></motion.div>}</AnimatePresence>
          <div className="archive-timekeeper">
            <PocketWatch />
            <div>
              <span>EVERY DETAIL MATTERS.</span>
              <p>答案，藏在细节里。</p>
            </div>
          </div>
          <div className="directory-footer">
            <span className="case-pin" />
            PRIVATE COLLECTION / 221B
          </div>
        </aside>
        <div className="open-case">
          <div className="case-folder-tabs" aria-label="卷宗快捷目录"><span className="folder-pin" ref={pin}/>{visible.map(p=><button key={p.id} aria-label={`打开第${p.id}号卷宗 ${p.title}`} aria-pressed={p.id===current.id} onClick={()=>selectFile(p.id)}><b>{p.id}</b><span>{p.title}</span></button>)}</div>
          <div className="case-back-sheet" />
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <CasePaper
            key={current.id}
            className="case-document"
            custom={direction}
            variants={{enter:(d:number)=>({opacity:0,x:reduced?0:d*80,rotateY:reduced?0:d*-16,rotateZ:reduced?0:d*1.6}),visible:{opacity:1,x:0,rotateY:0,rotateZ:0},leave:(d:number)=>({opacity:0,x:reduced?0:d*-85,y:reduced?0:-12,rotateY:reduced?0:d*20,rotateZ:reduced?0:d*-3})}}
            initial="enter" animate="visible" exit="leave"
            transition={{ duration: reduced ? 0 : 0.65, ease }}
          >
            <header className="document-top">
              <span>
                <i /> CREATIVE INVESTIGATION
              </span>
              <span>FILE / {current.id}</span>
              <Fingerprint size={18} />
            </header>
            <motion.span className="case-ink-stamp" initial={{opacity:0,scale:reduced?1:1.4,rotate:-15}} animate={{opacity:.65,scale:1,rotate:-9}} transition={{delay:reduced?0:.38,duration:reduced?0:.3}}>EXHIBIT {current.id}<small>CREATIVE EVIDENCE</small></motion.span>
            <div className="document-body">
              <div className="case-exhibit">
                <div className={`case-exhibit-visual ${current.visual}`}>
                  <Visual visual={current.visual} />
                </div>
                <div className="exhibit-caption">
                  <span>EXHIBIT {current.id}</span>
                  <span>{current.type}</span>
                  <ScanLine size={14} />
                </div>
              </div>
              <div className="document-copy">
                <span className="document-case-no">
                  CASE N° <b>{current.id}</b>
                </span>
                <h2><EvidenceText key={current.id} text={current.title}/></h2>
                <p className="document-sub">{current.sub}</p>
                <div className="document-rule" />
                <p className="document-description">{current.description}</p>
                <div className="document-tags">
                  {current.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="case-project-actions">
                  <button
                    className="case-open-button"
                    onClick={() => onProject(projects.indexOf(current))}
                  >
                    <span>打开完整卷宗</span>
                    <ArrowUpRight size={20} />
                  </button>
                  {website && <div className="case-project-links"><a href={website} {...outside}>访问网站 <ArrowUpRight size={13} /></a><a href={current.href} {...outside}><Github size={12} /> GitHub 源码 <ArrowUpRight size={12} /></a></div>}
                </div>
              </div>
            </div>
            <footer className="document-bottom">
              <span>OBSERVE → EXPERIMENT → CREATE</span>
              <span className="file-classification">创作档案 · 持续更新</span>
              <div>
                <button aria-label="上一个项目卷宗" onClick={() => choose(-1)}>
                  <ArrowLeft size={15} />
                </button>
                <span>
                  {activeIndex + 1} / {visible.length}
                </span>
                <button aria-label="下一个项目卷宗" onClick={() => choose(1)}>
                  <ArrowRight size={15} />
                </button>
              </div>
            </footer>
          </CasePaper>
          </AnimatePresence>
        </div>
      </div>
      <div className="archive-endnote">
        <span>THE CASE IS NEVER CLOSED.</span>
        <p>每一个「如果」，都值得被认真追查。</p>
        <span>好奇心 · 未结案</span>
      </div>
    </section>
  );
}

export function ClueLibrary() {
  const [category, setCategory] = useState("全部线索");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const {still:reduced}=useSceneMotion();
  const categories = [
    "全部线索",
    ...new Set(resourceData.map((r) => r.category)),
  ];
  const results = resourceData.filter(
    (r) =>
      (category === "全部线索" || r.category === category) &&
      `${r.name} ${r.tags} ${r.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pageCount = Math.ceil(results.length / 6);
  const reset = () => {
    setQuery("");
    setCategory("全部线索");
    setPage(0);
  };
  return (
    <section
      className="clue-library inner-page"
      aria-labelledby="library-title"
    >
      <div className="archive-heading">
        <div>
          <Chapter number="04" english="THE DEDUCTION BOARD" />
          <h1 id="library-title">
            好设计，<em>有迹可循。</em>
          </h1>
          <p>沿着一条红线，找到下一次创作的灵感。</p>
        </div>
        <DetectiveNarrator mode="holmes" label={`${resourceData.length} DESIGN CLUES`} line="顺着红线，继续推理。" />
      </div>
      <div className="deduction-workspace">
        <aside className="clue-index">
          <div className="clue-index-top">
            <DetectiveCrest mode="holmes" />
            <div>
              BAKER STREET<small>INDEX OF EVIDENCE</small>
            </div>
          </div>
          <ToggleGroup className="clue-index-tabs" value={category} orientation="vertical" aria-label="设计资源分类" onValueChange={value=>{setCategory(value);setPage(0);}}>
            {categories.map((c, i) => (
              <ToggleGroupItem
                key={c}
                className={category === c ? "active" : ""}
                aria-pressed={category === c}
                value={c}
              >
                <span>{String(i).padStart(2, "0")}</span>
                {c}
                <b>
                  {c === "全部线索"
                    ? resourceData.length
                    : resourceData.filter((r) => r.category === c).length}
                </b>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <a
            className="clue-source"
            href="https://x.com/pamelaaaaa1218/status/2111490939604681059"
            {...outside}
          >
            <span>原始线索 / SOURCE</span>
            <strong>Pamela 的设计资源清单</strong>
            <ArrowUpRight size={17} />
          </a>
        </aside>
        <div className="deduction-board">
          <div className="clue-searchbar">
            <label className="clue-search">
              <Search size={18} />
              <input
                aria-label="搜索设计资源"
                value={query}
                placeholder="输入关键词，寻找一条线索…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
              {query && (
                <button
                  aria-label="清除搜索"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <span role="status" aria-live="polite">
              {String(results.length).padStart(2, "0")}{" "}
              <small>CLUES FOUND</small>
            </span>
          </div>
          <div
            className={`pinboard ${results.length < 4 ? "sparse-board" : ""}`}
          >
            <ThreadMap key={`${category}-${page}`} />
            {results.slice(page * 6, page * 6 + 6).map((r, i) => (
              <motion.a
                className={`clue-card clue-tone-${i % 3}`}
                key={r.url}
                href={r.url}
                {...outside}
                initial={{ opacity: 0,y:reduced?0:20,rotate:reduced?0:(i%2?3:-3) }}
                animate={{ opacity: 1,y:0,rotate:0 }}
                whileHover={reduced?undefined:{y:-6,rotate:i%2?1:-1}}
                transition={{
                  duration: reduced ? 0.08 : 0.45,
                  delay: reduced ? 0 : i * 0.035,
                  ease,
                }}
              >
                <span className="clue-tack" />
                <div className="clue-card-top">
                  <span>
                    EVIDENCE /{" "}
                    {String(resourceData.indexOf(r) + 1).padStart(2, "0")}
                  </span>
                  <ArrowUpRight size={17} />
                </div>
                <div className="clue-card-main">
                  <span className="clue-letter">{r.name.slice(0, 1)}</span>
                  <h2>{r.name}</h2>
                  <p>{r.tags}</p>
                </div>
                <div className="clue-card-bottom">
                  <span>{r.category}</span>
                  <span>
                    <i className={r.available ? "collected" : "listed"} />
                    {r.available ? "已采集" : "入口已收录"}
                  </span>
                </div>
              </motion.a>
            ))}
            {results.length === 0 && (
              <div className="empty-clues">
                <Search size={36} strokeWidth={1} />
                <h2>线索暂时中断了。</h2>
                <p>试试「动画」「Skill」或「配色」，继续调查。</p>
                <button onClick={reset}>
                  重新梳理全部线索
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="clue-board-footer">
            <span>公开资料采集 · 部分原站存在访问限制</span>
            <div>
              <button
                aria-label="上一页资源"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {pageCount ? page + 1 : 0} <i>/ {pageCount}</i>
              </span>
              <button
                aria-label="下一页资源"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const artifactNotes = {
  holmes: [
    {
      title: "猎鹿帽与烟斗",
      text: "贝克街的浪漫，是把每一次观察都当作新的开始。",
      position: "hat",
    },
    {
      title: "黄铜怀表",
      text: "耐心对待时间，也认真对待那些容易被忽略的细节。",
      position: "watch",
    },
  ],
  conan: [
    {
      title: "圆框追踪眼镜",
      text: "带着好奇心看世界，把一闪而过的灵感调成清晰的焦点。",
      position: "glasses",
    },
    {
      title: "红色领结",
      text: "冷静的蓝色之外，留下一点鲜明、勇敢的少年气。",
      position: "bow",
    },
  ],
};

export function PersonalDossier({ onSettings }: { onSettings: () => void }) {
  const [mode, setMode] = useState<DetectiveMode>("holmes");
  const [artifact, setArtifact] = useState(0);
  const [view, setView] = useState<"person" | "artifacts" | "atlas">("person");
  const {still:reduced}=useSceneMotion();
  const note = view === "person" ? {
    title: mode === "holmes" ? "观察，是一切推理的起点。" : "好奇心，是永不结案的线索。",
    text: mode === "holmes" ? "喜欢他从细节中发现联系的敏锐，也把这份耐心带进每一次创作。" : "喜欢他追寻真相的执着，也想保留那份敢于探索的少年气。",
  } : view==="atlas"?{
    title:mode==="holmes"?"线索，从贝克街出发。":"好奇心，抵达米花町。",
    text:"伦敦与东京，是这间事务所的两处故事灵感坐标。拖动地球，沿着弧线连接观察与想象。",
  }:artifactNotes[mode][artifact];
  return (
    <section
      className={`personal-dossier inner-page dossier-${mode}`}
      aria-labelledby="about-title"
    >
      <div className="dossier-heading">
        <Chapter number="05" english="THE PERSON BEHIND THE CLUES" />
        <span>
          <Fingerprint size={16} /> PERSONAL FILE / 221B
        </span>
      </div>
      <div className="dossier-layout">
        <div className="artifact-vault">
          <div className="vault-top">
            <span>私 人 珍 藏 / INSPIRATIONS</span>
            <span className="vault-light" />
          </div>
          <ToggleGroup
            className="detective-switch"
            aria-label="侦探灵感主题"
            value={mode}
            onValueChange={value=>{setMode(value as DetectiveMode);setArtifact(0);}}
          >
            <ToggleGroupItem
              aria-pressed={mode === "holmes"}
              className={mode === "holmes" ? "active" : ""}
              value="holmes"
            >
              <DetectiveCrest mode="holmes" />
              <span>
                福尔摩斯<small>SHERLOCK HOLMES</small>
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              aria-pressed={mode === "conan"}
              className={mode === "conan" ? "active" : ""}
              value="conan"
            >
              <DetectiveCrest mode="conan" />
              <span>
                名侦探柯南<small>DETECTIVE CONAN</small>
              </span>
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup className="portrait-view-switch" aria-label="选择珍藏展示" value={view} onValueChange={value=>setView(value as typeof view)}>
            <ToggleGroupItem value="person">人物镜头</ToggleGroupItem>
            <ToggleGroupItem value="artifacts">随身线索</ToggleGroupItem>
            <ToggleGroupItem value="atlas">双城坐标</ToggleGroupItem>
            <span>PORTRAIT / EXHIBITS / ATLAS</span>
          </ToggleGroup>
          <div className={`artifact-stage ${view === "person" ? "portrait-stage" : view==="atlas"?"atlas-stage":""}`}>
            {view === "atlas"?<Suspense fallback={<div className="atlas-loading">正在展开双城坐标</div>}><DetectiveAtlas mode={mode} onSelect={setMode}/></Suspense>:view === "person" ? <DossierCharacter mode={mode} /> : <motion.div
              className="artifact-drawing"
              key={mode}
              initial={{
                opacity: 0,
                y: reduced ? 0 : 16,
                rotate: reduced ? 0 : -3,
              }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: reduced ? 0.08 : 0.6, ease }}
            >
              <ArtifactPlate mode={mode} />
              {artifactNotes[mode].map((n, i) => (
                <button
                  key={n.title}
                  className={`artifact-hotspot hotspot-${n.position} ${artifact === i ? "active" : ""}`}
                  onClick={() => setArtifact(i)}
                  aria-label={`查看${n.title}`}
                  aria-pressed={artifact === i}
                >
                  <span />
                  <i>{String(i + 1).padStart(2, "0")}</i>
                </button>
              ))}
            </motion.div>}
          </div>
          <div className="artifact-note">
            <span>{mode === "holmes" ? "221B" : "4869"}</span>
            <motion.div
              key={`${mode}-${artifact}-${view}`}
              initial={{ opacity: 0, x: reduced ? 0 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2>{note.title}</h2>
              <p>{note.text}</p>
            </motion.div>
            <small>{view === "person" ? "在上方切换侦探，继续这场观察。" :view==="atlas"?"拖动旋转 · 方向键导航 · Home 复位":"点击图上的线索点"}</small>
          </div>
          <div className="vault-bottom">
            <span>
              {mode === "holmes"
                ? "LONDON · BAKER STREET"
                : "TOKYO · BEIKA CITY"}
            </span>
            <span>THE ART OF CURIOSITY</span>
          </div>
        </div>
        <div className="dossier-copy">
          <div className="dossier-file-number">
            SUBJECT N° 221B <i /> OPEN ENDED
          </div>
          <h1 id="about-title">
            观察世界。
            <br />
            <em>创造可能。</em>
          </h1>
          <p className="dossier-intro">
            我是 <strong>{profile.name}</strong>，<br />
            也是 GitHub 上的「{profile.githubName}」。
          </p>
          <p className="dossier-story">
            喜欢福尔摩斯的敏锐，也喜欢柯南追寻真相的执着。把观察变成灵感，把好奇变成行动——创作，是我正在进行的另一场推理。
          </p>
          <div className="dossier-interests">
            <span>DEDUCTION / 侦探与推理</span>
            <span>AIGC / 想象与影像</span>
            <span>CODE / 代码与开源</span>
          </div>
          <div className="dossier-quote">
            <span>“</span>
            <p>
              {mode === "holmes"
                ? "细节里，总有一个尚未被看见的世界。"
                : "真相只有一个，创造的可能不止一种。"}
            </p>
            <small>
              {mode === "holmes"
                ? "INSPIRED BY SHERLOCK HOLMES"
                : "INSPIRED BY DETECTIVE CONAN"}
            </small>
          </div>
          <div className="dossier-actions">
            <a href={profile.github} {...outside} className="button primary">
              <Github size={16} />在 GitHub 找到我
              <ArrowUpRight size={17} />
            </a>
            <button className="outline-button" onClick={onSettings}>
              <SlidersHorizontal size={15} />
              站点设置
            </button>
          </div>
          <div className="dossier-stamp">
            <span>STILL CURIOUS</span>
            <i>好奇心 · 未结案</i>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DarkroomConsole({
  onDevelop,
  developing,
}: {
  onDevelop: () => void;
  developing: boolean;
}) {
  return (
    <div className={`darkroom-console ${developing ? "is-developing" : ""}`}>
      <div className="darkroom-signal">
        <Aperture size={21} />
        <div>
          <span>THE EVIDENCE LAB</span>
          <p>{developing ? "光影，正在显现。" : "让想象，留下证据。"}</p>
        </div>
      </div>
      <div className="exposure-strip" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <button onClick={onDevelop} aria-label="重播作品显影效果">
        <RotateCcw size={13} />
        <span>重播显影</span>
      </button>
    </div>
  );
}
