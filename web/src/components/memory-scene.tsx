import { useEffect, useRef } from "react";

import geometry from "./memory-geometry.json";
import { createMemoryState, transitionMemory, type MemoryAction, type MemoryMode } from "./memory-model";

type Variant = "overview" | "central" | "node" | "traces" | "hooks";
const LABELS: Record<MemoryMode, string> = { client: "Your agent", node: "Your Node", central: "Central", traces: "Shared traces", hooks: "Capture hooks" };
const CAPTIONS: Record<MemoryMode, string> = {
  client: "Your agent works with context from your Node and permitted shared knowledge.",
  node: "Your working context stays separate from other members' Nodes.",
  central: "Retrieve a source reference. The original stays in Central.",
  traces: "Share an example session copy. Keep the private context in your Node.",
  hooks: "Supported hooks capture session summaries and push metadata into your private Node.",
};
const MODES: Record<Variant, MemoryMode[]> = {
  overview: ["client", "node", "central", "traces"], central: ["central", "client"],
  node: ["node", "client"], traces: ["node", "traces"], hooks: ["hooks", "node"],
};

function visible(zone: string, variant: Variant) {
  if (variant === "overview") return true;
  if (variant === "central") return zone === "central" || zone === "client";
  if (variant === "traces") return zone === "node" || zone === "traces";
  return zone === "node" || zone === "client";
}

