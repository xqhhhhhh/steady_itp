#!/usr/bin/env bash
set -euo pipefail

mkdir -p scripts prompts

if [ ! -f feature_list.json ]; then
  cat > feature_list.json <<'EOF'
[
  {
    "name": "Example feature",
    "description": "Replace this with a real, testable feature",
    "passes": false
  }
]
EOF
fi

if [ ! -f codex-progress.md ]; then
  cat > codex-progress.md <<'EOF'
# Codex Progress Log

## Session Template

- Date:
- Feature:
- Goal:
- Changes:
- Verification:
- Result:
- Next step:
EOF
fi

if [ ! -f scripts/session_start.sh ]; then
  cat > scripts/session_start.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Repo root: $(pwd)"
echo "[2/5] Unfinished features:"
if command -v jq >/dev/null 2>&1; then
  jq -r '.[] | select(.passes==false) | "- \(.name): \(.description)"' feature_list.json
else
  echo "jq not found. Open feature_list.json manually."
fi
echo "[3/5] Run bootstrap checks (if available)"
[ -f package.json ] && npm -s run -q lint || true
[ -f package.json ] && npm -s test || true
echo "[4/5] Read codex-progress.md and pick one unfinished feature"
echo "[5/5] Start implementation"
EOF
fi

if [ ! -f scripts/session_finish.sh ]; then
  cat > scripts/session_finish.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "End-of-session checklist:"
echo "1) Ensure tests for this feature passed."
echo "2) Update feature_list.json (passes=true only if verified)."
echo "3) Append a new entry to codex-progress.md."
echo "4) Stage and commit changes."
EOF
fi

if [ ! -f prompts/initializer_prompt.md ]; then
  cat > prompts/initializer_prompt.md <<'EOF'
You are starting a long-running coding project in Codex.

Process:
1) Run `bash init.sh` if needed.
2) Read `feature_list.json` and `codex-progress.md`.
3) Select one feature where `passes` is false.
4) Implement only that feature.
5) Verify with tests and/or e2e checks.
6) If verification passes, set `passes` to true for that feature.
7) Append a session note in `codex-progress.md`.
8) Commit with a clear message.

Rules:
- Do not work on multiple features in one session.
- Do not mark a feature complete without verification evidence.
- Keep changes minimal and focused.
EOF
fi

if [ ! -f prompts/coding_prompt.md ]; then
  cat > prompts/coding_prompt.md <<'EOF'
Continue this project using the established harness.

Before coding:
1) Review `feature_list.json` and `codex-progress.md`.
2) Pick the highest-priority unfinished feature.

Execution:
1) Implement only that single feature.
2) Run relevant tests (`npm test`, `npm run test:e2e`, or project equivalent).
3) If all checks pass, flip `passes` to true for this feature.
4) Append what changed and what was verified to `codex-progress.md`.
5) Commit.

Output requirements:
- Report changed files.
- Report exact verification commands and outcomes.
- State the next unfinished feature.
EOF
fi

chmod +x init.sh scripts/session_start.sh scripts/session_finish.sh

echo "Codex harness initialized."
