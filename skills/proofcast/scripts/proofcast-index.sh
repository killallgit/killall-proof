#!/usr/bin/env bash
set -euo pipefail

readonly TEMPLATE="${BASH_SOURCE[0]%/*}/../resources/index.html"

die() {
  printf 'proofcast-index: %s\n' "$*" >&2
  exit 1
}

root=${1-}
[[ -n $root ]] || die "usage: proofcast-index <root-dir>"
[[ -d $root ]] || die "root directory does not exist: $root"
[[ -f $TEMPLATE ]] || die "missing template: $TEMPLATE"
root=$(cd -- "$root" && pwd -P)

casts=()
while IFS= read -r cast; do
  casts+=("$cast")
done < <(find "$root" -mindepth 2 -maxdepth 2 -name '*.cast' | sort -r)

(( ${#casts[@]} > 0 )) || die "no recordings found under $root"

encode() {
  base64 <"${1:-/dev/stdin}" | tr -d '\n'
}

# Text the recording controls travels as base64, so no terminal output can
# break out of the JSON or the surrounding page.
emit_data() {
  printf '{"root":"%s","recordings":[' "$(printf '%s' "${root##*/}" | encode)"

  local separator=
  local cast slug stamp command_line
  for cast in "${casts[@]}"; do
    slug=${cast%/*}; slug=${slug##*/}
    stamp=${cast##*/}; stamp=${stamp%.cast}

    command_line=
    [[ -f "$root/$slug/$stamp.stdout.log" ]] &&
      IFS= read -r command_line <"$root/$slug/$stamp.stdout.log" || true
    command_line=${command_line#'$ '}

    printf '%s\n{"slug":"%s","stamp":"%s","command":"%s","cast":"%s","gif":%s}' \
      "$separator" "$slug" "$stamp" \
      "$(printf '%s' "$command_line" | encode)" \
      "$(encode "$cast")" \
      "$([[ -f "$root/$slug/$stamp.gif" ]] && echo true || echo false)"
    separator=,
  done

  printf '\n]}'
}

index="$root/index.html"
while IFS= read -r line; do
  if [[ $line == *'id="data"'* ]]; then
    printf '<script id="data" type="application/json">%s</script>\n' "$(emit_data)"
  else
    printf '%s\n' "$line"
  fi
done <"$TEMPLATE" >"$index"

printf '%s\n' "$index"
