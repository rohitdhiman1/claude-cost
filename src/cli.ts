import { reportAll, reportToday, reportSession } from "./report.js";
import { handleStop } from "./hooks/stop.js";
import { install, uninstall } from "./installer.js";
import { c, bold, dim, header } from "./format.js";

function readHookInput(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function printUsage(): void {
  const title = `${c.bold}${c.cyan}claude-cost${c.reset} ${dim("— Track Claude Code session costs")}`;
  const help = `
${title}

${header("Usage:")}
  ${bold("claude-cost report")}                  Show all session cost data
  ${bold("claude-cost report")} --today          Show today's cost data
  ${bold("claude-cost report")} --session <id>   Show specific session data
  ${bold("claude-cost install")}                 Install Claude Code hook (silent cost logging)
  ${bold("claude-cost uninstall")}               Remove Claude Code hook

${header("Options:")}
  ${bold("-h, --help")}            Show this help
  ${bold("-v, --version")}         Show version
`;
  console.log(help);
}

function parseArgs(argv: string[]): {
  command: string;
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--today") {
      flags.today = true;
    } else if (arg === "--session") {
      flags.session = argv[++i] ?? "";
    } else if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--version" || arg === "-v") {
      flags.version = true;
    } else if (arg.startsWith("-")) {
      console.error(`${c.red}Unknown flag: ${arg}${c.reset}`);
      process.exit(1);
    } else {
      positional.push(arg);
    }
    i++;
  }

  return {
    command: positional[0] ?? "",
    flags,
  };
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (flags.help) {
    printUsage();
    return;
  }

  if (flags.version) {
    console.log(`${bold("claude-cost")} ${dim("v0.1.0")}`);
    return;
  }

  switch (command) {
    case "report": {
      if (flags.session) {
        console.log(reportSession(flags.session as string));
      } else if (flags.today) {
        console.log(reportToday());
      } else {
        console.log(reportAll());
      }
      return;
    }

    case "install": {
      console.log(`${c.green}✓${c.reset} ${install()}`);
      return;
    }

    case "uninstall": {
      console.log(`${c.green}✓${c.reset} ${uninstall()}`);
      return;
    }

    case "hook-stop": {
      const input = await readHookInput();
      try {
        handleStop(JSON.parse(input));
      } catch (err) {
        process.stderr.write(
          `${c.red}[claude-cost] hook-stop error: ${err}${c.reset}\n`
        );
      }
      return;
    }

    default:
      printUsage();
      if (command) {
        console.error(`${c.red}Unknown command: ${command}${c.reset}`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
