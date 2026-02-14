#!/usr/bin/env bash
set -euo pipefail

echo "End-of-session checklist:"
echo "1) Ensure tests for this feature passed."
echo "2) Update feature_list.json (passes=true only if verified)."
echo "3) Append a new entry to codex-progress.md."
echo "4) Stage and commit changes."
