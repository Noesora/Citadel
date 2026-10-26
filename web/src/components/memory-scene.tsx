import { useEffect, useRef, type ReactNode } from "react";

import geometry from "./memory-geometry.json";
import { canAdvance, createMemoryState, flightProgress, STORIES, STEPS, transitionMemory, type MemoryAction, type MemoryStep, type MemoryZone } from "./memory-model";

const ZONE_STEP: Record<MemoryZone, MemoryStep> = { client: "capture", node: "node", traces: "share", central: "recall" };
const FOCUS: Record<MemoryStep, string> = { capture: "hooks", node: "node", share: "traces", recall: "central" };
const LABELS: Record<MemoryStep, string> = { capture: "Hooks", node: "Your Node", share: "Shared traces", recall: "Central" };
const PARTS = [...geometry.items].sort((a, b) => a.key - b.key);

/** One fixed illustration. Its examples never read or write vault data. */
export function MemoryScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const host: HTMLElement = element;
    const art = host.querySelector<HTMLElement>(".memory-art")!;
    const svg = art.querySelector<SVGSVGElement>("svg")!;
    const layer = svg.querySelector<SVGGElement>("[data-parts]")!;
    const parts = [...layer.querySelectorAll<SVGGElement>("[data-item]")];
    const slip = svg.querySelector<SVGGElement>("[data-memory-slip]")!;
    const readout = host.querySelector<HTMLElement>("[data-readout]")!;
    const live = host.querySelector<HTMLElement>("[data-announce]")!;
    const buttons = [...host.querySelectorAll<HTMLButtonElement>("[data-step]")];
    const storyLabel = host.querySelector<HTMLElement>("[data-story-label]")!;
    const storyTitle = host.querySelector<HTMLElement>("[data-story-title]")!;
    const storyCopy = host.querySelector<HTMLElement>("[data-story-copy]")!;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const cleanup: Array<() => void> = [];
    let state = createMemoryState(still.matches);
    let drawer = still.matches ? 1 : 0, trace = 0, frame = 0, last = 0, visible = false, hover = false, focus = false, lastOrder = "", lastStep = "";
    let drag: { from: MemoryZone; x: number; y: number; pointer: number } | null = null;
    function listen(target: EventTarget, name: string, handler: EventListener) {
      target.addEventListener(name, handler);
      cleanup.push(() => target.removeEventListener(name, handler));
    }
    function blocked() { return { reduced: still.matches, hidden: document.hidden, visible, hover, focus, dragging: Boolean(drag) }; }
    function announce(message: string) { readout.textContent = message; live.textContent = message; }
    function releaseDrag() {
      const current = drag; drag = null;
      if (current && svg.hasPointerCapture(current.pointer)) svg.releasePointerCapture(current.pointer);
    }
    function draw() {
      const progress = flightProgress(state);
      const moving = !still.matches && progress > 0 && progress < 1;
      for (const part of parts) {
        if (part.dataset.moving === "true") part.setAttribute("transform", `translate(${geometry.drawerDelta[0] * drawer} ${geometry.drawerDelta[1] * drawer})`);
        if (part.hasAttribute("data-trace")) { part.setAttribute("opacity", String(trace)); part.setAttribute("pointer-events", trace > .01 ? "auto" : "none"); }
        if (part.dataset.focus) part.querySelector(".iso-solid")?.toggleAttribute("data-lit", part.dataset.focus === FOCUS[state.step]);
      }
      const sorted = [...parts].sort((a, b) => Number(a.dataset.key) + (a.dataset.moving === "true" ? geometry.depthLift * drawer : 0) - Number(b.dataset.key) - (b.dataset.moving === "true" ? geometry.depthLift * drawer : 0));
      const order = sorted.map((part) => part.dataset.item).join(",");
      if (order !== lastOrder) { const fragment = document.createDocumentFragment(); sorted.forEach((part) => fragment.appendChild(part)); layer.appendChild(fragment); lastOrder = order; }
      let position: { x: number; y: number } | null = drag;
      if (!position && moving) {
        const from = geometry.anchors[state.step === "capture" ? "client" : state.step === "share" ? "node" : "central"];
        const to = geometry.anchors[state.step === "capture" ? "node" : state.step === "share" ? "traces" : "client"];
        const eased = progress * progress * (3 - 2 * progress);
        position = { x: from[0] + (to[0] - from[0]) * eased, y: from[1] + (to[1] - from[1]) * eased - Math.sin(progress * Math.PI) * 35 };
      }
      slip.setAttribute("opacity", position ? "1" : "0");
      if (position) slip.setAttribute("transform", `translate(${position.x} ${position.y})`);
      if (lastStep !== state.step) {
        const story = STORIES[state.step];
        storyLabel.textContent = story.label; storyTitle.textContent = story.title; storyCopy.textContent = story.copy;
        readout.textContent = story.copy; lastStep = state.step;
      }
      buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.step === state.step)));
      host.dataset.step = state.step;
      host.dataset.elapsed = state.elapsed.toFixed(3);
      host.dataset.shared = String(state.shared);
      host.dataset.captured = String(state.captured);
      host.dataset.recalled = String(state.recalled);
      host.dataset.paused = String(!canAdvance(state, blocked()));
      host.dataset.drawer = drawer.toFixed(4);
      host.dataset.flight = moving ? state.step : "none";
      host.dataset.dragging = String(Boolean(drag));
    }
    function tick(now: number) {
      frame = 0;
      if (!visible || document.hidden) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
      const previous = state;
      if (canAdvance(state, blocked())) state = transitionMemory(state, { type: "tick", seconds: dt });
      if (previous.manual && !state.manual) announce(STORIES[state.step].done);
      const open = state.step === "capture" || state.step === "node" || (state.step === "share" && flightProgress(state) < 1) || drag?.from === "node" ? 1 : 0;
      const alpha = still.matches ? 1 : 1 - Math.exp(-dt / .2);
      drawer += (open - drawer) * alpha; trace += ((state.shared ? 1 : 0) - trace) * alpha;
      if (Math.abs(drawer - open) < .0001) drawer = open;
      if (Math.abs(trace - Number(state.shared)) < .0001) trace = Number(state.shared);
      draw();
      if (canAdvance(state, blocked()) || drawer !== open || trace !== Number(state.shared)) frame = requestAnimationFrame(tick);
    }
    function run() { if (!frame && visible && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); } }
    function apply(action: MemoryAction, message?: string) {
      state = transitionMemory(state, action);
      if (still.matches) { drawer = state.step === "recall" ? 0 : 1; trace = Number(state.shared); }
      draw();
      if (message) announce(message);
      run();
    }
    function resume() {
      if (!state.playing && !still.matches && !focus && !drag) state = transitionMemory(state, { type: "play" });
    }
    function zone(target: EventTarget | null): MemoryZone | undefined {
      return target instanceof Element ? target.closest<SVGGElement>("[data-zone]")?.dataset.zone as MemoryZone | undefined : undefined;
    }
    function point(event: PointerEvent) {
      const matrix = svg.getScreenCTM();
      return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
    }
    buttons.forEach((button) => listen(button, "click", () => {
      releaseDrag();
      const step = button.dataset.step as MemoryStep;
      apply({ type: "select", step, reduced: still.matches }, still.matches ? STORIES[step].done : STORIES[step].copy);
    }));
    listen(art, "pointerenter", () => { hover = true; draw(); run(); });
    listen(art, "pointerleave", () => { hover = false; resume(); draw(); run(); });
    listen(host, "focusin", () => { focus = true; draw(); run(); });
    listen(host, "focusout", ((event: FocusEvent) => { focus = event.relatedTarget instanceof Node && host.contains(event.relatedTarget); if (!focus) resume(); draw(); run(); }) as EventListener);
    listen(svg, "pointermove", ((event: PointerEvent) => {
      if (drag) { const p = point(event); if (p) { drag.x = p.x; drag.y = p.y; draw(); } return; }
      if (event.pointerType === "touch") return;
      const target = zone(event.target);
      if (target) readout.textContent = STORIES[ZONE_STEP[target]].copy;
    }) as EventListener);
    listen(svg, "pointerdown", ((event: PointerEvent) => {
      const from = zone(event.target), p = point(event);
      if (event.button !== 0 || event.pointerType === "touch" || !from || !p || from === "traces") return;
      apply({ type: "interrupt" });
      drag = { from, x: p.x, y: p.y, pointer: event.pointerId };
      svg.setPointerCapture(event.pointerId); event.preventDefault();
      announce(from === "node" ? "Drop a session copy into the shared tray." : from === "central" ? "Drop a reference onto the laptop." : "Drop example context into your Node."); draw(); run();
    }) as EventListener);
    listen(svg, "pointerup", ((event: PointerEvent) => {
      if (!drag) return;
      const from = drag.from, to = zone(document.elementFromPoint(event.clientX, event.clientY));
      releaseDrag();
      const next = to ? transitionMemory(state, { type: "drop", from, to }) : state;
      if (next === state) announce("Nothing shared. Use a matching memory path.");
      else { state = next; draw(); announce(STORIES[state.step].done); }
      resume(); draw(); run();
    }) as EventListener);
    const cancel = () => { if (drag) { releaseDrag(); announce("Nothing shared."); resume(); draw(); run(); } };
    listen(svg, "pointercancel", cancel);
    listen(svg, "lostpointercapture", cancel);
    listen(host, "keydown", ((event: KeyboardEvent) => { if (event.key === "Escape") { releaseDrag(); apply({ type: "reset", reduced: still.matches }, "Reset. Your context stays private."); } }) as EventListener);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; } else run(); }, { rootMargin: "80px" });
      observer.observe(art); cleanup.push(() => observer.disconnect());
    } else visible = true;
    listen(document, "visibilitychange", () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else run(); });
    listen(still, "change", () => { releaseDrag(); if (still.matches) apply({ type: "reduce" }, "Motion paused. Choose a step to inspect it."); else { resume(); draw(); run(); } });
    draw(); run();
    return () => { if (frame) cancelAnimationFrame(frame); releaseDrag(); cleanup.forEach((remove) => remove()); };
  }, []);

  return (
    <section ref={root} className="product-hero product-measure" aria-labelledby="hero-title" data-memory-scene="overview">
      <div className="product-pitch">
        {children}
        <div className="cycle-story">
          <p className="cycle-label" data-story-label>{STORIES.capture.label}</p>
          <h2 data-story-title>{STORIES.capture.title}</h2>
          <p data-story-copy>{STORIES.capture.copy}</p>
        </div>
      </div>
      <div className="memory-art">
        <svg className="iso-svg" viewBox="90 35 600 440" role="img" aria-label="An interactive memory scene with private drawers, shared reference shelves, a laptop, and a separate shared-trace tray.">
          <g className="memory-ground">{geometry.shadows.map((d, i) => <path key={i} className="iso-halo ground-shadow" d={d} />)}</g>
          <g data-parts>{PARTS.map((item) => <g key={item.name} data-item={item.name} data-key={item.key} data-moving={String(item.moving)} data-zone={item.zone} data-focus={item.focus || undefined} data-trace={item.trace ? "" : undefined} opacity={item.trace ? 0 : 1} dangerouslySetInnerHTML={{ __html: item.svg }} />)}</g>
          <g data-memory-slip opacity="0" className="memory-slip" aria-hidden="true">
            <path className="memory-paper" d="M-15-7L6 1L21-8L0-16Z" /><path className="memory-paper-edge" d="M-15-7V-4L6 4L21-5V-8L6 1Z" /><path className="memory-rules" d="M-8-7L4-2M-4-10L10-5" />
          </g>
        </svg>
        <div className="memory-modes" role="group" aria-label="Explore the memory illustration">{STEPS.map((step) => <button key={step} type="button" data-step={step} aria-pressed={step === "capture"}>{LABELS[step]}</button>)}</div>
        <p className="memory-readout" data-readout>Follow the copy through one connected scene.</p>
        <p className="memory-demo-note">Illustrative cycle. No vault data is read or sent. Hover or focus to pause.</p>
        <span className="sr-only" data-announce aria-live="polite" />
      </div>
    </section>
  );
}
