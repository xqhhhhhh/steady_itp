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
