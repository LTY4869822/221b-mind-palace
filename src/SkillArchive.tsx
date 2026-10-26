import { useEffect, useState } from "react";
import SkillCollection, { type SkillCatalogEntry } from "./SkillCollection";

type Catalog = { skills: SkillCatalogEntry[]; generatedAt?: string; starsUpdatedAt?: string };

export default function SkillArchive() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/skills-catalog.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("收藏档案暂时无法读取 请稍后重新打开");
        return response.json();
      })
      .then((data: Catalog) => {
        if (!Array.isArray(data.skills)) throw new Error("收藏档案格式不完整");
        setCatalog(data);
      })
      .catch(reason => { if (reason.name !== "AbortError") setError(reason.message); });
    return () => controller.abort();
  }, []);
  return <SkillCollection entries={catalog?.skills || []} updatedAt={catalog?.starsUpdatedAt || catalog?.generatedAt} loading={!catalog && !error} error={error} />;
}
