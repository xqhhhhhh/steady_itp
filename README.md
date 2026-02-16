# Codex Long-Running Agent Harness

This repository contains a Codex-adapted implementation of the workflow from:
https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

The original article uses Claude-specific terms and tooling. This version keeps
the same engineering pattern, but maps it to Codex-compatible practices.

## What was adapted for Codex

- `Initializer agent` -> an initialization prompt + `init.sh` in this repo.
- `Coding agent` -> a repeatable coding prompt in `prompts/coding_prompt.md`.
- `claude-progress.txt` -> `codex-progress.md`.
- `Puppeteer MCP` -> local Playwright tests (`npm run test:e2e`) or equivalent.

## Files

- `init.sh`: Idempotent environment setup script.
- `feature_list.json`: Structured feature checklist (`passes: false/true`).
- `codex-progress.md`: Session-by-session handoff log.
- `scripts/session_start.sh`: Pre-work checklist script.
- `scripts/session_finish.sh`: End-of-session reminder script.
- `prompts/initializer_prompt.md`: First-session prompt template for Codex.
- `prompts/coding_prompt.md`: Every-following-session prompt template for Codex.

## Quick start

1. Run:

```bash
bash init.sh
```

2. Start a coding session:

```bash
bash scripts/session_start.sh
```

3. Pick exactly one feature in `feature_list.json` with `passes: false`.
4. Implement + verify with tests (prefer e2e when UI is involved).
5. End the session:

```bash
bash scripts/session_finish.sh
```

6. Commit:

```bash
git add -A
git commit -m "feat: implement <single feature name>"
```

## Operating rules

- Work on one feature per session.
- Only set `passes` from `false` to `true` after verification.
- Do not delete feature items from `feature_list.json`.
- Keep the repo in a clean, runnable state at handoff.




## OCR backend (uv)

```bash
cd /Users/xuqihan/Desktop/code_study/抢票
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uv run python captcha_api.py
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

VPN auto-switch config (backend):

- Preferred: edit `/Users/xuqihan/Desktop/code_study/抢票/vpn_switch.yaml`
- Optional override file path:

```bash
export VPN_SWITCH_CONFIG="/absolute/path/to/vpn_switch.yaml"
```

- Fallback: if config file is missing/invalid, backend uses `VPN_SWITCH_COMMANDS`.

