# claude-cost Architecture

## System Overview

```
+------------------------------------------------------------------+
|                        claude-cost CLI                            |
|                         (cli.ts)                                 |
|                                                                  |
|  Parses argv, routes to command handlers, reads text/stdin/file  |
+-------+----------+-----------+-----------+-----------+-----------+
        |          |           |           |           |
        v          v           v           v           v
   "estimate"   "report"   "install"  "uninstall"  "hook-stop"
        |          |           |           |           |
        v          v           v           v           v
   +--------+  +--------+  +----------+  +----------+  +--------+
   | api.ts |  |report.ts|  |installer |  |installer |  | hooks/ |
   |        |  |         |  |  .ts     |  |  .ts     |  | stop.ts|
   +--------+  +--------+  +----------+  +----------+  +--------+
```

## Data Flow: Estimate Command

```
User runs:  claude-cost estimate "Hello world" -m opus

    +-------------------+
    |  CLI (cli.ts)     |
    |                   |
    |  1. parseArgs()   |
    |  2. getText()     |
    |  3. resolveModel()|
    +--------+----------+
             |
             |  text + model + apiKey
             v
    +-------------------+       HTTPS POST
    |  api.ts           | --------------------> Anthropic API
    |                   |                       /v1/messages/count_tokens
    |  countTokensViaApi| <--------------------
    |                   |       { input_tokens: 42 }
    +--------+----------+
             |
             |  exact input token count
             v
    +-------------------+
    |  estimator.ts     |
    |                   |
    |  estimateCost()   |  tokens * (price / 1M) = dollar cost
    |                   |
    +--------+----------+
             |
             |  EstimateResult { inputTokens, outputTokens,
             |                   inputCost, outputCost, totalCost }
             v
    +-------------------+
    |  format.ts        |
    |                   |
    |  drawBox()        |  Renders colored, boxed output
    |  formatCost()     |
    +--------+----------+
             |
             v
         stdout
```

## Data Flow: Compare Command

```
User runs:  claude-cost estimate --compare "Hello world"

    +-------------------+
    |  CLI (cli.ts)     |
    |                   |
    |  printCompare()   |
    +--------+----------+
             |
             |  text + DEFAULT_MODEL + apiKey
             v
    +-------------------+       HTTPS POST
    |  api.ts           | --------------------> Anthropic API
    |                   |                       /v1/messages/count_tokens
    |  countTokensViaApi| <--------------------
    +--------+----------+       { input_tokens }
             |
             |  token count (same across all models)
             v
    +-------------------+
    |  estimator.ts     |  Loop over MODELS map:
    |                   |
    |  for each model:  |    Opus 4.5, 4.6, 4.7
    |    estimateCost() |    Sonnet 4.5, 4.6
    |                   |    Haiku 4.5
    +--------+----------+
             |
             |  cost per model
             v
    +-------------------+
    |  format.ts        |
    |                   |
    |  drawTable()      |  Side-by-side model comparison table
    +--------+----------+
             |
             v
         stdout
```

## Data Flow: Silent Hook Logging

```
Claude Code fires "Stop" hook after each assistant turn

    +-------------------+       JSON via stdin
    |  Claude Code      | -------------------------+
    |                   |  { session_id,           |
    |  (Stop event)     |    transcript_path }     |
    +-------------------+                          |
                                                   v
                                          +-------------------+
                                          |  CLI (cli.ts)     |
                                          |                   |
                                          |  "hook-stop"      |
                                          |  readHookInput()  |
                                          +--------+----------+
                                                   |
                                                   v
    +---------------------+              +-------------------+
    |  Transcript file    |              |  hooks/stop.ts    |
    |  (JSONL)            | <----------- |                   |
    |                     |   reads      |  extractLastUsage |
    |  {..., type:        |   last       |  ()               |
    |   "assistant",      |   assistant  +--------+----------+
    |   message: {        |   entry               |
    |     model: "...",   |                       |  { usage, model }
    |     usage: {        |                       v
    |       input_tokens, |              +-------------------+
    |       output_tokens,|              |  models.ts        |
    |       cache_*       |              |                   |
    |     }               |              |  inferModelFromId |
    |   }}                |              |  ()               |
    +---------------------+              +--------+----------+
                                                  |
                                                  |  ModelPricing
                                                  v
                                         +-------------------+
                                         |  estimator.ts     |
                                         |                   |
                                         |  estimateCostWith |
                                         |  Cache()          |
                                         +--------+----------+
                                                  |
                                                  |  cost breakdown
                                                  v
                                         +-------------------+
                                         |  storage.ts       |
                                         |                   |
                                         |  appendTurn()     |
                                         +--------+----------+
                                                  |
                                                  v
                                         ~/.claude-cost/sessions/
                                           <session-id>.jsonl
```

## Data Flow: Report Command

```
User runs:  claude-cost report [--today] [--session <id>]

    +-------------------+
    |  CLI (cli.ts)     |
    |                   |
    |  "report"         |
    +--------+----------+
             |
             v
    +-------------------+
    |  report.ts        |
    |                   |
    |  reportAll()      |   or reportToday() or reportSession()
    +--------+----------+
             |
             v
    +-------------------+       reads
    |  storage.ts       | -----------> ~/.claude-cost/sessions/*.jsonl
    |                   |
    |  getAllSummaries() |  Parses JSONL, aggregates per session:
    |  getSessionTurns()|    turns, tokens, cost
    +--------+----------+
             |
             |  SessionSummary[]
             v
    +-------------------+
    |  format.ts        |
    |                   |
    |  drawBox()        |  Overview box with totals
    |  drawTable()      |  Session-by-session table
    |  sparkline()      |  Cost trend visualization
    +--------+----------+
             |
             v
         stdout
```

