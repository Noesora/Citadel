import { describe, expect, it } from "vitest";
import { canAdvance, createMemoryState, flightProgress, FLIGHT_END, STEP_SECONDS, transitionMemory } from "./memory-model";

const ready = { reduced: false, hidden: false, visible: true, hover: false, focus: false, dragging: false };
const advance = (state = createMemoryState(), seconds = STEP_SECONDS) => transitionMemory(state, { type: "tick", seconds });

describe("single memory cycle", () => {
  it("cycles through capture, private Node, sharing, and retrieval", () => {
    let state = createMemoryState();
    expect(state.step).toBe("capture");
    state = advance(state); expect(state.step).toBe("node"); expect(state.captured).toBe(true);
    state = advance(state); expect(state.step).toBe("share"); expect(state.shared).toBe(false);
    state = advance(state); expect(state.step).toBe("recall"); expect(state.shared).toBe(true);
    state = advance(state); expect(state.step).toBe("capture"); expect(state.shared).toBe(true); expect(state.recalled).toBe(true);
  });
  it("does not share until the card lands", () => {
    let state = transitionMemory(createMemoryState(), { type: "select", step: "share" });
    state = advance(state, FLIGHT_END - .1);
    expect(state.shared).toBe(false); expect(flightProgress(state)).toBeLessThan(1);
    state = advance(state, .1);
    expect(state.shared).toBe(true); expect(flightProgress(state)).toBe(1);
  });
  it("reset cancels an unfinished share and all later ticks", () => {
    let state = transitionMemory(createMemoryState(), { type: "select", step: "share" });
    state = advance(state, 1.5);
    state = transitionMemory(state, { type: "reset" });
    expect(advance(state)).toEqual(state); expect(state.shared).toBe(false); expect(state.step).toBe("capture"); expect(state.elapsed).toBe(0);
  });
  it("selecting another step discards the earlier flight", () => {
    let state = transitionMemory(createMemoryState(), { type: "select", step: "share" });
    state = advance(state, 1);
    state = transitionMemory(state, { type: "select", step: "recall" });
    state = advance(state, FLIGHT_END);
    expect(state.shared).toBe(false); expect(state.recalled).toBe(true);
  });
  it.each(["hover", "focus", "hidden", "dragging", "reduced"] as const)("suspends autoplay for %s", (reason) => {
    expect(canAdvance(createMemoryState(), { ...ready, [reason]: true })).toBe(false);
  });
  it("suspends offscreen work", () => expect(canAdvance(createMemoryState(), { ...ready, visible: false })).toBe(false));
  it("allows explicit manual actions during hover or keyboard focus", () => {
    const state = transitionMemory(createMemoryState(), { type: "select", step: "share" });
    expect(canAdvance(state, { ...ready, focus: true, hover: true })).toBe(true);
    expect(canAdvance(state, { ...ready, hidden: true })).toBe(false);
  });
  it("starts static under reduced motion and supports explicit sharing", () => {
    const state = createMemoryState(true);
    expect(state.playing).toBe(false); expect(state.step).toBe("node");
    const selected = transitionMemory(state, { type: "select", step: "share", reduced: true });
    expect(selected.shared).toBe(true); expect(selected.manual).toBe(false); expect(flightProgress(selected)).toBe(1);
  });
  it("changing to reduced motion cannot finish a pending share", () => {
    const pending = advance(transitionMemory(createMemoryState(), { type: "select", step: "share" }), 1);
    const state = transitionMemory(pending, { type: "reduce" });
    expect(advance(state).shared).toBe(false); expect(state.elapsed).toBe(0);
  });
  it.each([["client", "node", "captured"], ["node", "traces", "shared"], ["central", "client", "recalled"]] as const)("completes valid drop %s to %s", (from, to, flag) => {
    const state = transitionMemory(createMemoryState(), { type: "drop", from, to });
    expect(state[flag]).toBe(true); expect(state.playing).toBe(false); expect(state.manual).toBe(false);
  });
  it.each([["node", "central"], ["client", "traces"], ["central", "traces"]] as const)("rejects invalid drop %s to %s", (from, to) => {
    const state = createMemoryState();
    expect(transitionMemory(state, { type: "drop", from, to })).toBe(state);
  });
  it("interrupting a drag clears an earlier pending flight", () => {
    const state = transitionMemory(advance(transitionMemory(createMemoryState(), { type: "select", step: "share" }), 1), { type: "interrupt" });
    expect(state.elapsed).toBe(0); expect(advance(state).shared).toBe(false);
  });
  it.each([NaN, Infinity, -1, 0])("rejects invalid clock increments %s", (seconds) => {
    const state = createMemoryState(); expect(advance(state, seconds)).toBe(state);
  });
});
