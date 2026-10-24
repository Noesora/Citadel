import { describe, expect, it } from "vitest";

import { createMemoryState, transitionMemory } from "./memory-model";

describe("memory model", () => {
  it("starts in the private Node with all flags clear", () => {
    expect(createMemoryState()).toEqual({
      mode: "node",
      shared: false,
      captured: false,
      recalled: false,
    });
  });

  it.each(["client", "node", "central", "traces", "hooks"] as const)(
    "creates an empty %s view",
    (mode) => {
      expect(createMemoryState(mode)).toEqual({
        mode,
        shared: false,
        captured: false,
        recalled: false,
      });
    },
  );

  it("captures a client drop into the private Node", () => {
    expect(
      transitionMemory(createMemoryState("client"), {
        type: "drop",
        from: "client",
        to: "node",
      }),
    ).toEqual({
      mode: "node",
      shared: false,
      captured: true,
      recalled: false,
    });
  });

  it("recalls a Central drop into the client", () => {
    expect(
      transitionMemory(createMemoryState("central"), {
        type: "drop",
        from: "central",
        to: "client",
      }),
    ).toEqual({
      mode: "client",
      shared: false,
      captured: false,
      recalled: true,
    });
  });

  it("shares a Node drop while keeping the private capture", () => {
    const captured = transitionMemory(createMemoryState("client"), {
      type: "capture",
    });

    expect(
      transitionMemory(captured, {
        type: "drop",
        from: "node",
        to: "traces",
      }),
    ).toEqual({
      mode: "traces",
      shared: true,
      captured: true,
      recalled: false,
    });
  });

  it.each([
    ["client", "traces"],
    ["central", "traces"],
    ["node", "central"],
    ["traces", "node"],
  ] as const)("returns the same state for invalid drop %s to %s", (from, to) => {
    const state = createMemoryState(from);

    expect(transitionMemory(state, { type: "drop", from, to })).toBe(state);
  });

  it("inspects a view without sharing or clearing other flags", () => {
    const state = {
      ...createMemoryState("node"),
      captured: true,
      recalled: true,
    };

    expect(
      transitionMemory(state, { type: "inspect", mode: "hooks" }),
    ).toEqual({
      mode: "hooks",
      shared: false,
      captured: true,
      recalled: true,
    });
  });

  it("keeps earlier flags across explicit capture, recall, and share actions", () => {
    const captured = transitionMemory(createMemoryState("client"), {
      type: "capture",
    });
    const recalled = transitionMemory(captured, { type: "recall" });

    expect(transitionMemory(recalled, { type: "share" })).toEqual({
      mode: "traces",
      shared: true,
      captured: true,
      recalled: true,
    });
  });

  it("resets flags while keeping the current view", () => {
    const state = {
      mode: "traces" as const,
      shared: true,
      captured: true,
      recalled: true,
    };

    expect(transitionMemory(state, { type: "reset" })).toEqual(
      createMemoryState("traces"),
    );
  });
});
