const isColorSupported =
  process.env.FORCE_COLOR !== "0" &&
  process.env.NO_COLOR === undefined &&
  (process.stdout.isTTY ?? false);

const is256Color =
  isColorSupported &&
  (process.env.TERM?.includes("256color") || process.env.COLORTERM === "truecolor" || process.env.TERM_PROGRAM === "iTerm.app" || process.env.TERM_PROGRAM === "Apple_Terminal");

const esc = (code: string) => (isColorSupported ? `\x1b[${code}m` : "");
const fg256 = (n: number) => (is256Color ? `\x1b[38;5;${n}m` : "");
const rgb = (r: number, g: number, b: number) =>
  isColorSupported ? `\x1b[38;2;${r};${g};${b}m` : "";

export const c = {
  reset: esc("0"),
  bold: esc("1"),
  dim: esc("2"),
  green: esc("32"),
  yellow: esc("33"),
  red: esc("31"),
  cyan: esc("36"),
};

export function colorCost(cost: number, formatted: string): string {
  if (cost < 0.01) return `${c.green}${formatted}${c.reset}`;
  if (cost < 0.1) return `${c.yellow}${formatted}${c.reset}`;
  return `${c.red}${formatted}${c.reset}`;
}

export function formatCost(cost: number): string {
  const raw = cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
  return colorCost(cost, raw);
}

export function header(text: string): string {
  return `${c.bold}${c.cyan}${text}${c.reset}`;
}

export function dim(text: string): string {
  return `${c.dim}${text}${c.reset}`;
}

export function bold(text: string): string {
  return `${c.bold}${text}${c.reset}`;
}

export const box = {
  tl: "╭",
  tr: "╮",
  bl: "╰",
  br: "╯",
  h: "─",
  v: "│",
  divider: "├",
  dividerR: "┤",
};

export function boxLine(content: string, width: number): string {
  const stripped = content.replace(/\x1b\[[0-9;]*m/g, "");
  const pad = Math.max(0, width - stripped.length);
  return `${box.v} ${content}${" ".repeat(pad)} ${box.v}`;
}

export function boxTop(width: number): string {
  return `${box.tl}${box.h.repeat(width + 2)}${box.tr}`;
}

export function boxBottom(width: number): string {
  return `${box.bl}${box.h.repeat(width + 2)}${box.br}`;
}

export function boxDivider(width: number): string {
  return `${box.divider}${box.h.repeat(width + 2)}${box.dividerR}`;
}

export function drawBox(lines: string[], minWidth = 40): string {
  const stripped = lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, ""));
  const maxLen = Math.max(minWidth, ...stripped.map((l) => l.length));
  const rows = [
    boxTop(maxLen),
    ...lines.map((l) => boxLine(l, maxLen)),
    boxBottom(maxLen),
  ];
  return rows.join("\n");
}

export function drawTable(
  headers: string[],
  rows: string[][],
  alignRight: number[] = []
): string {
  const colWidths = headers.map((h, i) =>
    Math.max(
      h.length,
      ...rows.map((r) => (r[i] ?? "").replace(/\x1b\[[0-9;]*m/g, "").length)
    )
  );

  const pad = (text: string, width: number, right: boolean) => {
    const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
    const diff = width - plain.length;
    if (diff <= 0) return text;
    return right ? " ".repeat(diff) + text : text + " ".repeat(diff);
  };

  const headerLine = headers
    .map((h, i) => `${c.bold}${pad(h, colWidths[i], alignRight.includes(i))}${c.reset}`)
    .join("  ");

  const dividerLine = colWidths.map((w) => box.h.repeat(w)).join(box.h + box.h);

  const dataLines = rows.map((row) =>
    row
      .map((cell, i) => pad(cell, colWidths[i], alignRight.includes(i)))
      .join("  ")
  );

  return [headerLine, dividerLine, ...dataLines].join("\n");
}

export function sparkline(values: number[]): string {
  if (values.length === 0) return "";
  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * (blocks.length - 1));
      return blocks[idx];
    })
    .join("");
}

const BAR_GRADIENT = [
  [80, 200, 120],
  [120, 220, 100],
  [180, 220, 60],
  [220, 200, 40],
  [240, 160, 40],
  [250, 100, 50],
  [240, 60, 60],
] as const;

function barColor(ratio: number): string {
  const idx = ratio * (BAR_GRADIENT.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.min(lower + 1, BAR_GRADIENT.length - 1);
  const t = idx - lower;
  const r = Math.round(BAR_GRADIENT[lower][0] + t * (BAR_GRADIENT[upper][0] - BAR_GRADIENT[lower][0]));
  const g = Math.round(BAR_GRADIENT[lower][1] + t * (BAR_GRADIENT[upper][1] - BAR_GRADIENT[lower][1]));
  const b = Math.round(BAR_GRADIENT[lower][2] + t * (BAR_GRADIENT[upper][2] - BAR_GRADIENT[lower][2]));
  return rgb(r, g, b);
}

export function costBar(cost: number, maxCost: number, width = 20): string {
  if (!is256Color || maxCost === 0) return "";
  const ratio = Math.min(cost / maxCost, 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  let bar = "";
  for (let i = 0; i < filled; i++) {
    const segRatio = i / width;
    bar += `${barColor(segRatio)}█`;
  }
  bar += `${c.dim}${"░".repeat(empty)}${c.reset}`;
  return bar;
}

export function brandedHeader(_subtitle?: string, totalWidth?: number): string {
  const accent = is256Color ? rgb(130, 160, 220) : c.cyan;
  const money = is256Color ? rgb(100, 200, 130) : c.green;
  const mutedText = is256Color ? rgb(140, 140, 160) : c.dim;

  const innerW = totalWidth ? totalWidth - 2 : 48;

  const topLabelPlain = " claude-cost v0.1.0 ";
  const topLabel = ` ${c.bold}claude-cost${c.reset} ${mutedText}v0.1.0${c.reset} `;
  const dashesLeft = 3;
  const dashesRight = innerW - dashesLeft - topLabelPlain.length;
  const top = `${dim(box.tl)}${dim(box.h.repeat(dashesLeft))}${topLabel}${dim(box.h.repeat(Math.max(0, dashesRight)))}${dim(box.tr)}`;
  const bottom = `${dim(box.bl)}${dim(box.h.repeat(innerW))}${dim(box.br)}`;
  const emptyLine = `${dim(box.v)}${" ".repeat(innerW)}${dim(box.v)}`;

  const padLine = (content: string, plainLen: number) => {
    const remaining = innerW - 4 - plainLen;
    return `${dim(box.v)}  ${content}${" ".repeat(Math.max(0, remaining))}  ${dim(box.v)}`;
  };

  const nameContent = `${accent}◉${c.reset}  ${c.bold}claude-cost${c.reset}  ${c.green}$${c.reset}`;
  const namePlain = "◉  claude-cost  $";
  const tagline = "Know what your AI conversations cost.";
  const subtitleContent = `${mutedText}${tagline}${c.reset}`;

  const lines = [
    top,
    emptyLine,
    padLine(nameContent, namePlain.length),
    padLine(subtitleContent, tagline.length),
    emptyLine,
    bottom,
  ];

  return lines.join("\n");
}

export function measureTableWidth(tableStr: string): number {
  const lines = tableStr.split("\n");
  let maxPlain = 0;
  for (const line of lines) {
    const plain = line.replace(/\x1b\[[0-9;]*m/g, "");
    if (plain.length > maxPlain) maxPlain = plain.length;
  }
  return maxPlain;
}

