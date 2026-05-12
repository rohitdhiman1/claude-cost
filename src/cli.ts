import * as fs from "node:fs";
import { resolveModel, MODELS, DEFAULT_MODEL } from "./models.js";
import { estimateCost } from "./estimator.js";
import { estimateViaApi, countTokensViaApi } from "./api.js";
import { reportAll, reportToday, reportSession } from "./report.js";
import { handleStop } from "./hooks/stop.js";
import { install, uninstall } from "./installer.js";
import {
  c,
  formatCost,
  bold,
  dim,
  header,
  drawBox,
  drawTable,
} from "./format.js";
import type { EstimateResult } from "./estimator.js";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function readHookInput(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function requireApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      `${c.red}ANTHROPIC_API_KEY environment variable is required.${c.reset}`
    );
    process.exit(1);
  }
  return apiKey;
}

function printEstimate(result: EstimateResult, outputSpecified: boolean): void {
  const outputLabel = outputSpecified ? "(specified)" : "(estimated)";

  const lines = [
    `${header("Cost Estimate")}`,
    "",
    `${dim("Model:")}         ${bold(result.model.name)} ${dim(`(${result.model.id})`)}`,
    `${dim("Input tokens:")}  ${bold(result.inputTokens.toLocaleString())}`,
    `${dim("Output tokens:")} ${bold(result.outputTokens.toLocaleString())} ${dim(outputLabel)}`,
    "",
    `${dim("Input cost:")}    ${formatCost(result.inputCost)}`,
    `${dim("Output cost:")}   ${formatCost(result.outputCost)}`,
    `                 ${"─".repeat(10)}`,
    `${dim("Total cost:")}    ${bold(formatCost(result.totalCost))}`,
  ];

  console.log("");
  console.log(drawBox(lines));
  console.log("");
}

async function printCompare(
  text: string,
  apiKey: string,
  explicitOutput?: number
): Promise<void> {
  const model = resolveModel(DEFAULT_MODEL);
  const inputTokens = await countTokensViaApi(text, model, apiKey);
  const outputTokens = explicitOutput ?? Math.ceil(inputTokens * 0.5);
  const outputLabel = explicitOutput ? "specified" : "estimated";

  console.log("");
  console.log(
    `  ${header("Model Comparison")}  ${dim(`${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output tokens (${outputLabel})`)}`
  );
  console.log("");

  const rows = Object.values(MODELS).map((m) => {
    const costs = estimateCost(inputTokens, outputTokens, m);
    return [
      `${bold(m.name)}`,
      formatCost(costs.inputCost),
      formatCost(costs.outputCost),
      bold(formatCost(costs.totalCost)),
    ];
  });

  console.log(
    "  " +
      drawTable(["Model", "Input", "Output", "Total"], rows, [1, 2, 3]).replace(
        /\n/g,
        "\n  "
      )
  );
  console.log("");
}

function printUsage(): void {
  const title = `${c.bold}${c.cyan}claude-cost${c.reset} ${dim("— Estimate Claude API costs")}`;
  const help = `
${title}

${header("Usage:")}
  ${bold("claude-cost estimate")} <file|text>    Estimate tokens and cost for input
  ${bold("claude-cost estimate")} --compare      Compare cost across all models
  ${bold("claude-cost estimate")} -              Read from stdin
  ${bold("claude-cost report")}                  Show all session cost data
  ${bold("claude-cost report")} --today          Show today's cost data
  ${bold("claude-cost report")} --session <id>   Show specific session data
  ${bold("claude-cost install")}                 Install Claude Code hook (silent cost logging)
  ${bold("claude-cost uninstall")}               Remove Claude Code hook

${header("Options:")}
  ${bold("-m, --model")} <model>    Model to use ${dim("(default: sonnet)")}
                         Aliases: opus, sonnet, haiku
  ${bold("-o, --output-tokens")} <n> Expected output tokens ${dim("(default: 50% of input)")}
  ${bold("--compare")}             Compare cost across all models
  ${bold("-h, --help")}            Show this help
  ${bold("-v, --version")}         Show version

${header("Environment:")}
  ${bold("ANTHROPIC_API_KEY")}     Required (used for exact token counting)
`;
  console.log(help);
}

function parseArgs(argv: string[]): {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--model" || arg === "-m") {
      flags.model = argv[++i] ?? "";
    } else if (arg === "--output-tokens" || arg === "-o") {
      flags.outputTokens = argv[++i] ?? "";
    } else if (arg === "--compare") {
      flags.compare = true;
    } else if (arg === "--today") {
      flags.today = true;
    } else if (arg === "--session") {
      flags.session = argv[++i] ?? "";
    } else if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--version" || arg === "-v") {
      flags.version = true;
    } else if (arg.startsWith("-") && arg !== "-") {
      console.error(`${c.red}Unknown flag: ${arg}${c.reset}`);
      process.exit(1);
    } else {
      positional.push(arg);
    }
    i++;
  }

  return {
    command: positional[0] ?? "",
    args: positional.slice(1),
    flags,
  };
}

async function getText(args: string[]): Promise<string> {
  if (args.length === 0 || args[0] === "-") {
    const stdin = await readStdin();
    if (!stdin.trim()) {
      console.error(
        `${c.red}No input provided.${c.reset} Pass a file path, text, or pipe via stdin.`
      );
      process.exit(1);
    }
    return stdin;
  }

  const target = args.join(" ");
  if (fs.existsSync(target)) {
    return fs.readFileSync(target, "utf-8");
  }

  return target;
}

async function main(): Promise<void> {
  const { command, args, flags } = parseArgs(process.argv.slice(2));

  if (flags.help) {
    printUsage();
    return;
  }

  if (flags.version) {
    console.log(`${bold("claude-cost")} ${dim("v0.1.0")}`);
    return;
  }

  switch (command) {
    case "estimate": {
      const text = await getText(args);
      const apiKey = requireApiKey();
      const modelId = (flags.model as string) ?? DEFAULT_MODEL;
      const model = resolveModel(modelId);
      const explicitOutput = flags.outputTokens
        ? parseInt(flags.outputTokens as string, 10)
        : undefined;

      if (explicitOutput !== undefined && isNaN(explicitOutput)) {
        console.error(
          `${c.red}--output-tokens must be a number.${c.reset}`
        );
        process.exit(1);
      }

      if (flags.compare) {
        await printCompare(text, apiKey, explicitOutput);
        return;
      }

      const result = await estimateViaApi(text, model, apiKey, explicitOutput);
      printEstimate(result, explicitOutput !== undefined);
      return;
    }

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
