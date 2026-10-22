"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, ArrowUp, ArrowDown, Pencil, Plus } from "./icons";

/**
 * ADMIN PAGES CONFIGURATOR (S5) — ported 1:1 from Mira's wireframe:
 *   ~/workspaces/mira/prototypes/nextbizstudio/admin/pages/pages/prompt.md
 * Page picker chip bar → sections ledger → schema-driven content editor
 * (right rail) + structure mini-card + section registry. All mutations hit
 * /api/config/* optimistically and reconcile with router.refresh() — edits
 * reflect on the public page immediately, no redeploy (P1.8/P1.9).
 *
 * Legal pages are structure-locked (single "doc" section): add / remove /
 * reorder controls hidden, content editing only (wireframe §Reorder rules).
 */

export type PageLite = { key: string; title: string };
export type InvSection = { key: string; label: string };
export type Row = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  enabled: boolean;
  content: Record<string, unknown> | unknown[];
};

type Content = Record<string, unknown>;

const IMAGE_KEYS = new Set(["src", "img", "image", "photo", "portrait", "logo", "avatar", "still"]);
const IMG_EXT = /\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i;

function isImageField(key: string, value: unknown): boolean {
  if (typeof value !== "string") return false;
  const k = key.toLowerCase();
  if (k.includes("note") || k.includes("caption") || k.startsWith("alt")) return false;
  // empty `photo`-style keys still get the image control (Replace to set one)
  if (!value) return IMAGE_KEYS.has(k);
  return IMAGE_KEYS.has(k) || IMG_EXT.test(value);
}

function isImageAsset(value: unknown): boolean {
  return typeof value === "string" && value.length > 3 && IMG_EXT.test(value);
}

/** first meaningful string for the ledger preview (bold lead, per wireframe) */
function previewOf(content: Record<string, unknown> | unknown[]): { lead: string; rest: string } {
  const counts: string[] = [];
  let lead = "";
  let rest = "";
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      if (v.startsWith("<svg") || v.length < 4) return;
      if (!lead && v.trim().length >= 8) {
        lead = v.trim();
        return;
      }
      if (!rest && v.trim().length >= 4 && v !== lead) rest = v.trim();
    } else if (Array.isArray(v)) {
      if (v.length > 0) counts.push(`${v.length} ${v.length === 1 ? "item" : "items"}`);
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v as Content).forEach(walk);
    }
  };
  walk(content);
  const c = counts.length ? ` · ${counts.slice(0, 2).join(" · ")}` : "";
  return { lead, rest: (rest ? `${rest}` : "") + c };
}

function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
}

function setAtPath(obj: Content, path: (string | number)[], value: unknown): Content {
  const root = clone(obj);
  let cur: unknown = root;
  for (let i = 0; i < path.length - 1; i++) {
    cur = (cur as Record<string, unknown>)[path[i] as string];
  }
  const last = path[path.length - 1];
  if (typeof last === "number" && Array.isArray(cur)) cur[last] = value;
  else (cur as Record<string, unknown>)[last as string] = value;
  return root;
}

function templateLike(sample: unknown): unknown {
  if (typeof sample === "string") return "";
  if (typeof sample === "number") return 0;
  if (typeof sample === "boolean") return false;
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(sample as Content)) out[k] = templateLike(v);
    return out;
  }
  return "";
}