## Data Flow: Install / Uninstall

```
User runs:  claude-cost install

    +-------------------+
    |  CLI (cli.ts)     |
    |                   |
    |  "install"        |
    +--------+----------+
             |
             v
    +-------------------+         reads/writes
    |  installer.ts     | ---------------------> ~/.claude/settings.json
    |                   |
    |  install()        |  Adds Stop hook entry:
    |                   |    { "hooks": {
    |                   |        "Stop": [{
    |                   |          "matcher": "",
    |                   |          "hooks": [{
    |                   |            "type": "command",
    |                   |            "command": "claude-cost hook-stop",
    |                   |            "timeout": 10
    |                   |          }]
    |                   |        }]
    |                   |      }}
    +-------------------+
    
User runs:  claude-cost uninstall

    +-------------------+         reads/writes
    |  installer.ts     | ---------------------> ~/.claude/settings.json
    |                   |
    |  uninstall()      |  Removes entries where command
    |                   |  contains "claude-cost"
    +-------------------+
```

## Module Dependency Graph

```
                         cli.ts
                        /  |   \      \         \
                       /   |    \      \         \
                      v    v     v      v         v
               api.ts  report  installer  hooks/   format.ts
                 |      .ts      .ts     stop.ts      ^
                 |       |                 |          /
                 v       v                 v         /
              estimator.ts            storage.ts   /
                 |                        |       /
                 v                        |      /
              models.ts                   |     /
                                          v    /
                                   ~/.claude-cost/
                                    sessions/*.jsonl
```

## File Responsibilities

```
src/
+-- cli.ts              Entry point. Arg parsing, command routing,
|                       text input (stdin/file/string), output display.
|
+-- api.ts              Anthropic API integration. countTokensViaApi()
|                       calls POST /v1/messages/count_tokens.
|
+-- estimator.ts        Pure math. estimateCost() and estimateCostWithCache()
|                       convert token counts + model pricing into dollar costs.
|
+-- models.ts           Model registry. Pricing data for Opus/Sonnet/Haiku
|                       families. resolveModel() and inferModelFromId().
|
+-- format.ts           Terminal output. ANSI colors, box drawing,
|                       table rendering, sparkline charts.
|
+-- storage.ts          JSONL persistence. Append turn records, read back
|                       sessions, compute per-session summaries.
|
+-- report.ts           Report display. Reads storage, formats all-time /
|                       today / single-session views with tables and trends.
|
+-- installer.ts        Hook lifecycle. Reads/writes ~/.claude/settings.json
|                       to register or remove the Stop hook.
|
+-- hooks/
    +-- stop.ts         Stop hook handler. Reads Claude Code transcript,
                        extracts last assistant turn's usage, calculates
                        cost, appends to session storage. Silent (no output).

tests/
+-- models.test.ts      Model resolution, aliases, family fallback
+-- estimator.test.ts   Cost calculation math
+-- storage.test.ts     JSONL append/read round-trip
```

## Storage Format

```
~/.claude-cost/
  sessions/
    <session-id>.jsonl        One file per Claude Code session

Each line is a JSON object (one per assistant turn):

    {
      "timestamp":        "2025-05-12T10:00:00.000Z",
      "sessionId":        "abc-123-def",
      "inputTokens":      12500,
      "outputTokens":     3200,
      "cacheWriteTokens": 1000,
      "cacheReadTokens":  8000,
      "model":            "claude-sonnet-4-6",
      "inputCost":        0.0375,
      "outputCost":       0.048,
      "cacheWriteCost":   0.00375,
      "cacheReadCost":    0.0024,
      "totalCost":        0.09165
    }
```

## Pricing Model

```
                        Input       Output      Cache Write     Cache Read
                       (per MTok)  (per MTok)   (multiplier)   (multiplier)
    +------------------------------------------------------------------+
    |  Opus  4.5/4.6/4.7  $5.00      $25.00       1.25x           0.1x  |
    |  Sonnet 4.5/4.6     $3.00      $15.00       1.25x           0.1x  |
    |  Haiku  4.5          $1.00       $5.00       1.25x           0.1x  |
    +------------------------------------------------------------------+

    Cost formulas:

    input_cost        = input_tokens       / 1,000,000 * inputPerMTok
    output_cost       = output_tokens      / 1,000,000 * outputPerMTok
    cache_write_cost  = cache_write_tokens / 1,000,000 * inputPerMTok * 1.25
    cache_read_cost   = cache_read_tokens  / 1,000,000 * inputPerMTok * 0.1
    total_cost        = input + output + cache_write + cache_read
```

## Known Limitation

```
    +-------------------+                +-------------------+
    |  Claude Code UI   |    CANNOT      |  Hook stderr      |
    |                   | <--- X ------- |  output           |
    |  (no injection    |    INJECT      |                   |
    |   point for       |                |  process.stderr   |
    |   hook output)    |                |  .write(...)      |
    +-------------------+                +-------------------+

    Hooks can silently LOG data but cannot DISPLAY in the Claude Code UI.
    Cost visibility is pull-based only: user runs "claude-cost report".
```
