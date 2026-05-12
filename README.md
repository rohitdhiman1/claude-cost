# claude-cost

CLI tool and Claude Code hooks for estimating and tracking Claude API costs.

## Features

- **Estimate tokens and cost** for any text or file before sending to Claude
- **Compare pricing** across all Claude models (Opus, Sonnet, Haiku)
- **Exact token counts** via the Anthropic Token Counting API
- **Automatic cost tracking** per turn and per session via Claude Code hooks
- **Cost reports** — daily, per-session, or all-time summaries
- Zero runtime dependencies

## Install

```bash
npm install -g claude-cost
```

Or run directly:

```bash
npx claude-cost estimate "your prompt here"
```

## Usage

### Estimate cost

```bash
# Estimate from text
claude-cost estimate "Explain how neural networks work"

# Estimate from a file
claude-cost estimate prompt.txt

# Pipe from stdin
cat prompt.txt | claude-cost estimate -

# Use a specific model (default: sonnet)
claude-cost estimate -m opus "your prompt"
claude-cost estimate -m haiku "your prompt"

# Exact token count via Anthropic API (requires ANTHROPIC_API_KEY)
claude-cost estimate --exact "your prompt"

# Compare cost across all models
claude-cost estimate --compare "your prompt"
```

**Example output:**

```
Model:         Sonnet 4.6 (claude-sonnet-4-6)
Method:        Local (approximate)
Input tokens:  21
Output tokens: 11 (estimated)

Input cost:    $0.0001
Output cost:   $0.0002
Total cost:    $0.0002
```

**Compare output:**

```
Input tokens:  21 (estimated)
Output tokens: 11 (estimated)

Model                     Input     Output      Total
────────────────────────────────────────────────────
Opus 4.7                $0.0001    $0.0003    $0.0004
Sonnet 4.6              $0.0001    $0.0002    $0.0002
Haiku 4.5               $0.0000    $0.0001    $0.0001
```

### Cost reports

```bash
# Show all tracked sessions
claude-cost report

# Show today's sessions only
claude-cost report --today

# Show a specific session
claude-cost report --session <session-id>
```

### Claude Code hooks

Hooks automatically track cost after every Claude Code turn and print a summary when a session ends.

**Automatic setup:**

```bash
# Install hooks into ~/.claude/settings.json
claude-cost install

# Remove hooks
claude-cost uninstall
```

**Manual setup:**

Add the following to `~/.claude/settings.json` (user-level) or `.claude/settings.json` (project-level):

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "claude-cost hook-stop",
            "timeout": 10
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "claude-cost hook-session-end",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Once installed, you'll see cost info after each turn:

```
[claude-cost] Turn cost: $0.0342
```

And a session summary when the session ends:

```
━━━ Session Cost Summary ━━━
  Turns:         12
  Input tokens:  45,230
  Output tokens: 18,400
  Cache write:   5,000
  Cache read:    32,100
  Total cost:    $0.28
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Pricing

Based on current Claude API pricing (as of May 2025):

| Model | Input (per MTok) | Output (per MTok) |
|-------|-----------------|-------------------|
| Opus 4.7 | $5.00 | $25.00 |
| Sonnet 4.6 | $3.00 | $15.00 |
| Haiku 4.5 | $1.00 | $5.00 |

## Data storage

Session cost data is stored as JSONL files in `~/.claude-cost/sessions/`. Each session gets its own file.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Only for `--exact` | API key for exact token counting |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run lint

# Watch mode
npm run dev
```

## License

MIT