export function PagesConfigurator({
  pages,
  pageKey,
  pagePath,
  inventory,
  sections,
  legalLocked,
}: {
  pages: PageLite[];
  pageKey: string;
  pagePath: string;
  inventory: InvSection[];
  sections: Row[];
  legalLocked: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(sections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Content | unknown[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // drag-to-reorder (grip affordance, wireframe: "drag AND ↑↓ buttons")
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // refs mirror the state so the full dragstart→dragover→drop sequence works
  // even when the events land in the same tick (React state is async)
  const dragRef = useRef<string | null>(null);

  // authoritative sync after router.refresh() (server recomputes merged rows)
  useEffect(() => setRows(sections), [sections]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const onPage = useMemo(() => new Set(rows.map((r) => r.key)), [rows]);
  const registry = inventory.filter((s) => !onPage.has(s.key));

  // topline "Add section" (server-rendered in the shell) opens the sheet
  useEffect(() => {
    const btn = document.getElementById("pages-add-act");
    if (!btn) return;
    const open = () => setAddOpen(true);
    btn.addEventListener("click", open);
    return () => btn.removeEventListener("click", open);
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  function select(r: Row) {
    setSelectedId(r.id);
    setDraft(clone(r.content));
    setErr("");
    setSaved(false);
    setConfirming(false);
  }

  async function api(path: string, method: string, body?: unknown): Promise<{ ok: boolean; data: unknown }> {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, data };
  }

  /** mutate optimistically; rollback + inline error on failure; reconcile */
  async function run(
    optimistic: () => void,
    rollback: () => void,
    req: () => Promise<{ ok: boolean; data: unknown }>,
  ) {
    const before = rows;
    optimistic();
    setBusy(true);
    setErr("");
    const r = await req();
    setBusy(false);
    if (!r.ok) {
      setRows(before);
      rollback();
      const msg = (r.data as { error?: string } | null)?.error ?? "request failed";
      setErr(`Couldn't save — ${msg}. Nothing was changed.`);
      return false;
    }
    router.refresh();
    return true;
  }

  async function reorder(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const a = rows[i];
    const b = rows[j];
    await run(
      () => setRows((rs) => rs.map((r) => (r.id === a.id ? { ...r, sortOrder: b.sortOrder } : r.id === b.id ? { ...r, sortOrder: a.sortOrder } : r)).slice().sort((x, y) => x.sortOrder - y.sortOrder)),
      () => undefined,
      async () => {
        const ok1 = await api(`/api/config/pages/${pageKey}/sections/${a.id}`, "PATCH", { sortOrder: b.sortOrder });
        if (!ok1.ok) return ok1;
        return api(`/api/config/pages/${pageKey}/sections/${b.id}`, "PATCH", { sortOrder: a.sortOrder });
      },
    );
  }

  async function toggleEnabled(r: Row, enabled: boolean) {
    await run(
      () => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled } : x))),
      () => undefined,
      () => api(`/api/config/pages/${pageKey}/sections/${r.id}`, "PATCH", { enabled }),
    );
  }

  async function removeRow(r: Row) {
    await run(
      () => {
        setRows((rs) => rs.filter((x) => x.id !== r.id));
        if (selectedId === r.id) {
          setSelectedId(null);
          setDraft(null);
        }
      },
      () => undefined,
      () => api(`/api/config/pages/${pageKey}/sections/${r.id}`, "DELETE"),
    );
  }

  async function reAdd(key: string) {
    const ok = await run(
      () => setAddOpen(false),
      () => undefined,
      () => api(`/api/config/pages/${pageKey}/sections`, "POST", { sectionKey: key }),
    );
    if (ok) setAddOpen(false);
  }

  async function save() {
    if (!selected || !draft) return;
    const ok = await run(
      () => setRows((rs) => rs.map((x) => (x.id === selected.id ? { ...x, content: draft } : x))),
      () => undefined,
      () => api(`/api/config/pages/${pageKey}/sections/${selected.id}`, "PATCH", { content: draft }),
    );
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  /** grip-drag reorder: move the dragged row to the drop target's index,
   *  resequence sort orders (i+1)*10, PATCH every changed row in parallel;
   *  full rollback + inline error if any write fails. */
  async function dropOn(targetId: string) {
    const dragged = dragRef.current;
    const from = rows.findIndex((r) => r.id === dragged);
    const to = rows.findIndex((r) => r.id === targetId);
    dragRef.current = null;
    setDragId(null);
    setOverId(null);
    if (!dragged || dragged === targetId || from < 0 || to < 0) return;
    const before = rows;
    const next = rows.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const resequenced = next.map((r, i) => ({ ...r, sortOrder: (i + 1) * 10 }));
    setRows(resequenced);
    setBusy(true);
    const changed = resequenced.filter(
      (r) => before.find((b) => b.id === r.id)?.sortOrder !== r.sortOrder,
    );
    const results = await Promise.all(
      changed.map((r) =>
        api(`/api/config/pages/${pageKey}/sections/${r.id}`, "PATCH", { sortOrder: r.sortOrder }),
      ),
    );
    setBusy(false);
    if (results.some((x) => !x.ok)) {
      setRows(before);
      setErr("Reorder didn't save — restored the previous order.");
      return;
    }
    router.refresh();
  }

  /* ── page picker chip bar ─────────────────────────────────────── */
  const countText = legalLocked
    ? "1 section · structure locked"
    : `${rows.length} sections · drag rows to reorder`;

  return (
    <>
      <div className="pbar" data-testid="page-bar">
        {pages.map((p) => (
          <Link key={p.key} href={`/admin/pages?p=${p.key}`} className={`ppill${p.key === pageKey ? " on" : ""}`}>
            {p.title}
          </Link>
        ))}
        <span className="count">{countText}</span>
      </div>

      <div className="pagescontent">
        {/* ══ LEFT: sections ledger ══ */}
        <div className="colL">
          <div className="sledger" data-testid="sections-ledger">
            <div className="shead">
              <span>#</span><span>Section</span><span>Content preview</span><span>State</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {rows.map((r, i) => {
              const pv = previewOf(r.content);
              return (
                <div
                  key={r.id}
                  className={`srow${selectedId === r.id ? " sel" : ""}${r.enabled ? "" : " off"}${dragId === r.id ? " dragging" : ""}${overId === r.id && dragId !== r.id ? " dropover" : ""}`}
                  data-key={r.key}
                  data-status={r.enabled ? "live" : "hidden"}
                  draggable={!legalLocked}
                  onDragStart={(e) => {
                    if (legalLocked) return;
                    dragRef.current = r.id;
                    setDragId(r.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!dragRef.current) return;
                    e.preventDefault();
                    if (r.id !== dragRef.current) setOverId(r.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    void dropOn(r.id);
                  }}
                  onDragEnd={() => {
                    dragRef.current = null;
                    setDragId(null);
                    setOverId(null);
                  }}
                  onClick={() => select(r)}
                >
                  <span className="grip"><GripVertical /></span>
                  <div className="sn">
                    {r.label}
                    <small data-testid="row-key">{pageKey}.{r.key}{selectedId === r.id ? " — editing" : ""}</small>
                  </div>
                  <div className="sp">
                    {pv.lead ? <b>{pv.lead}</b> : null}
                    {pv.lead && pv.rest ? " — " : ""}{pv.rest}
                  </div>
                  <span className={`pst ${r.enabled ? "pst-live" : "pst-hide"}`}>
                    <i />{r.enabled ? "Live" : "Hidden"}
                  </span>
                  <div className="acts" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title="Move up"
                      aria-label={`Move ${r.label} up`}
                      disabled={i === 0 || busy}
                      onClick={() => reorder(i, -1)}
                    ><ArrowUp /></button>
                    <button
                      type="button"
                      title="Move down"
                      aria-label={`Move ${r.label} down`}
                      disabled={i === rows.length - 1 || busy}
                      onClick={() => reorder(i, 1)}
                    ><ArrowDown /></button>
                    <button
                      type="button"
                      className="edit"
                      title="Edit content"
                      onClick={() => select(r)}
                    ><Pencil /> Edit</button>
                  </div>
                </div>
              );
            })}
          </div>

          {!legalLocked && (
            <div
              className="addrow act"
              data-testid="add-row"
              onClick={() => setAddOpen(true)}
            >
              <div className="lft">
                <span className="plus"><Plus /></span>
                Add a section to this page
              </div>
              <div className="hint">
                Opens the registry —<br />shows only sections NOT already on the page
              </div>
            </div>
          )}

          {!legalLocked && (
            <div className="rule">
              <span className="rl">Reorder rules</span>
              <p><b>Reorder boundaries are section keys.</b> Composite sections are atomic — About Us → "Method" (the reading grid: sticky rail + steps) is ONE section; it moves as a whole, its internal grid never splits. Drag or ↑↓ moves the whole block.</p>
              <p><b>Legal pages are structure-locked:</b> single "doc" section — add / remove / reorder stay hidden, only content editing is offered.</p>
              <p><b>Hidden ≠ removed.</b> Hidden keeps the row and its content; Remove frees the slot — removed sections appear in the registry and can be re-added any time (content preserved).</p>
            </div>
          )}
        </div>

        {/* ══ RIGHT: editor + structure + registry ══ */}
        <div className="colR">
          {/* section editor */}
          <div className="panel" data-testid="section-editor">
            {!selected || !draft ? (
              <div className="pbody">
                <div className="reg" style={{ border: "1px dashed var(--line)" }}>
                  <span className="rl">No section selected</span>
                  <p>Pick a section to edit its content.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="phead">
                  <span className="micro">Edit section content</span>
                  <b>{selected.label}</b>
                  <small data-testid="editor-subline">
                    {pageKey}.{selected.key} · changes reflect on the public page immediately — no redeploy
                  </small>
                </div>
                <div className="pbody">
                  <FieldTree
                    content={draft}
                    onChange={(next) => { setDraft(next); setSaved(false); }}
                  />
                </div>
                <div className="pfoot">
                  <span className="hint">Field shape comes from the section's seed schema — scalars as inputs, lists as item rows (add / remove / edit each item), image fields as replace controls with alt text.</span>
                  {err && <span className="err">{err}</span>}
                  {saved && <span className="ok">Saved — live on site</span>}
                  <button type="button" className="btn ghost" disabled={busy} onClick={() => { setDraft(clone(selected.content)); setErr(""); }}>
                    Cancel
                  </button>
                  <button type="button" className="btn" disabled={busy} data-testid="save-section" onClick={save}>
                    Save section
                  </button>
                </div>
              </>
            )}
          </div>

          {/* structure mini-card (selection only; hidden on legal lock) */}
          {selected && !legalLocked && (
            <div className="struct" data-testid="structure-card">
              <div className="stlabel">Structure</div>
              <div className="stbody">
                <div className="srow2">
                  <span>Enabled on page</span>
                  <button
                    type="button"
                    className={`tog${selected.enabled ? "" : " off"}`}
                    role="switch"
                    aria-checked={selected.enabled}
                    aria-label={`Toggle ${selected.label}`}
                    disabled={busy}
                    onClick={() => toggleEnabled(selected, !selected.enabled)}
                  ><i /></button>
                </div>
                <div className="srow2">
                  <span>Position</span>
                  <span className="mutegroup">
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ minHeight: 24, padding: "0 8px", fontSize: 9 }}
                      disabled={busy || rows.findIndex((r) => r.id === selected.id) === 0}
                      onClick={() => reorder(rows.findIndex((r) => r.id === selected.id), -1)}
                    >↑ Up</button>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ minHeight: 24, padding: "0 8px", fontSize: 9 }}
                      disabled={busy || rows.findIndex((r) => r.id === selected.id) === rows.length - 1}
                      onClick={() => reorder(rows.findIndex((r) => r.id === selected.id), 1)}
                    >↓ Down</button>
                  </span>
                </div>
                <div className="srow2">
                  <span>Remove from page</span>
                  <button
                    type="button"
                    className="btn danger"
                    style={{ minHeight: 24, padding: "0 8px", fontSize: 9 }}
                    disabled={busy}
                    onClick={() => setConfirming(true)}
                  >Remove</button>
                </div>
                {confirming && (
                  <div className="confirm">
                    <span>Removed sections stay in the registry and can be re-added — content preserved.</span>
                    <span className="cbtns">
                      <button type="button" className="btn ghost" style={{ minHeight: 24, padding: "0 8px", fontSize: 9 }} onClick={() => setConfirming(false)}>Keep</button>
                      <button
                        type="button"
                        className="btn danger"
                        style={{ minHeight: 24, padding: "0 8px", fontSize: 9 }}
                        data-testid="confirm-remove"
                        disabled={busy}
                        onClick={async () => { setConfirming(false); await removeRow(selected); }}
                      >Remove</button>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* section registry */}
          {!legalLocked && (
            <div className="reg" data-testid="registry-card">
              <span className="rl">Section registry — {pages.find((p) => p.key === pageKey)?.title}</span>
              {registry.length === 0 ? (
                <p>
                  <b>All {inventory.length} registry sections are on this page.</b>{" "}
                  Remove one first — it appears here for re-adding, content preserved.
                </p>
              ) : (
                registry.map((s) => (
                  <div key={s.key} className="regrow" data-key={s.key}>
                    <span>
                      {s.label}
                      <small>{pageKey}.{s.key}</small>
                    </span>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => reAdd(s.key)}
                    >Re-add</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* add-section sheet (registry as slide-over) */}
      {addOpen && (
        <div className="sheetwrap" onClick={() => setAddOpen(false)} data-testid="add-sheet">
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="shead2">
              <span className="rl">Section registry — {pages.find((p) => p.key === pageKey)?.title}</span>
              <b>Add a section to {pages.find((p) => p.key === pageKey)?.title}</b>
              <small>Picking appends it to the page end — content comes from its seed default or its preserved prior content.</small>
            </div>
            <div className="sbody2">
              {registry.length === 0 ? (
                <p style={{ margin: 0, fontSize: 9.5, lineHeight: 1.6, color: "var(--muted)" }}>
                  <b style={{ color: "var(--ink)" }}>All {inventory.length} registry sections are on this page.</b>{" "}
                  Remove one first — it appears here for re-adding, content preserved.
                </p>
              ) : (
                registry.map((s) => (
                  <div key={s.key} className="regrow" data-key={s.key}>
                    <span>
                      {s.label}
                      <small>{pageKey}.{s.key}</small>
                    </span>
                    <button type="button" className="btn" disabled={busy} onClick={() => reAdd(s.key)}>Re-add</button>
                  </div>
                ))
              )}
            </div>
            <div className="sfoot2">
              <button type="button" className="btn ghost" onClick={() => setAddOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ schema-driven field tree — the editor's form ═══
 * Scalars → input/textarea (long/multiline/SVG strings → textarea),
 * image-asset fields → read-only replace control (uploads = foundation gap,
 * per the wireframe: "render read-only with an ask-Kira-to-enable note"),
 * arrays → item rows with inline add/remove, objects → nested groups.
 * All edits run through `mutate(path, edit)` on the draft root. */

type Edit =
  | { type: "set"; value: unknown }
  | { type: "removeItem"; index: number }
  | { type: "addItem"; tpl: unknown };

function applyEdit(
  root: Record<string, unknown> | unknown[],
  path: (string | number)[],
  edit: Edit,
): Record<string, unknown> | unknown[] {
  const next = clone(root);
  let cur: unknown = next;
  for (let i = 0; i < path.length - 1; i++) {
    cur = (cur as unknown as Record<string, unknown>)[path[i] as string];
  }
  const last = path[path.length - 1];
  if (edit.type === "set") {
    if (typeof last === "number" && Array.isArray(cur)) cur[last] = edit.value;
    else (cur as Content)[last as string] = edit.value;
  } else if (Array.isArray(cur)) {
    if (edit.type === "removeItem") cur.splice(edit.index, 1);
    else cur.push(edit.tpl);
  }
  return next;
}

function FieldTree({
  content,
  onChange,
}: {
  content: Record<string, unknown> | unknown[];
  onChange: (next: Record<string, unknown> | unknown[]) => void;
}) {
  const mutate = (path: (string | number)[], edit: Edit) =>
    onChange(applyEdit(content, path, edit));
  // list-shaped sections (entries etc.) render their item rows at the root
  if (Array.isArray(content)) {
    return <Node label="items" value={content} path={[]} mutate={mutate} />;
  }
  return (
    <>
      {Object.entries(content).map(([key, value]) => (
        <Node key={key} label={key} value={value} path={[key]} mutate={mutate} />
      ))}
    </>
  );
}

function Node({
  label,
  value,
  path,
  mutate,
}: {
  label: string;
  value: unknown;
  path: (string | number)[];
  mutate: (path: (string | number)[], edit: Edit) => void;
}) {
  if (isImageField(label, value)) {
    return <ImageField label={label} value={value as string} path={path} mutate={mutate} />;
  }

  if (value === null || typeof value !== "object") {
    if (typeof value === "boolean") {
      return (
        <div className="frow">
          <label>{label}</label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => mutate(path, { type: "set", value: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
        </div>
      );
    }
    const str = value === null ? "" : String(value);
    const num = typeof value === "number";
    const long = str.length > 64 || str.includes("\n") || str.startsWith("<svg");
    return (
      <div className="frow">
        <label>{label}</label>
        {long ? (
          <textarea
            className="fin"
            rows={str.startsWith("<svg") ? 3 : 4}
            value={str}
            onChange={(e) => mutate(path, { type: "set", value: num ? Number(e.target.value) || 0 : e.target.value })}
          />
        ) : (
          <input
            className="fin"
            value={str}
            onChange={(e) => mutate(path, { type: "set", value: num ? Number(e.target.value) || 0 : e.target.value })}
          />
        )}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="frow">
        <label>{label} — {value.length} {value.length === 1 ? "item" : "items"}</label>
        <div style={{ display: "grid", gap: 8 }}>
          {value.map((item, i) => (
            <div key={i} className="fgroup">
              <span className="glabel">
                {`Item ${i + 1}`}
                <button
                  type="button"
                  className="del"
                  onClick={() => mutate(path, { type: "removeItem", index: i })}
                >Remove item</button>
              </span>
              <Node label={`${label} ${i + 1}`} value={item} path={[...path, i]} mutate={mutate} />
            </div>
          ))}
          <button
            type="button"
            className="additem"
            onClick={() => mutate(path, { type: "addItem", tpl: value.length ? templateLike(value[0]) : "" })}
          ><Plus /> Add item</button>
        </div>
      </div>
    );
  }

  const obj = value as Content;
  return (
    <div className="frow">
      <label>{label}</label>
      <div className="fgroup">
        {Object.entries(obj).map(([k, v]) => (
          <Node key={k} label={k} value={v} path={[...path, k]} mutate={mutate} />
        ))}
      </div>
    </div>
  );
}

/* ═══ image field (S5-10) — Replace… uploads to the studio CDN and stores
 * the public URL in the section's content; Save section persists it and the
 * public page swaps the placeholder for the real photo. 5 MB cap, image
 * mimetypes only — mirrored server-side at /api/config/upload. */
function ImageField({
  label,
  value,
  path,
  mutate,
}: {
  label: string;
  value: string;
  path: (string | number)[];
  mutate: (path: (string | number)[], edit: Edit) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const file = value ? (value.split("/").pop() ?? value) : "";

  async function pick(f: File) {
    setErr("");
    if (f.size > 5 * 1024 * 1024) {
      setErr("Image must be under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/config/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        setErr(data?.error ?? "Upload failed — try again.");
      } else {
        mutate(path, { type: "set", value: data.url }); // staged — Save section persists
      }
    } catch {
      setErr("Upload failed — network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="frow">
      <label>{label}</label>
      <div className="imgfield">
        {value && isImageAsset(value) && /^https?:\/\//.test(value) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="thumb" style={{ objectFit: "cover" }} />
        ) : (
          <span className="thumb">NO IMAGE<br />yet</span>
        )}
        <div className="imeta">
          <b>{file || "placeholder shown on the site"}</b>
          <small>
            Replace uploads to the studio CDN (cdn.joyverse.fun) and stages the URL here —
            <b> Save section</b> swaps it live on the public page, no redeploy.
            {err && <span className="uperr">{err}</span>}
          </small>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn ghost"
          disabled={busy}
          data-testid="replace-image"
          onClick={() => input.current?.click()}
        >{busy ? "Uploading…" : "Replace…"}</button>
      </div>
    </div>
  );
}
