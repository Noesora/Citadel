// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryScene } from "./memory-scene";

let root: Root;
let container: HTMLDivElement;
let scene: HTMLElement;
let art: HTMLElement;
let motion: EventTarget & { matches: boolean };
let callbacks: Map<number, FrameRequestCallback>;
let timestamp: number;
let hidden: PropertyDescriptor | undefined;

function frames(count: number) {
  for (let frame = 0; frame < count; frame += 1) {
    timestamp += 1000 / 60;
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(timestamp));
  }
}

beforeEach(async () => {
  callbacks = new Map();
  timestamp = 0;
  let nextFrame = 0;
  motion = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("matchMedia", () => motion);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private notify: (entries: { isIntersecting: boolean }[]) => void) {}
    observe() { this.notify([{ isIntersecting: true }]); }
    disconnect() {}
  });
  hidden = Object.getOwnPropertyDescriptor(document, "hidden");
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(MemoryScene, { children: createElement("h1", { id: "hero-title" }, "Citadel") }));
  });
  scene = container.querySelector<HTMLElement>("[data-memory-scene]")!;
  art = container.querySelector<HTMLElement>(".memory-art")!;
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  if (hidden) Object.defineProperty(document, "hidden", hidden);
  else Reflect.deleteProperty(document, "hidden");
  vi.unstubAllGlobals();
});

describe("continuous landing illustration", () => {
  it("cycles repeatedly without a play/resume or Reset control", () => {
    const controls = [...scene.querySelectorAll("button")].map((button) => button.textContent);
    expect(controls.some((label) => /pause cycle|resume cycle|reset/i.test(label || ""))).toBe(false);
    const phases = [scene.dataset.step];
    for (let phase = 0; phase < 8; phase += 1) {
      frames(300);
      phases.push(scene.dataset.step);
    }
    expect(phases).toEqual(["capture", "node", "share", "recall", "capture", "node", "share", "recall", "capture"]);
  }, 15_000);

  it("retains keyboard pause until focus leaves, then resumes without a button", async () => {
    const share = scene.querySelector<HTMLButtonElement>('button[data-step="share"]')!;
    await act(async () => { share.focus(); share.click(); });
    frames(310);
    expect(scene.dataset.step).toBe("share");
    expect(scene.dataset.paused).toBe("true");
    art.dispatchEvent(new PointerEvent("pointerleave"));
    frames(60);
    expect(scene.dataset.paused).toBe("true");
    expect(scene.dataset.step).toBe("share");
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    await act(async () => outside.focus());
    frames(60);
    expect(scene.dataset.paused).toBe("false");
    expect(scene.dataset.step).toBe("recall");
  });

  it("pauses for cursor inspection and continues when the cursor leaves", () => {
    frames(60);
    art.dispatchEvent(new PointerEvent("pointerenter"));
    const pausedStep = scene.dataset.step;
    const pausedTime = scene.dataset.elapsed;
    frames(360);
    expect(scene.dataset.paused).toBe("true");
    expect(scene.dataset.step).toBe(pausedStep);
    expect(scene.dataset.elapsed).toBe(pausedTime);
    art.dispatchEvent(new PointerEvent("pointerleave"));
    frames(300);
    expect(scene.dataset.paused).toBe("false");
    expect(scene.dataset.step).toBe("node");
  });

  it("honors reduced motion and resumes after the preference is turned off", () => {
    frames(60);
    motion.matches = true;
    motion.dispatchEvent(new Event("change"));
    const pausedStep = scene.dataset.step;
    frames(360);
    expect(scene.dataset.paused).toBe("true");
    expect(scene.dataset.step).toBe(pausedStep);
    expect(scene.dataset.elapsed).toBe("0.000");
    motion.matches = false;
    motion.dispatchEvent(new Event("change"));
    frames(300);
    expect(scene.dataset.paused).toBe("false");
    expect(scene.dataset.step).toBe("node");
  });
});
