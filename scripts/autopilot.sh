#!/bin/sh
# Autopilot: works through the GitHub issues on the project board
# (https://github.com/users/NatusPella/projects/5) that carry the label `autopilot`
# and sit in the column "Volgende", one headless
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
REPO="NatusPella/GDE-Groningen"
PROJECT=5
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

PID="$(gh project view "$PROJECT" --owner NatusPella --format json -q .id)"
SFIELD="$(gh project field-list "$PROJECT" --owner NatusPella --format json -q '.fields[] | select(.name=="Status") | .id')"
opt() { gh project field-list "$PROJECT" --owner NatusPella --format json -q ".fields[] | select(.name==\"Status\") | .options[] | select(.name==\"$1\") | .id"; }
OPT_BEZIG="$(opt Bezig)"; OPT_REVIEW="$(opt Review)"; OPT_VOLGENDE="$(opt Volgende)"
TODAY="$(date +%F)"
COUNT_FILE="$STATE/count-$TODAY"
done_today="$(cat "$COUNT_FILE" 2>/dev/null || echo 0)"

run_one() {
  # next issue: label autopilot, status Volgende (lowest number first)
  pick="$(gh project item-list "$PROJECT" --owner NatusPella --format json --limit 200 -q \
    '[.items[] | select(.status=="Volgende") | select(.labels // [] | index("autopilot")) | {id, n: .content.number, t: .title}] | sort_by(.n) | .[0] | select(.) | "\(.id)|\(.n)|\(.t)"' 2>/dev/null || true)"
  [ -n "$pick" ] || { echo "no autopilot issue in 'Volgende'"; return 1; }
  item="${pick%%|*}"; rest="${pick#*|}"; num="${rest%%|*}"; task="${rest#*|}"
  body="$(gh issue view "$num" --repo "$REPO" --json body -q .body 2>/dev/null || true)"
  task="$task (issue #$num): $body"
  slug="$(printf '%s' "issue-$num-$task" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9' '-' | cut -c1-40 | sed 's/-*$//')"
  branch="autopilot/$TODAY-$slug"
  wt="$ROOT/.claude/worktrees/autopilot-$slug"
  echo "== issue #$num -> $branch"
  setstatus() { gh project item-edit --id "$item" --project-id "$PID" --field-id "$SFIELD" --single-select-option-id "$1" >/dev/null 2>&1 || true; }
  setstatus "$OPT_BEZIG"
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
    setstatus "$OPT_REVIEW"
    gh issue comment "$num" --repo "$REPO" --body "Autopilot: branch \`$branch\` ($changed commit(s), node-tests ok). Review, verhaaltest, merge." >/dev/null 2>&1 || true
    echo "done: $branch ($changed commit(s), tests ok)"
  else
    setstatus "$OPT_VOLGENDE"
    gh issue comment "$num" --repo "$REPO" --body "Autopilot: niet geslaagd (tests ok=$ok, commits=$changed). Branch \`$branch\`, log $log. Heeft een blik nodig." >/dev/null 2>&1 || true
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
echo "review: git branch --list 'autopilot/*'  then  git merge --no-ff <branch>  (+ run the story test)"
