#!/bin/bash
# SessionStart hook: keep graphify-out/ fresh without relying on Claude noticing.
# Silent, best-effort, never blocks session start, never errors visibly.

cwd="$(pwd)"

git_root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0

graph_dir="$git_root/graphify-out"
[ -d "$graph_dir" ] || exit 0

report="$graph_dir/GRAPH_REPORT.md"
[ -f "$report" ] || exit 0

built_commit=$(sed -n 's/.*Built from commit: `\([0-9a-f]*\)`.*/\1/p' "$report" | head -1)
[ -n "$built_commit" ] || exit 0

head_commit=$(git -C "$git_root" rev-parse HEAD 2>/dev/null) || exit 0

case "$head_commit" in
  "$built_commit"*) exit 0 ;;
esac

command -v graphify >/dev/null 2>&1 || exit 0

lock_file="$graph_dir/.refresh.lock"
if [ -f "$lock_file" ]; then
  pid=$(cat "$lock_file" 2>/dev/null)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    exit 0
  fi
fi

log_file="$graph_dir/.refresh.log"
(
  cd "$git_root" || exit 0
  echo $$ > "$lock_file"
  graphify update . </dev/null >"$log_file" 2>&1
  rm -f "$lock_file"
) &
disown 2>/dev/null

exit 0
