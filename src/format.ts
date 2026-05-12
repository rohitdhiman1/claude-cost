const isColorSupported =
  process.env.FORCE_COLOR !== "0" &&
  process.env.NO_COLOR === undefined &&
  (process.stdout.isTTY ?? false);

const esc = (code: string) => (isColorSupported ? `\x1b[${code}m` : "");

export const c = {
  reset: esc("0"),
  bold: esc("1"),
  dim: esc("2"),
  green: esc("32"),
  yellow: esc("33"),
  red: esc("31"),
  cyan: esc("36"),
  magenta: esc("35"),
  white: esc("37"),
  bgGreen: esc("42"),
  bgYellow: esc("43"),
  bgRed: esc("41"),
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

export function formatCostPlain(cost: number): string {
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
}

export function costBadge(cost: number): string {
  const raw = formatCostPlain(cost);
  if (!isColorSupported) return `[ ${raw} ]`;
  if (cost < 0.01) return `${c.bgGreen}\x1b[30m ${raw} ${c.reset}`;
  if (cost < 0.1) return `${c.bgYellow}\x1b[30m ${raw} ${c.reset}`;
  return `${c.bgRed}\x1b[97m ${raw} ${c.reset}`;
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

export function label(text: string): string {
  return `${c.dim}${text}${c.reset}`;
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
