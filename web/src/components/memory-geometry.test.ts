import { describe, expect, it } from "vitest";

import geometry from "./memory-geometry.json";

type MemoryGeometry = typeof geometry;

const EXPECTED_ZONES = ["central", "client", "node", "traces"];
const FORBIDDEN_SVG = [
  /<\s*\/?\s*(?:script|foreignObject)\b/i,
  /(?:^|\s)on[a-z][\w:-]*\s*=/i,
  /(?:^|\s)(?:xlink:)?href\s*=/i,
  /\b(?:nan|[+-]?infinity)\b/i,
];
const SVG_NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function geometryProblems(candidate: MemoryGeometry): string[] {
  const problems: string[] = [];
  const names = candidate.items.map((item) => item.name);
  if (new Set(names).size !== names.length) problems.push("item names must be unique");

  const zones = [...new Set(candidate.items.map((item) => item.zone))].sort();
  if (zones.join(",") !== EXPECTED_ZONES.join(",")) {
    problems.push("items must cover the four expected zones");
  }

  const traceCopies = candidate.items.filter((item) => item.name === "traces.example-copy");
  if (traceCopies.length !== 1 || traceCopies[0]?.zone !== "traces" || traceCopies[0]?.trace !== true) {
    problems.push("traces.example-copy must appear once as a shared trace");
  }

  for (const [label, matches] of [
    ["drawer.2", candidate.items.filter((item) => item.name.startsWith("drawer.2."))],
    ["node.context", candidate.items.filter((item) => item.name.startsWith("node.context"))],
  ] as const) {
    if (matches.length === 0 || matches.some((item) => !item.moving)) {
      problems.push(`${label} parts must all move with the drawer`);
    }
  }

  for (const item of candidate.items) {
    const svg = item.svg;
    if (FORBIDDEN_SVG.some((pattern) => pattern.test(svg))) {
      problems.push(`${item.name} contains unsafe or non-finite SVG markup`);
      continue;
    }
    const numbers = svg.match(SVG_NUMBER) ?? [];
    if (numbers.some((number) => !Number.isFinite(Number(number)))) {
      problems.push(`${item.name} contains non-finite SVG coordinates`);
    }
  }

  return problems;
}

function copyGeometry(): MemoryGeometry {
  return JSON.parse(JSON.stringify(geometry)) as MemoryGeometry;
}

describe("memory geometry metadata", () => {
  it("keeps scene names, zones, drawer motion, and inline SVG valid", () => {
    expect(geometryProblems(geometry)).toEqual([]);
  });

  it("rejects duplicate names and executable SVG in broken metadata", () => {
    const broken = copyGeometry();
    broken.items[1].name = broken.items[0].name;
    broken.items[2].svg += '<script onload="run()" href="javascript:run()"></script>';

    expect(geometryProblems(broken)).toEqual(
      expect.arrayContaining([
        "item names must be unique",
        expect.stringContaining("unsafe or non-finite SVG markup"),
      ]),
    );
  });
});
