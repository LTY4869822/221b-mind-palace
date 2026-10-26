import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Clock3, Command, ExternalLink, Fingerprint, Layers3, Search, Star, X } from "lucide-react";
import { Button } from "./components/ui/button";
import { Github } from "./DetectiveArtifacts";
import { useSceneMotion } from "./useSceneMotion";
import "./skill-collection.css";

export type SkillCatalogEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryLabel?: string;
  useCases?: string[];
  howTo?: string[];
  example?: { prompt: string; expectedOutput?: string } | null;
  inputs?: string[];
  outputs?: string[];
  contentQuality?: { summary?: string; workflow?: string; inputs?: string; outputs?: string };
  source?: { label: string; kind: "local" | "plugin" | "repository"; skillFile?: string };
  repository?: { url: string; owner?: string; name?: string; stars: number | null; starsUpdatedAt: string | null } | null;
  cover?: {
    kind?: "research" | "design" | "code" | "writing" | "motion" | "data" | "general";
    categoryKind?: string;
    accent?: string;
    image?: string;
    position?: string;
    sprite?: { sheet: string; column: number; row: number; columns: number; rows: number };
  };
};

export type SkillCollectionProps = {
  entries: SkillCatalogEntry[];
  updatedAt?: string | null;
  loading?: boolean;
  error?: string | null;
};

type Sort = "stars" | "name";
const PAGE_SIZE = 12;
const ALL = "__all__";
const CLICK_DELAY = 520;
const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
const starFormatter = new Intl.NumberFormat("en-US");
const outside = { target: "_blank", rel: "noopener noreferrer" } as const;
const dateFormatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
const genericSteps = ["在支持 Skill 的助手或开发环境中启用这份技能", "说明目标、已有材料与约束，按技能要求补充输入", "检查输出结果，再给出具体反馈继续迭代"];

