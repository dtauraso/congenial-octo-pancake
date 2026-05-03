import { spec } from "../state";
import { registerStateText } from "./animation";

export function registerStateTextsFromDom() {
  const els = staticRootTexts();
  for (const el of els) {
    const field = el.getAttribute("data-state-field");
    const nodeId = el.getAttribute("data-node-id");
    if (!field || !nodeId) continue;
    const n = spec.nodes.find((x) => x.id === nodeId);
    if (!n || !n.state) continue;
    const segments: { t: number; v: string }[] = [{ t: 0, v: String(n.state[field]) }];
    for (const s of spec.timing?.steps ?? []) {
      const v = s.state?.[nodeId]?.[field];
      if (v !== undefined) segments.push({ t: s.t, v: String(v) });
    }
    if (segments.length > 1) registerStateText({ el, field, segments });
  }
}

function staticRootTexts(): SVGTextElement[] {
  return Array.from(document.querySelectorAll<SVGTextElement>("[data-state-field]"));
}
