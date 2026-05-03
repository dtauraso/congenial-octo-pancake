import { svg } from "lit-html";
import { KIND_COLORS, type Spec } from "../../schema";
import { markerId } from "../defs";
import { spec } from "../state";

export function noteTemplate(n: NonNullable<Spec["notes"]>[number]) {
  const w = n.width ?? 320;
  const h = n.height ?? 55;
  const lines = n.text.split("\n");
  const cx = n.x + w / 2;
  const top = n.y + 18;
  const lh = 15;
  return svg`
    <g data-role="annotation">
      <rect x=${n.x} y=${n.y} width=${w} height=${h} rx="4" fill="#fff9c4" stroke="#f9a825"/>
      ${lines.map((line, i) => svg`
        <text x=${cx} y=${top + i * lh} text-anchor="middle" font-size="11" fill="#f57f17" stroke="none">${line}</text>`)}
    </g>`;
}

export function legendTemplate() {
  const rows = spec.legend!;
  const x = 20, y = 548, w = 600, rowH = 18, headerH = 23;
  const h = headerH + rows.length * rowH + 10;
  return svg`
    <g id="legend" data-role="legend">
      <rect x=${x} y=${y} width=${w} height=${h} rx="4" fill="#f0f0f0" stroke="#ccc"/>
      <text x=${x + 65} y=${y + 18} font-size="12" font-weight="bold" fill="#333" stroke="none">Color</text>
      <text x=${x + 200} y=${y + 18} font-size="12" font-weight="bold" fill="#333" stroke="none">Description</text>
      <line x1=${x + 10} y1=${y + headerH} x2=${x + w - 10} y2=${y + headerH} stroke="#ccc" stroke-width="1"/>
      <line x1=${x + 190} y1=${y + 5} x2=${x + 190} y2=${y + h - 5} stroke="#ccc" stroke-width="0.5"/>
      ${rows.map((row, i) => {
        const ry = y + headerH + 14 + i * rowH;
        const color = KIND_COLORS[row.kind] ?? "#888";
        const marker = `url(#${markerId(row.kind, row.kind === "edge-connection")})`;
        return svg`
          <line x1=${x + 20} y1=${ry} x2=${x + 50} y2=${ry} stroke=${color} stroke-width="1.5" marker-end=${marker}/>
          <text x=${x + 65} y=${ry + 4} font-size="11" fill=${color} stroke="none">${row.name}</text>
          <text x=${x + 200} y=${ry + 4} font-size="11" fill="#666" stroke="none">${row.desc}</text>`;
      })}
    </g>`;
}