/** Only actual GitHub repository URLs may open through the double-click shortcut. */
export function skillRepositoryUrl(entry: SkillCatalogEntry): string | null {
  if (!entry.repository?.url) return null;
  try {
    const url = new URL(entry.repository.url);
    if (url.protocol !== "https:" || !["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
  } catch { return null; }
}

function starsOf(entry: SkillCatalogEntry) {
  const value = entry.repository?.stars;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** All-category view keeps each category together; unknown counts always follow known ones. */
export function orderSkillEntries(entries: SkillCatalogEntry[], sort: Sort = "stars", groupByCategory = true): SkillCatalogEntry[] {
  return [...entries].sort((a, b) => {
    const categoryOrder = groupByCategory ? collator.compare(a.categoryLabel || a.category, b.categoryLabel || b.category) : 0;
    if (categoryOrder) return categoryOrder;
    if (sort === "stars") {
      const aStars = starsOf(a), bStars = starsOf(b);
      if (aStars === null && bStars !== null) return 1;
      if (aStars !== null && bStars === null) return -1;
      if (aStars !== null && bStars !== null && aStars !== bStars) return bStars - aStars;
    }
    return collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
  });
}

function readableDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

function sourceFile(value?: string) {
  if (!value) return null;
  const normalized = value.replace(/\\/g, "/");
  const relative = normalized.match(/(?:^|\/)(\.(?:codex|agents|claude)\/.*)$/)?.[1];
  return relative || (/^(?:[a-z]:\/|\/)/i.test(normalized) ? normalized.split("/").slice(-2).join("/") : normalized);
}

function coverUrl(value: string) {
  if (/^https:\/\//i.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, "")}`;
}

function SkillCover({ entry, large = false }: { entry: SkillCatalogEntry; large?: boolean }) {
  const cover = entry.cover;
  const sprite = cover?.sprite;
  const validSprite = sprite && sprite.columns > 0 && sprite.rows > 0 && sprite.column >= 0 && sprite.column < sprite.columns && sprite.row >= 0 && sprite.row < sprite.rows;
  const kind = cover?.categoryKind || cover?.kind || "general";
  const spriteStyle: CSSProperties | undefined = validSprite ? {
    backgroundImage: `url("${coverUrl(sprite.sheet)}")`,
    backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
    backgroundPosition: `${sprite.columns === 1 ? 0 : sprite.column / (sprite.columns - 1) * 100}% ${sprite.rows === 1 ? 0 : sprite.row / (sprite.rows - 1) * 100}%`,
  } : undefined;
  return <div className={`skill-cover ${large ? "is-large" : ""} cover-${kind}`} aria-hidden="true">
    {validSprite ? <div className="skill-cover-art skill-cover-sprite" style={spriteStyle} /> : cover?.image ? <img className="skill-cover-art" src={coverUrl(cover.image)} alt="" loading="lazy" decoding="async" style={{ objectPosition: cover.position || "center" }} /> : <div className="skill-cover-awaiting"><span>ARTWORK PENDING</span><i /><b>{entry.categoryLabel || entry.category}</b></div>}
    <div className="skill-cover-film" /><div className="skill-cover-graticule" /><span className="skill-cover-topline">THE SKILL COLLECTION <i /></span>
  </div>;
}

function Stars({ entry, verbose = false }: { entry: SkillCatalogEntry; verbose?: boolean }) {
  const stars = starsOf(entry), date = readableDate(entry.repository?.starsUpdatedAt);
  return <span className={`skill-stars ${stars === null ? "is-unknown" : ""}`} title={stars === null ? "未关联可核实的仓库 Stars 此处不以零代替" : `GitHub 仓库 Stars${date ? ` · ${date}` : ""}`}><Star size={12} strokeWidth={1.4} fill={stars === null ? "none" : "currentColor"} /><span>{stars === null ? verbose ? "暂无可核实的仓库 Stars" : "暂无仓库" : starFormatter.format(stars)}</span>{verbose && stars !== null && <small>GitHub Stars</small>}</span>;
}

type SkillSelectionRequest = (entry: SkillCatalogEntry, trigger: HTMLElement, immediate?: boolean) => void;

const SkillCard = memo(function SkillCard({ entry, index, still, pending, onRequestSelect, onCancelRequest }: { entry: SkillCatalogEntry; index: number; still: boolean; pending: boolean; onRequestSelect: SkillSelectionRequest; onCancelRequest: () => void }) {
  const rotateX = useMotionValue(-4), rotateY = useMotionValue(0);
  const smoothX = useSpring(rotateX, { stiffness: 190, damping: 24 }), smoothY = useSpring(rotateY, { stiffness: 190, damping: 24 });
  const bounds = useRef<DOMRect | null>(null), pointerType = useRef("mouse");
  const repo = skillRepositoryUrl(entry);
  const select = (event: MouseEvent<HTMLButtonElement>) => {
    const trigger = event.currentTarget;
    if (event.detail > 1) { onCancelRequest(); return; }
    onRequestSelect(entry, trigger, event.detail === 0 || pointerType.current === "touch");
  };
  const doubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); onCancelRequest();
    if (repo) window.open(repo, "_blank", "noopener,noreferrer");
    else onRequestSelect(entry, event.currentTarget, true);
  };
  return <motion.article className="skill-holo-card" data-has-repository={!!repo} data-pending={pending} initial={still ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: still ? 0 : 0.4, delay: still ? 0 : index % 4 * 0.035, ease: [0.22, 1, 0.36, 1] }}>
    <div className="skill-projection-beam" aria-hidden="true" /><div className="skill-projection-floor" aria-hidden="true"><i /><i /><b /></div>
    <motion.div className="skill-holo-shell" style={{ rotateX: still ? 0 : smoothX, rotateY: still ? 0 : smoothY }} onPointerEnter={event => { pointerType.current = event.pointerType; bounds.current = event.currentTarget.getBoundingClientRect(); }} onPointerMove={event => {
      if (still || event.pointerType === "touch" || !bounds.current) return;
      const rect = bounds.current;
      rotateX.set(-4 - Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / (rect.height / 2))) * 4);
      rotateY.set(Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / (rect.width / 2))) * 7);
    }} onPointerLeave={() => { bounds.current = null; rotateX.set(-4); rotateY.set(0); }}>
      <button className="skill-card-open" onPointerDown={event => { pointerType.current = event.pointerType; onCancelRequest(); }} onClick={select} onDoubleClick={doubleClick} aria-label={`查看 ${entry.name} 技能详情`} aria-haspopup="dialog" aria-busy={pending || undefined}>
        <SkillCover entry={entry} />
        <span className="skill-card-holo-foil" aria-hidden="true" /><span className="skill-card-edge" aria-hidden="true" />
        <span className="skill-card-copy"><span className="skill-card-category">{entry.categoryLabel || entry.category}<span>{String(index + 1).padStart(2, "0")}</span></span><strong>{entry.name}</strong><span className="skill-card-description">{entry.description || "查看技能用途与原始说明"}</span><span className="skill-card-caption"><Stars entry={entry} /><span className="skill-card-open-caption">{pending ? "正在打开" : "打开档案"} <ArrowUpRight size={12} /></span></span></span>
      </button>
      <div className="skill-card-source"><span><Fingerprint size={10} /> {entry.source?.kind === "plugin" ? "PLUGIN SKILL" : entry.source?.kind === "repository" ? "REPOSITORY SKILL" : "LOCAL SKILL"}</span>{repo ? <a href={repo} {...outside} aria-label={`打开 ${entry.name} 的 GitHub 仓库`} onPointerDown={event => { onCancelRequest(); event.stopPropagation(); }} onClick={event => { onCancelRequest(); event.stopPropagation(); }}><Github size={11} /><span>仓库</span><ArrowUpRight size={10} /></a> : <span className="skill-no-repository">未关联仓库</span>}</div>
    </motion.div>
  </motion.article>;
});

