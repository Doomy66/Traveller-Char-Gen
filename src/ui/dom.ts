/** A small element builder, so the screens read as their structure. */
type Child = Node | string | number | null | undefined | false;
type Children = Child | Children[];
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Children[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === "function") e.addEventListener(k.replace(/^on/, ""), v as EventListener);
    else if (k === "class") e.className = String(v);
    else if (k === "text") e.textContent = String(v);
    else if (v === true) e.setAttribute(k, "");
    else if (k in e && k !== "list") (e as unknown as Record<string, unknown>)[k] = v;
    else e.setAttribute(k, String(v));
  }
  for (const c of (children as unknown[]).flat(Infinity) as Child[]) {
    if (c === null || c === undefined || c === false) continue;
    e.append(typeof c === "string" || typeof c === "number" ? String(c) : c);
  }
  return e;
}

export function clear(e: Element): void {
  while (e.firstChild) e.removeChild(e.firstChild);
}

export function toast(text: string): void {
  const t = el("div", { class: "toast", text });
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

export function download(name: string, text: string, type = "text/plain"): void {
  const a = el("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export const fmtCr = (n: number) => `Cr${Math.round(n).toLocaleString("en-GB")}`;
