export type MemoryMode = "client" | "node" | "central" | "traces" | "hooks";
export type MemoryState = { mode: MemoryMode; shared: boolean; captured: boolean; recalled: boolean };
export type MemoryAction =
  | { type: "inspect"; mode: MemoryMode }
  | { type: "drop"; from: MemoryMode; to: MemoryMode }
  | { type: "capture" | "recall" | "share" | "reset" };

export function createMemoryState(mode: MemoryMode = "node"): MemoryState {
  return { mode, shared: false, captured: false, recalled: false };
}

export function transitionMemory(state: MemoryState, action: MemoryAction): MemoryState {
  if (action.type === "inspect") return { ...state, mode: action.mode };
  if (action.type === "reset") return createMemoryState(state.mode);
  if (action.type === "drop") {
    if (action.from === "client" && action.to === "node") return transitionMemory(state, { type: "capture" });
    if (action.from === "central" && action.to === "client") return transitionMemory(state, { type: "recall" });
    if (action.from === "node" && action.to === "traces") return transitionMemory(state, { type: "share" });
    return state;
  }
  if (action.type === "capture") return { ...state, mode: "node", captured: true };
  if (action.type === "recall") return { ...state, mode: "client", recalled: true };
  return { ...state, mode: "traces", shared: true };
}
