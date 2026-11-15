/** Pure helpers for the category tree — safe on server and client */

export type TreeCat = { id: string; parentId: string | null; sortOrder: number; name: string; nameBn?: string | null; slug: string };
export type Node<T extends TreeCat> = T & { children: Node<T>[]; depth: number };

const bySort = (a: TreeCat, b: TreeCat) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/** Nested tree. Orphans (parent missing / hidden) become roots so nothing disappears. */
export function buildTree<T extends TreeCat>(cats: T[]): Node<T>[] {
  const ids = new Set(cats.map((c) => c.id));
  const kids = new Map<string | null, T[]>();
  for (const c of cats) {
    const p = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    kids.set(p, [...(kids.get(p) ?? []), c]);
  }
  const seen = new Set<string>();
  const make = (parent: string | null, depth: number): Node<T>[] =>
    (kids.get(parent) ?? [])
      .sort(bySort)
      .filter((c) => !seen.has(c.id) && seen.add(c.id))
      .map((c) => ({ ...c, depth, children: make(c.id, depth + 1) }));
  const roots = make(null, 0);
  // categories caught in a parent loop are unreachable from the top — surface them as roots
  for (const c of [...cats].sort(bySort)) if (!seen.has(c.id)) seen.add(c.id) && roots.push({ ...c, depth: 0, children: [] });
  return roots;
}

/** Depth-first flat list (for indented <select> options) */
export function flatten<T extends TreeCat>(tree: Node<T>[]): Node<T>[] {
  return tree.flatMap((n) => [n, ...flatten(n.children)]);
}

/** id + every descendant id */
export function descendantIds(cats: TreeCat[], id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of cats) if (c.parentId && out.has(c.parentId) && !out.has(c.id)) out.add(c.id), (grew = true);
  }
  return out;
}

/** Root → … → category (for breadcrumbs) */
export function ancestry<T extends TreeCat>(cats: T[], id: string | null | undefined): T[] {
  const map = new Map(cats.map((c) => [c.id, c]));
  const path: T[] = [];
  for (let c = id ? map.get(id) : undefined; c && !path.includes(c); c = c.parentId ? map.get(c.parentId) : undefined) path.unshift(c);
  return path;
}

/** "Parent › Child › Grandchild" */
export const pathLabel = (cats: TreeCat[], id: string | null | undefined) =>
  ancestry(cats, id)
    .map((c) => c.nameBn || c.name)
    .join(" › ");
