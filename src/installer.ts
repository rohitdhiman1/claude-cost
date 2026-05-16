import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json");

const HOOK_MARKER = "claude-cost";

interface HookEntry {
  type: string;
  command: string;
  timeout?: number;
}

interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

interface Settings {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

function getClaudeCostBin(): string {
  const npxPath = process.argv[1];
  if (npxPath && npxPath.includes("claude-cost")) {
    return npxPath;
  }
  return "claude-cost";
}

function buildHookConfig(): Record<string, HookMatcher[]> {
  const bin = getClaudeCostBin();
  return {
    Stop: [
      {
        matcher: "",
        hooks: [
          {
            type: "command",
            command: `${bin} hook-stop`,
            timeout: 10,
          },
        ],
      },
    ],
  };
}

function isClaudeCostHook(matcher: HookMatcher): boolean {
  return matcher.hooks.some((h) => h.command.includes(HOOK_MARKER));
}

export function install(): string {
  let settings: Settings = {};

  if (fs.existsSync(SETTINGS_PATH)) {
    settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) as Settings;
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }

  const hookConfig = buildHookConfig();

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter(
      (m) => !isClaudeCostHook(m)
    );
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  for (const [event, matchers] of Object.entries(hookConfig)) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = [];
    }
    settings.hooks[event].push(...matchers);
  }

  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");

  return `Hooks installed to ${SETTINGS_PATH}`;
}

export function uninstall(): string {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return "No settings file found. Nothing to uninstall.";
  }

  const settings = JSON.parse(
    fs.readFileSync(SETTINGS_PATH, "utf-8")
  ) as Settings;

  if (!settings.hooks) {
    return "No hooks configured. Nothing to uninstall.";
  }

  let removed = 0;
  for (const event of Object.keys(settings.hooks)) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(
      (m) => !isClaudeCostHook(m)
    );
    removed += before - settings.hooks[event].length;
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");

  return removed > 0
    ? `Removed ${removed} hook(s) from ${SETTINGS_PATH}`
    : "No claude-cost hooks found. Nothing to uninstall.";
}