/** Fixed artwork from the Anatomy study. No retrieved text or user input enters its SVG. */
export function MemoryScene({ variant = "overview" }: { variant?: Variant }) {
  const root = useRef<HTMLDivElement>(null);
  const initialMode: MemoryMode = variant === "overview" ? "node" : variant;
  const items = geometry.items.filter((item) => visible(item.zone, variant));
  const initialOpen = initialMode === "node" || initialMode === "hooks";
  const ordered = [...items].sort((a, b) => a.key + (a.moving && initialOpen ? geometry.depthLift : 0) - b.key - (b.moving && initialOpen ? geometry.depthLift : 0));

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const host: HTMLDivElement = element;
    const svg = host.querySelector<SVGSVGElement>("svg")!;
    const layer = host.querySelector<SVGGElement>("[data-parts]")!;
    const parts = [...layer.querySelectorAll<SVGGElement>("[data-item]")];
    const slip = host.querySelector<SVGGElement>("[data-memory-slip]")!;
    const readout = host.querySelector<HTMLElement>("[data-readout]")!;
    const live = host.querySelector<HTMLElement>("[data-announce]")!;
    const buttons = [...host.querySelectorAll<HTMLButtonElement>("[data-mode]")];
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const cleanup: Array<() => void> = [];
    let state = createMemoryState(initialMode);
    let drawer = initialOpen ? 1 : 0, trace = 0, frame = 0, last = 0, onScreen = false, lastOrder = "";
    let drag: { from: MemoryMode; x: number; y: number } | null = null;
    let flight: { from: number[]; to: number[]; age: number; kind: "capture" | "recall" } | null = null;
    let x = 0, y = 0;
    function listen(target: EventTarget, name: string, handler: EventListener) {
      target.addEventListener(name, handler);
      cleanup.push(() => target.removeEventListener(name, handler));
    }
    function announce(text: string, commit = false) {
      readout.textContent = text;
      if (commit) live.textContent = text;
    }
    function draw() {
      for (const part of parts) {
        if (part.dataset.moving === "true") part.setAttribute("transform", `translate(${geometry.drawerDelta[0] * drawer} ${geometry.drawerDelta[1] * drawer})`);
        if (part.hasAttribute("data-trace")) { part.setAttribute("opacity", String(trace)); part.setAttribute("pointer-events", trace > .01 ? "auto" : "none"); }
        if (part.dataset.focus) part.querySelector(".iso-solid")?.toggleAttribute("data-lit", part.dataset.focus === state.mode);
      }
      const sorted = [...parts].sort((a, b) => Number(a.dataset.key) + (a.dataset.moving === "true" ? geometry.depthLift * drawer : 0) - Number(b.dataset.key) - (b.dataset.moving === "true" ? geometry.depthLift * drawer : 0));
      const order = sorted.map((p) => p.dataset.item).join(",");
      if (order !== lastOrder) { const fragment = document.createDocumentFragment(); sorted.forEach((part) => fragment.appendChild(part)); layer.appendChild(fragment); lastOrder = order; }
      slip.setAttribute("opacity", drag || flight ? "1" : "0");
      slip.setAttribute("transform", `translate(${x} ${y})`);
      host.dataset.mode = state.mode;
      host.dataset.shared = String(state.shared);
      host.dataset.captured = String(state.captured);
      host.dataset.recalled = String(state.recalled);
      host.dataset.drawer = drawer.toFixed(4);
      host.dataset.flight = flight?.kind ?? "none";
      host.dataset.dragging = String(Boolean(drag));
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode)));
    }
    function apply(action: MemoryAction, message?: string) {
      state = transitionMemory(state, action);
      announce(message ?? CAPTIONS[state.mode], action.type !== "inspect");
      if (still.matches) { drawer = state.mode === "node" || state.mode === "hooks" ? 1 : 0; trace = state.shared ? 1 : 0; }
      draw(); run();
    }
    function start(kind: "capture" | "recall") {
      if (drag) return;
      const from = geometry.anchors[kind === "capture" ? "client" : "central"];
      const to = geometry.anchors[kind === "capture" ? "node" : "client"];
      if (still.matches) { apply({ type: kind }, kind === "capture" ? "Example captured into your Node." : "Source reference returned to your agent."); return; }
      flight = { from, to, age: 0, kind }; x = from[0]; y = from[1];
      announce(kind === "capture" ? "Capturing an example into your private Node…" : "Recalling a source reference from Central…");
      draw(); run();
    }
    function inspect(mode: MemoryMode, activate = true) {
      apply({ type: "inspect", mode });
      if (activate && mode === "central") start("recall");
      if (activate && mode === "client" && variant !== "central") start("capture");
    }
    function tick(now: number) {
      frame = 0;
      if (!onScreen || document.hidden) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
      const alpha = still.matches ? 1 : 1 - Math.exp(-dt / .2);
      const open = state.mode === "node" || state.mode === "hooks" || drag?.from === "node" ? 1 : 0;
      drawer += (open - drawer) * alpha; trace += ((state.shared ? 1 : 0) - trace) * alpha;
      if (Math.abs(drawer - open) < .0001) drawer = open;
      if (Math.abs(trace - (state.shared ? 1 : 0)) < .0001) trace = state.shared ? 1 : 0;
      if (flight) {
        flight.age += dt; const t = Math.min(flight.age / 1.2, 1), ease = t * t * (3 - 2 * t);
        x = flight.from[0] + (flight.to[0] - flight.from[0]) * ease;
        y = flight.from[1] + (flight.to[1] - flight.from[1]) * ease - Math.sin(t * Math.PI) * 30;
        if (t === 1) { const kind = flight.kind; flight = null; state = transitionMemory(state, { type: kind }); announce(kind === "capture" ? "Example captured into your Node." : "Source reference returned to your agent.", true); }
      }
      if (drag) { x += (drag.x - x) * alpha; y += (drag.y - y) * alpha; }
      draw();
      if (flight || drag || drawer !== open || trace !== (state.shared ? 1 : 0)) frame = requestAnimationFrame(tick);
    }
    function run() { if (!frame && onScreen && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); } }
    function zone(target: EventTarget | null): MemoryMode | undefined {
      return target instanceof Element ? target.closest<SVGGElement>("[data-zone]")?.dataset.zone as MemoryMode | undefined : undefined;
    }
    function point(event: PointerEvent) {
      const matrix = svg.getScreenCTM();
      return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
    }
    listen(svg, "pointermove", ((event: PointerEvent) => {
      if (drag) { const p = point(event); if (p) { drag.x = p.x; drag.y = p.y; run(); } return; }
      if (event.pointerType === "touch") return;
      const next = zone(event.target);
      if (next && next !== state.mode && MODES[variant].includes(next)) inspect(next, false);
    }) as EventListener);
    listen(svg, "pointerdown", ((event: PointerEvent) => {
      const from = zone(event.target), p = point(event);
      if (event.button !== 0 || event.pointerType === "touch" || !from || !p || !["node", "client", "central"].includes(from)) return;
      flight = null; drag = { from, x: p.x, y: p.y }; x = p.x; y = p.y;
      svg.setPointerCapture(event.pointerId); event.preventDefault();
      announce(from === "node" ? "Drop the example session into the shared tray." : from === "central" ? "Drop the source reference onto the laptop." : "Drop the example context into your Node."); draw(); run();
    }) as EventListener);
    listen(svg, "pointerup", ((event: PointerEvent) => {
      if (!drag) return;
      const from = drag.from, to = zone(document.elementFromPoint(event.clientX, event.clientY)); drag = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      const next = to ? transitionMemory(state, { type: "drop", from, to }) : state;
      if (next === state) announce("Nothing shared. Use a matching memory path.");
      else { state = next; announce(from === "node" ? "Example trace shared. Private copy kept." : from === "central" ? "Source reference returned to your agent." : "Example captured into your Node.", true); }
      draw(); run();
    }) as EventListener);
    listen(svg, "pointercancel", (() => { drag = null; announce("Nothing shared."); draw(); run(); }) as EventListener);
    buttons.forEach((button) => listen(button, "click", () => inspect(button.dataset.mode as MemoryMode)));
    host.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => listen(button, "click", () => {
      const action = button.dataset.action;
      if (action === "recall") { inspect("central"); return; }
      if (action === "capture") { start("capture"); return; }
      if (action === "session" || action === "push") { apply({ type: "capture" }, action === "session" ? "Example session summary captured into your Node." : "Example push metadata captured into your Node."); start("capture"); return; }
      flight = null; drag = null;
      if (action === "share") apply({ type: "share" }, "Example trace shared. Private copy kept.");
      if (action === "reset") apply({ type: "reset" });
    }));
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => { onScreen = entries[entries.length - 1].isIntersecting; if (!onScreen && frame) { cancelAnimationFrame(frame); frame = 0; } else run(); }, { rootMargin: "80px" });
      observer.observe(host); cleanup.push(() => observer.disconnect());
    } else onScreen = true;
    listen(document, "visibilitychange", () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else run(); });
    listen(still, "change", () => { if (still.matches) { flight = null; drag = null; drawer = state.mode === "node" || state.mode === "hooks" ? 1 : 0; trace = state.shared ? 1 : 0; draw(); } else run(); });
    draw(); run();
    return () => { if (frame) cancelAnimationFrame(frame); cleanup.forEach((remove) => remove()); };
  }, [initialMode, initialOpen, variant]);

  return (
    <div ref={root} className={`memory-art memory-art--${variant}`} data-memory-scene={variant}>
      <svg className="iso-svg" viewBox={variant === "node" || variant === "hooks" ? "130 35 470 430" : "90 35 600 440"} role="img" aria-label="An interactive illustration of private drawers, shared reference shelves, and example session cards.">
        <g className="memory-ground">{geometry.shadows.map((d, i) => visible(["node", "central", "client", "traces"][i], variant) ? <path key={i} className="iso-halo ground-shadow" d={d} /> : null)}</g>
        <g data-parts>
          {ordered.map((item) => <g key={item.name} data-item={item.name} data-name={item.name} data-key={item.key} data-moving={String(item.moving)} data-zone={item.zone} data-focus={item.focus || undefined} data-trace={item.trace ? "" : undefined} opacity={item.trace ? 0 : 1} transform={item.moving && initialOpen ? `translate(${geometry.drawerDelta.join(" ")})` : undefined} dangerouslySetInnerHTML={{ __html: item.svg }} />)}
        </g>
        <g data-memory-slip opacity="0" className="memory-slip" aria-hidden="true">
          <path className="memory-paper" d="M-15-7L6 1L21-8L0-16Z" /><path className="memory-paper-edge" d="M-15-7V-4L6 4L21-5V-8L6 1Z" /><path className="memory-rules" d="M-8-7L4-2M-4-10L10-5" />
        </g>
      </svg>
      <div className="memory-modes" role="group" aria-label="Explore the memory illustration">
        {MODES[variant].map((mode) => <button key={mode} type="button" data-mode={mode} aria-pressed={mode === initialMode}>{LABELS[mode]}</button>)}
      </div>
      <div className="memory-actions">
        {variant === "central" && <button type="button" data-action="recall">Recall a decision <span aria-hidden="true">↗</span></button>}
        {variant === "node" && <button type="button" data-action="capture">Capture example context <span aria-hidden="true">↗</span></button>}
        {(variant === "traces" || variant === "overview") && <button type="button" data-action="share">Share example trace <span aria-hidden="true">↗</span></button>}
        {variant === "hooks" && <><button type="button" data-action="session">End a session</button><button type="button" data-action="push">Push a commit</button></>}
        <button type="button" data-action="reset">Reset</button>
      </div>
      <p className="memory-readout" data-readout>{CAPTIONS[initialMode]}</p>
      <p className="memory-demo-note">Interactive example. No vault data is read or sent.</p>
      <span className="sr-only" data-announce aria-live="polite" />
    </div>
  );
}
