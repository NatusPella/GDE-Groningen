#!/bin/sh
# Autopilot: works through the unchecked tasks in docs/AUTOPILOT.md, one headless
# Claude run per task, in its own git worktree and branch (autopilot/<slug>).
# It tests (node tests only), commits on the branch and ticks the task. It never
# merges, pushes, releases, runs Electron or touches main: review and merge later.
#
#   sh scripts/autopilot.sh              # up to MAX_TASKS tasks (default 2)
#   MAX_TASKS=1 sh scripts/autopilot.sh
#   MODEL=sonnet TURNS=60 BUDGET_USD=3 sh scripts/autopilot.sh
#   touch .claude/autopilot.stop         # stops before the next task
#
# Token use: one task = one bounded run (--max-turns, small model by default).
# A daily cap (DAILY_CAP, default 4) keeps a week's budget for interactive work.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
QUEUE="docs/AUTOPILOT.md"
STATE=".claude/autopilot"
MAX_TASKS="${MAX_TASKS:-2}"
DAILY_CAP="${DAILY_CAP:-4}"
MODEL="${MODEL:-sonnet}"
TURNS="${TURNS:-60}"
BUDGET_USD="${BUDGET_USD:-}"
mkdir -p "$STATE"
LOCK="$STATE/lock"
if [ -e "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then echo "autopilot already running"; exit 0; fi
echo $$ > "$LOCK"; trap 'rm -f "$LOCK"' EXIT

TODAY="$(date +%F)"
COUNT_FILE="$STATE/count-$TODAY"
done_today="$(cat "$COUNT_FILE" 2>/dev/null || echo 0)"

run_one() {
  line="$(grep -n -m1 '^- \[ \] ' "$QUEUE" || true)"
  [ -n "$line" ] || { echo "queue empty"; return 1; }
  num="${line%%:*}"; task="${line#*:- [ ] }"
  slug="$(printf '%s' "$task" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9' '-' | cut -c1-40 | sed 's/-*$//')"
  branch="autopilot/$TODAY-$slug"
  wt="$ROOT/.claude/worktrees/autopilot-$slug"
  echo "== task: $task  ->  $branch"
  git worktree add -q -b "$branch" "$wt" main
  ln -s "$ROOT/desktop/node_modules" "$wt/desktop/node_modules" 2>/dev/null || true
  ln -s "$ROOT/desktop/vendor-cache" "$wt/desktop/vendor-cache" 2>/dev/null || true
  prompt="You are working autonomously on GDE Groningen (read ARCHITECTURE.md first, and docs/BACKLOG.md and docs/FEEDBACK-MATHIJS.md for context). TASK: $task
Rules: keep the change small and surgical; Dutch-only player text; no real brands/people; always summer; never read or print .env; no network access except none; never touch port 9000 or the user's installed app; do NOT run Electron or the story test; do NOT merge, push, tag or release; do not edit CHANGELOG.md except adding Dutch player-facing lines under [Unreleased] when the change is player-visible. Run the relevant node tests with plain node (no 'timeout' on macOS) and all scripts/*_test.mjs at the end; node --check changed JS; node scripts/voice_coverage.mjs --quiet must pass. Commit on the current branch (end the message with 'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>'; author stays NatusPella). If the task turns out too large or unsafe, stop, commit nothing broken, and explain in your final message. Final message: 5 lines max, what changed and test results."
  budget=""; [ -n "$BUDGET_USD" ] && budget="--max-budget-usd $BUDGET_USD"
  log="$STATE/$TODAY-$slug.log"
  ( cd "$wt" && nice claude -p "$prompt" --model "$MODEL" --max-turns "$TURNS" $budget \
      --permission-mode acceptEdits --no-session-persistence \
      --allowedTools "Read Edit Write Glob Grep Bash(node:*) Bash(python3:*) Bash(git status:*) Bash(git diff:*) Bash(git add:*) Bash(git commit:*) Bash(git log:*) Bash(ls:*) Bash(cat:*) Bash(sed:*) Bash(grep:*) Bash(mkdir:*) Bash(zsh:*) Bash(sh:*)" \
      > "$log" 2>&1 ) || echo "claude exited non-zero (see $log)"
  # verify independently: node tests on the branch
  ok=1
  ( cd "$wt" && for t in scripts/*_test.mjs; do node "$t" >/dev/null 2>&1 || { echo "FAIL $t"; exit 1; }; done ) >> "$log" 2>&1 || ok=0
  changed="$(cd "$wt" && git log --oneline main..HEAD | wc -l | tr -d ' ')"
  if [ "$ok" = 1 ] && [ "$changed" -gt 0 ]; then
    sed -i '' "${num}s/^- \[ \] /- [x] (branch $branch) /" "$QUEUE"
    echo "done: $branch ($changed commit(s), tests ok)"
  else
    sed -i '' "${num}s/^- \[ \] /- [!] (needs a look: $branch, see $log) /" "$QUEUE"
    echo "needs a look: $branch (tests ok=$ok commits=$changed)"
  fi
  rm -f "$wt/desktop/node_modules" "$wt/desktop/vendor-cache"
  git worktree remove --force "$wt" 2>/dev/null || true   # the branch stays
  n=$((done_today + 1)); done_today=$n; echo $n > "$COUNT_FILE"
}

i=0
while [ $i -lt "$MAX_TASKS" ]; do
  [ -e .claude/autopilot.stop ] && { echo "stop file found"; break; }
  [ "$done_today" -ge "$DAILY_CAP" ] && { echo "daily cap ($DAILY_CAP) reached"; break; }
  pgrep -x Electron >/dev/null && { echo "Electron is running (you or an agent): not starting"; break; }
  run_one || break
  i=$((i + 1))
done
git add "$QUEUE" 2>/dev/null; git diff --cached --quiet || git commit -q -m "Autopilot: queue status

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
echo "review: git branch --list 'autopilot/*'  then  git merge --no-ff <branch>  (+ run the story test)"
