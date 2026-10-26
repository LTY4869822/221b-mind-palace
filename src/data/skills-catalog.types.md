# Skill catalog data boundary

The website reads **`public/data/skills-catalog.json`**, a final trimmed snapshot of SKILL.md metadata found in installed **and project-local** skill directories. The current reviewed collection contains **678 distinct skills**; **211 entries** have confirmed public upstream sources spanning **27 GitHub repositories**. These numbers describe the reviewed snapshot, not live filesystem access or the count of globally installed packages.

The similarly named `research/skills-catalog/skills-catalog.json` is the internal research master. It is not the website payload and must not be copied directly into `public/`. Final publication uses the `build-public-catalog.mjs` → `encode-covers.mjs` sequence described in `tooling/skill-catalog/README.md`, followed by validation of the resulting public JSON and referenced images.

## Public payload

The top level contains `schemaVersion`, `total`, `generatedAt`, `starsUpdatedAt`, `categories` and `skills`. Category records contain `id`, `label` and `count`. `total` must equal the skill-array length and category counts must sum to that total.

Skill records contain:

- `id`, `name`, `purpose`, `description`, `category`, `categoryLabel`, and optional `family`. `purpose` is a concise, individually reviewed Chinese sentence for the card front; the complete original `description` remains in the details. IDs remain stable independently of their current sort order.
- `useCases`, `howTo`, `inputs`, `outputs`, and an optional `example` with `prompt` and `expectedOutput`. These are source-specific summaries and usage excerpts or disclosed guidance, not a copy of all SKILL.md instructions.
- `contentQuality`, recording whether a summary was curated or original, whether a workflow was extracted, and whether input/output descriptions were extracted or supplied as category guidance. Suggested example prompts do not claim that the task was actually run.
- `source: { label, kind }`. Exact installation locations, `source.skillFile`, original full definitions, private provenance evidence and credentials are excluded from the delivery payload.
- `repository: null` or `{ url, owner, name, stars, starsUpdatedAt }`, included only from a publicly verified repository report. Repository URLs are canonical HTTPS GitHub source links; tutorial or reference links do not establish an upstream source.
- `cover: { kind, categoryKind, sprite }`, where `sprite` contains `sheet`, zero-based `column` and `row`, and `columns`/`rows`. Current artwork uses shared 4×4 square raster sheets. Every skill has its own mapped cell, and skill names and Star counts are rendered as HTML rather than baked into the illustration.

Stars measure the **repository**, not the individual skill. Entries sharing one source repository therefore share its Star count and timestamp. A known count of `0` is valid. An unknown count is `null`; a source that is missing, unavailable or not confirmed public is represented by `repository: null`. The collection sorts known counts above unknown ones within a category.

## Loading and refresh

`SkillArchive` fetches the final snapshot through `BASE_URL` only when the Skill collection is opened. It loads public WebP atlases referenced by that snapshot. No SKILL.md instruction is executed by the scanner or by the website.

The owner refreshes the inventory using local CLI tools. New IDs require reviewed provenance and an explicitly assigned, newly prepared artwork cell; the tools do not invent a GitHub source or fetch the owner's local files from a public webpage. Original atlas PNGs remain in the private `research/skills-catalog/original-covers/` archive. The local encoder can regenerate public WebPs directly from that archive without returning originals to `public/`.

Only the validated final `public/data/` result and its referenced public delivery images belong in the published site. Private inventories, source text, exact filesystem locations, curation reports, generation logs and PNG originals stay outside the deployment.
