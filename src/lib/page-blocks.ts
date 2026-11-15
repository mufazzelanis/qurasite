/** Content blocks for Pages — shared by the admin editor and the public renderer */

export type PageBlock =
  | { id: string; type: "heading"; text: string; level: 2 | 3 }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "list"; items: string[]; ordered: boolean }
  | { id: string; type: "image"; src: string; alt: string; caption: string }
  | { id: string; type: "button"; label: string; href: string; style: "primary" | "outline" }
  | { id: string; type: "callout"; emoji: string; text: string; tone: "info" | "success" | "warning" }
  | { id: string; type: "faq"; items: { q: string; a: string }[] }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "divider" };

export type BlockType = PageBlock["type"];

export const newId = () => Math.random().toString(36).slice(2, 10);

export const BLOCK_DEFAULTS: { [K in BlockType]: () => Extract<PageBlock, { type: K }> } = {
  heading: () => ({ id: newId(), type: "heading", text: "", level: 2 }),
  text: () => ({ id: newId(), type: "text", text: "" }),
  list: () => ({ id: newId(), type: "list", items: [""], ordered: false }),
  image: () => ({ id: newId(), type: "image", src: "", alt: "", caption: "" }),
  button: () => ({ id: newId(), type: "button", label: "এখনই অর্ডার করুন", href: "/shop", style: "primary" }),
  callout: () => ({ id: newId(), type: "callout", emoji: "💡", text: "", tone: "info" }),
  faq: () => ({ id: newId(), type: "faq", items: [{ q: "", a: "" }] }),
  video: () => ({ id: newId(), type: "video", url: "" }),
  divider: () => ({ id: newId(), type: "divider" }),
};

/** Accept anything from the DB and keep only well-formed blocks */
export function parseBlocks(raw: unknown): PageBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is PageBlock => !!b && typeof b === "object" && typeof (b as PageBlock).type === "string" && (b as PageBlock).type in BLOCK_DEFAULTS).map((b) => ({ ...b, id: b.id || newId() }));
}

/** Old guide-page format ("## heading", "- bullet", blank line = paragraph) → blocks */
export function markdownToBlocks(md: string): PageBlock[] {
  return md
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block): PageBlock => {
      if (block.startsWith("### ")) return { id: newId(), type: "heading", level: 3, text: block.slice(4) };
      if (block.startsWith("## ")) return { id: newId(), type: "heading", level: 2, text: block.slice(3) };
      const lines = block.split("\n");
      if (lines.every((l) => /^[-•*] /.test(l))) return { id: newId(), type: "list", ordered: false, items: lines.map((l) => l.slice(2)) };
      if (lines.every((l) => /^\d+[.)] /.test(l))) return { id: newId(), type: "list", ordered: true, items: lines.map((l) => l.replace(/^\d+[.)] /, "")) };
      return { id: newId(), type: "text", text: block };
    });
}

/** Plain text of all blocks (search, meta description fallback, word count) */
export function blocksText(blocks: PageBlock[]) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
        case "text":
        case "callout":
          return b.text;
        case "list":
          return b.items.join(" ");
        case "faq":
          return b.items.map((i) => `${i.q} ${i.a}`).join(" ");
        case "image":
          return b.caption;
        default:
          return "";
      }
    })
    .join(" ")
    .replace(/\*\*|\[|\]\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** YouTube URL → video id */
export function youtubeId(url: string) {
  return url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? null;
}