function SkillDetails({ entry, trigger, still, onClose }: { entry: SkillCatalogEntry | null; trigger: RefObject<HTMLElement | null>; still: boolean; onClose: () => void }) {
  const retained = useRef<SkillCatalogEntry | null>(null);
  if (entry) retained.current = entry;
  const skill = entry || retained.current;
  const repo = skill ? skillRepositoryUrl(skill) : null;
  const starsDate = readableDate(skill?.repository?.starsUpdatedAt);
  const useCases = skill?.useCases?.filter(Boolean) || [];
  const steps = skill?.howTo?.length ? skill.howTo : genericSteps;
  const guidedInputs = skill?.contentQuality?.inputs === "category-guidance";
  const guidedOutputs = skill?.contentQuality?.outputs === "category-guidance";
  return <Dialog.Root open={entry !== null} onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="skill-detail-backdrop" data-still={still} />
      <Dialog.Popup className="skill-detail-dialog" data-still={still} finalFocus={trigger}>
        {skill && <>
          <header className="skill-detail-toolbar"><span><Layers3 size={13} /> SKILL FIELD NOTES</span><Dialog.Close className="skill-detail-close" aria-label="关闭技能详情"><X size={19} strokeWidth={1.4} /></Dialog.Close></header>
          <div className="skill-detail-intro"><div className="skill-detail-art"><SkillCover entry={skill} large /><span className="skill-detail-art-caption">CREATIVE INSTRUMENT / {skill.categoryLabel || skill.category}</span></div><div className="skill-detail-identity"><span className="skill-detail-category">{skill.categoryLabel || skill.category}</span><Dialog.Title className="skill-detail-title">{skill.name}</Dialog.Title><Dialog.Description className="skill-detail-description">{skill.description || "这份技能尚未整理用途摘要，请参阅原始技能说明。"}</Dialog.Description><Stars entry={skill} verbose /><p className="skill-detail-sync"><Clock3 size={11} />{starsDate ? `Stars 更新于 ${starsDate}` : "Stars 暂无快照"}</p>{repo ? <a className="skill-detail-repository" href={repo} {...outside}><Github size={15} /> 打开 GitHub 仓库 <ArrowUpRight size={15} /></a> : <p className="skill-detail-no-repo">尚未关联可确认的 GitHub 仓库</p>}</div></div>
          <div className="skill-detail-sections">
            <section className="skill-detail-section"><div className="skill-detail-section-heading"><span>01</span><h3>它能做什么</h3><BookOpen size={15} /></div>{useCases.length ? <ul>{useCases.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{skill.description || "具体用途以原始技能说明为准。"}</p>}</section>
            <section className="skill-detail-section"><div className="skill-detail-section-heading"><span>02</span><h3>从这里开始</h3><Command size={15} /></div><p className="skill-detail-section-note">{skill.howTo?.length ? "原文玩法要点节选 完整流程以技能定义为准" : "通用上手流程"}</p><ol>{steps.map((step, index) => <li key={`${index}-${step}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol></section>
            <section className="skill-detail-section skill-example-section"><div className="skill-detail-section-heading"><span>03</span><h3>一次具体的尝试</h3><ArrowUpRight size={15} /></div>{skill.example?.prompt ? <><span className="skill-example-label">TRY THIS / 建议尝试</span><pre className="skill-example-prompt">{skill.example.prompt}</pre>{skill.example.expectedOutput && <div className="skill-example-output"><span>{guidedOutputs ? "交付方向参考" : "预期结果"}</span><p>{skill.example.expectedOutput}</p></div>}</> : <p className="skill-detail-muted">尚未整理可确认的示例。查看原始 SKILL.md，了解技能提供的具体用法。</p>}</section>
            <section className="skill-detail-section skill-io-section"><div className="skill-io-column"><h3>需要提供什么 <span>INPUT</span></h3>{guidedInputs && <p className="skill-io-guidance">按用途分类提供的输入参考</p>}{skill.inputs?.length ? <ul>{skill.inputs.map((input, index) => <li key={`${index}-${input}`}>{input}</li>)}</ul> : <p>以原始技能说明中的输入要求为准</p>}</div><div className="skill-io-column"><h3>会得到什么 <span>OUTPUT</span></h3>{guidedOutputs && <p className="skill-io-guidance">按用途分类提供的交付参考 具体以技能定义为准</p>}{skill.outputs?.length ? <ul>{skill.outputs.map((output, index) => <li key={`${index}-${output}`}>{output}</li>)}</ul> : <p>以原始技能说明中的输出约定为准</p>}</div></section>
          </div>
          <footer className="skill-detail-provenance"><span>SOURCE / 来源</span><p>{skill.source?.label || "本机技能收藏"}</p>{sourceFile(skill.source?.skillFile) && <code>{sourceFile(skill.source?.skillFile)}</code>}{repo && <a href={repo} {...outside}>{repo.replace("https://github.com/", "")} <ExternalLink size={11} /></a>}<small>Stars 属于来源仓库 多个技能可能共享同一个仓库</small></footer>
        </>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}

export default function SkillCollection({ entries, updatedAt = null, loading = false, error = null }: SkillCollectionProps) {
  const { still } = useSceneMotion();
  const [category, setCategory] = useState(ALL), [query, setQuery] = useState(""), [sort, setSort] = useState<Sort>("stars"), [page, setPage] = useState(0), [selected, setSelected] = useState<SkillCatalogEntry | null>(null), [pendingId, setPendingId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const grid = useRef<HTMLDivElement>(null), trigger = useRef<HTMLElement | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRequest = useCallback(() => {
    if (clickTimer.current !== null) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    setPendingId(null);
  }, []);
  const requestSelect = useCallback<SkillSelectionRequest>((entry, element, immediate = false) => {
    cancelRequest();
    if (immediate) { trigger.current = element; setSelected(entry); return; }
    setPendingId(entry.id);
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      setPendingId(null);
      if (!element.isConnected) return;
      trigger.current = element;
      setSelected(entry);
    }, CLICK_DELAY);
  }, [cancelRequest]);
  useEffect(() => { cancelRequest(); }, [category, query, deferredQuery, sort, page, cancelRequest]);
  useEffect(() => () => { if (clickTimer.current !== null) clearTimeout(clickTimer.current); }, []);
  const categories = useMemo(() => {
    const byCategory = new Map<string, { id: string; label: string; count: number }>();
    for (const entry of entries) {
      const current = byCategory.get(entry.category);
      if (current) current.count++;
      else byCategory.set(entry.category, { id: entry.category, label: entry.categoryLabel || entry.category, count: 1 });
    }
    return [{ id: ALL, label: "全部分类", count: entries.length }, ...[...byCategory.values()].sort((a, b) => collator.compare(a.label, b.label))];
  }, [entries]);
  const searchable = useMemo(() => entries.map(entry => ({ entry, text: [entry.name, entry.description, entry.category, entry.categoryLabel, entry.repository?.owner, entry.repository?.name, ...(entry.useCases || []), ...(entry.inputs || []), ...(entry.outputs || [])].filter(Boolean).join(" ").toLocaleLowerCase() })), [entries]);
  const results = useMemo(() => {
    const terms = deferredQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = searchable.filter(item => (category === ALL || item.entry.category === category) && terms.every(term => item.text.includes(term))).map(item => item.entry);
    return orderSkillEntries(matches, sort, category === ALL);
  }, [searchable, deferredQuery, category, sort]);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages - 1);
  const visible = results.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);
  const knownStars = useMemo(() => entries.filter(entry => starsOf(entry) !== null).length, [entries]);
  const date = readableDate(updatedAt);
  useEffect(() => { setPage(0); }, [category, deferredQuery, sort]);
  useEffect(() => { if (category !== ALL && !categories.some(item => item.id === category)) setCategory(ALL); }, [categories, category]);
  const goToPage = (next: number) => {
    cancelRequest();
    setPage(Math.max(0, Math.min(totalPages - 1, next)));
    grid.current?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    grid.current?.focus({ preventScroll: true });
  };

  return <section className="skill-collection" aria-labelledby="skill-collection-title" data-still={still} data-count={entries.length}>
    <header className="skill-collection-heading"><div><span className="skill-collection-eyebrow"><i /> THE HOLOGRAPHIC COLLECTION</span><h1 id="skill-collection-title">把能力 <em>收藏成光</em></h1><p>从本机技能里发现下一件创作工具 每张投影都是一份可打开的档案</p></div><div className="skill-collection-seal" aria-label={`收藏 ${entries.length} 份技能`}><Layers3 size={15} strokeWidth={1.2} /><strong>{entries.length.toLocaleString()}</strong><span>SKILLS IN THE ARCHIVE</span></div></header>
    <div className="skill-collection-instructions"><span><span className="skill-mouse-mark" aria-hidden="true" /> 单击看玩法 <i /> 双击打开 GitHub</span><span>未关联仓库的卡片仍可打开玩法</span></div>
    <Tabs.Root className="skill-collection-browser" value={category} onValueChange={value => { if (typeof value === "string") setCategory(value); }}>
      <div className="skill-collection-controls"><label className="skill-search"><Search size={16} strokeWidth={1.5} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索技能 名称 用途" aria-label="搜索技能名称和用途" />{query && <button type="button" onClick={() => setQuery("")} aria-label="清空技能搜索"><X size={14} /></button>}<kbd>FIND A CLUE</kbd></label><label className="skill-sort"><ArrowDownWideNarrow size={14} /><span className="skill-visually-hidden">技能排序方式</span><select value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="stars">分类内 Stars 从高到低</option><option value="name">分类内按名称排序</option></select></label></div>
      <Tabs.List className="skill-category-tabs" aria-label="技能用途分类">{categories.map(item => <Tabs.Tab key={item.id} value={item.id} className="skill-category-tab"><span>{item.label}</span><small>{item.count}</small></Tabs.Tab>)}</Tabs.List>
      <div className="skill-results-meta"><span role="status" aria-live="polite">{loading ? "正在整理收藏" : `找到 ${results.length.toLocaleString()} 份技能`}{deferredQuery !== query ? " 正在检索" : ""}</span><span><Clock3 size={10} />{date ? `Stars 快照 ${date}` : "尚无整理时间"}<i /> Stars 可查 {knownStars}/{entries.length}</span></div>
      {error && <p className="skill-collection-error" role="alert">{error}</p>}
      {categories.map(item => <Tabs.Panel key={item.id} value={item.id} className="skill-category-panel">{category === item.id && <>
        <div ref={grid} className="skill-card-grid" tabIndex={-1} aria-label="技能投影收藏" aria-busy={loading}>
          {loading && !entries.length ? Array.from({ length: 4 }, (_, index) => <div className="skill-card-loading" key={index}><span /><i /><i /></div>) : visible.map((entry, index) => <SkillCard key={entry.id} entry={entry} index={activePage * PAGE_SIZE + index} still={still} pending={pendingId === entry.id} onRequestSelect={requestSelect} onCancelRequest={cancelRequest} />)}
        </div>
        {!loading && !visible.length && <div className="skill-collection-empty"><span>NO CLUE FOUND</span><h3>{entries.length ? "换一条线索 继续寻找" : "收藏档案正在整理"}</h3><p>{entries.length ? "试试更短的名称 或切换到其他分类" : "导入本机技能后 这里会展示真实的技能用途与来源"}</p>{entries.length > 0 && <Button variant="ghost" onClick={() => { setQuery(""); setCategory(ALL); }}>查看全部收藏 <ArrowRight size={14} /></Button>}</div>}
        {!!results.length && <nav className="skill-pagination" aria-label="技能收藏分页"><span>每页 {PAGE_SIZE} 份 按需展开投影</span><div><Button variant="ghost" disabled={activePage === 0} onClick={() => goToPage(activePage - 1)} aria-label="上一页技能"><ArrowLeft size={15} /></Button><label><span className="skill-visually-hidden">跳转到技能收藏页</span><select value={activePage} onChange={event => goToPage(Number(event.target.value))}>{Array.from({ length: totalPages }, (_, index) => <option value={index} key={index}>第 {index + 1} 页</option>)}</select><span>/ {totalPages}</span></label><Button variant="ghost" disabled={activePage === totalPages - 1} onClick={() => goToPage(activePage + 1)} aria-label="下一页技能"><ArrowRight size={15} /></Button></div></nav>}
      </>}</Tabs.Panel>)}
    </Tabs.Root>
    <footer className="skill-collection-footnote"><span>THE RIGHT TOOL OPENS A NEW POSSIBILITY</span><p>本机技能静态快照 部分说明保留原文 Stars 属于来源仓库 未知数量不计为零</p></footer>
    <SkillDetails entry={selected} trigger={trigger} still={still} onClose={() => setSelected(null)} />
  </section>;
}
