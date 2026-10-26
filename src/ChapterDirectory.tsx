import {useEffect,useRef,useState,type KeyboardEvent} from "react";
import {AnimatePresence,motion} from "motion/react";
import {ArrowUpRight,Search,X,ArrowDown,ArrowUp} from "lucide-react";
import {EvidencePhoto} from "./components/effects/EvidencePhoto";
import {useSceneMotion} from "./useSceneMotion";

type Chapter={path:string;name:string;english:string;number:string};
const clues:Record<string,{title:string;image:string;line:string;stamp:string}>={
  "/":{title:"The study",image:"baker-street.webp",line:"在贝克街的雾里，开始下一次观察。",stamp:"221B BAKER STREET"},
  "/aigc":{title:"The darkroom",image:"aigc-portal.webp",line:"让一个想法，留下可以被看见的证据。",stamp:"AIGC EXPLORATIONS"},
  "/cases":{title:"Case files",image:"aigc-garage.webp",line:"从 PromptHub 到开源实验，逐一打开卷宗。",stamp:"WORK IN PROGRESS"},
  "/library":{title:"The library",image:"baker-street.webp",line:"沿着设计、动效与工具的线索，继续推理。",stamp:"THE REFERENCE SHELF"},
  "/about":{title:"The detective",image:"holmes-cinematic-v4.webp",line:"两座城市，同一种好奇心。",stamp:"LONDON TO TOKYO"},
  "/studio":{title:"The studio",image:"studio-mark-neon.png",line:"一个人，一群 AI。在代码与影像之间，开始下一次冒险。",stamp:"CODE-ADVENTURE"},
};

export default function ChapterDirectory({chapters,current,open,onClose}:{chapters:Chapter[];current:string;open:boolean;onClose:()=>void}) {
  const [query,setQuery]=useState(""),[selected,setSelected]=useState(current);
  const input=useRef<HTMLInputElement>(null);
  const {still}=useSceneMotion();
  useEffect(()=>{if(!open)return;setQuery("");setSelected(current);const frame=requestAnimationFrame(()=>input.current?.focus());return()=>cancelAnimationFrame(frame);},[open,current]);
  const results=chapters.filter(chapter=>`${chapter.name} ${chapter.english} ${clues[chapter.path].title}`.toLowerCase().includes(query.toLowerCase()));
  const active=results.find(chapter=>chapter.path===selected)||results[0];
  const clue=active?clues[active.path]:null;
  const key=(event:KeyboardEvent<HTMLInputElement>)=>{
    if(event.key==="Enter"&&active){event.preventDefault();location.hash=active.path;onClose();}
    if((event.key==="ArrowDown"||event.key==="ArrowUp")&&results.length){
      event.preventDefault();const index=results.indexOf(active),step=event.key==="ArrowDown"?1:-1;
      setSelected(results[(index+step+results.length)%results.length].path);
    }
  };
  return <motion.div className="chapter-directory" initial={false} animate={{opacity:open?1:0,y:open?0:12}} transition={{duration:still?0:.3}}>
    <header className="chapter-directory-heading"><span>221B <i/> THE CASE INDEX</span><button onClick={onClose} aria-label="关闭章节目录"><X size={17}/></button></header>
    <div className="command-input"><Search size={18}/><input ref={input} autoFocus type="search" aria-label="搜索页面" value={query} onChange={event=>setQuery(event.target.value)} placeholder="追踪下一条线索" onKeyDown={key}/><kbd>ESC</kbd></div>
    <div className="chapter-directory-layout">
      <nav className="chapter-directory-results" aria-label="章节快速跳转">
        {results.map(chapter=><a key={chapter.path} href={`#${chapter.path}`} className={chapter.path===active?.path?"is-selected":""} aria-current={chapter.path===current?"page":undefined} onPointerMove={event=>{if(event.pointerType!=="touch"&&(event.movementX||event.movementY)&&selected!==chapter.path)setSelected(chapter.path);}} onFocus={()=>setSelected(chapter.path)} onClick={onClose}>
          <span className="chapter-directory-number">{chapter.number}</span><span className="chapter-directory-label"><strong>{clues[chapter.path].title}</strong><small>{chapter.name}</small></span><ArrowUpRight size={18}/>
          {chapter.path===active?.path&&<motion.i className="chapter-selection-mark" layoutId="chapter-directory-mark" transition={{duration:still?0:.25,ease:[.22,1,.36,1]}}/>}
        </a>)}
        {!results.length&&<div className="chapter-directory-empty"><span>NO CLUE FOUND</span><p>没有匹配的章节。试试 AIGC 或项目。</p><button onClick={()=>setQuery("")}>查看全部线索 <ArrowUpRight size={14}/></button></div>}
      </nav>
      <aside className={`chapter-directory-preview preview-${active?.path.slice(1)||"home"}`} aria-hidden="true">
        <span className="chapter-preview-caption">A GLIMPSE OF THE NEXT CHAPTER</span>
        <div className="chapter-preview-stage"><span className="photo-back photo-back-one"/><span className="photo-back photo-back-two"/>
          <AnimatePresence initial={false}>{active&&clue&&<EvidencePhoto key={active.path} title={clue.stamp} index={active.number} image={clue.image} kind="FIELD NOTE"/>}</AnimatePresence>
        </div>
        <p>{clue?.line||"每一条线索，都通往新的可能。"}</p><span className="chapter-preview-rule"/>
      </aside>
    </div>
    <footer className="chapter-directory-footer"><span><ArrowUp size={10}/><ArrowDown size={10}/> 选择 <i/> Enter 进入</span><span role="status" aria-live="polite">{active?`第 ${active.number} 章 ${active.name}`:"没有找到线索"}</span></footer>
  </motion.div>;
}
