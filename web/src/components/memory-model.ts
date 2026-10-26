export type MemoryStep = "capture" | "node" | "share" | "recall";
export type MemoryZone = "client" | "node" | "traces" | "central";
export type MemoryState = {
  step: MemoryStep;
  elapsed: number;
  playing: boolean;
  manual: boolean;
  shared: boolean;
  captured: boolean;
  recalled: boolean;
};
export type MemoryAction =
  | { type: "tick"; seconds: number }
  | { type: "select"; step: MemoryStep; reduced?: boolean }
  | { type: "play" | "interrupt" | "reduce" }
  | { type: "reset"; reduced?: boolean }
  | { type: "drop"; from: MemoryZone; to: MemoryZone };

export const STEPS: MemoryStep[] = ["capture", "node", "share", "recall"];
export const STEP_SECONDS = 4.8;
export const FLIGHT_START = 0.7;
export const FLIGHT_END = 2.5;
export const STORIES: Record<MemoryStep, { label: string; title: string; copy: string; done: string }> = {
  capture: { label: "Capture hooks", title: "Do the work. Keep the context.", copy: "Supported hooks send an example session summary into your private Node.", done: "Example context captured into your private Node." },
  node: { label: "Your Node", title: "A memory that stays yours.", copy: "Your working context stays separate from other members' Nodes. The next task has a better starting point.", done: "Your working context stays in your Node." },
  share: { label: "Shared session traces", title: "Useful work, shared by choice.", copy: "A volunteered copy moves into the shared tray. Your private session stays in your Node.", done: "Example trace shared. Private copy kept." },
  recall: { label: "Central", title: "Ask once. Find what the team knows.", copy: "A source reference returns to your agent. The original stays in shared Central.", done: "Source reference returned to your agent." },
};

export function createMemoryState(reduced = false): MemoryState {
  return { step: reduced ? "node" : "capture", elapsed: 0, playing: !reduced, manual: false, shared: false, captured: false, recalled: false };
}

function complete(state: MemoryState): MemoryState {
  if (state.step === "capture") return { ...state, captured: true };
  if (state.step === "share") return { ...state, shared: true };
  if (state.step === "recall") return { ...state, recalled: true };
  return state;
}

export function transitionMemory(state: MemoryState, action: MemoryAction): MemoryState {
  if (action.type === "reset") return { ...createMemoryState(action.reduced), playing: false };
  if (action.type === "play") return { ...state, playing: true, manual: false };
  if (action.type === "interrupt" || action.type === "reduce") return { ...state, elapsed: 0, playing: false, manual: false };
  if (action.type === "select") {
    const next = { ...state, step: action.step, elapsed: action.reduced ? STEP_SECONDS : 0, playing: false, manual: !action.reduced };
    return action.reduced ? complete(next) : next;
  }
  if (action.type === "drop") {
    const step = action.from === "client" && action.to === "node" ? "capture"
      : action.from === "node" && action.to === "traces" ? "share"
      : action.from === "central" && action.to === "client" ? "recall" : null;
    return step ? complete({ ...state, step, elapsed: STEP_SECONDS, playing: false, manual: false }) : state;
  }
  if (action.type !== "tick" || (!state.playing && !state.manual) || !Number.isFinite(action.seconds) || action.seconds <= 0) return state;
  const elapsed = Math.min(state.elapsed + Math.min(action.seconds, STEP_SECONDS), STEP_SECONDS);
  const next = elapsed >= FLIGHT_END ? complete({ ...state, elapsed }) : { ...state, elapsed };
  if (elapsed < STEP_SECONDS) return next;
  return state.playing
    ? { ...next, step: STEPS[(STEPS.indexOf(state.step) + 1) % STEPS.length], elapsed: 0 }
    : { ...next, manual: false };
}

export function canAdvance(state: MemoryState, blocked: { reduced: boolean; hidden: boolean; visible: boolean; hover: boolean; focus: boolean; dragging: boolean }): boolean {
  return !blocked.reduced && !blocked.hidden && blocked.visible && !blocked.dragging
    && (state.manual || (state.playing && !blocked.hover && !blocked.focus));
}

export function flightProgress(state: MemoryState): number {
  return state.step === "node" ? 0 : Math.max(0, Math.min(1, (state.elapsed - FLIGHT_START) / (FLIGHT_END - FLIGHT_START)));
}
