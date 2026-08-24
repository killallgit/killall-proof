#!/usr/bin/env bash
set -euo pipefail

readonly TEMPLATE="${BASH_SOURCE[0]%/*}/../resources/index.html"
readonly VENDOR="${BASH_SOURCE[0]%/*}/../resources/vendor"
readonly PLAYER_CSS="$VENDOR/asciinema-player.css"
readonly PLAYER_JS="$VENDOR/asciinema-player.min.js"

die() {
  printf 'proofcast-index: %s\n' "$*" >&2
  exit 1
}

root=${1-}
[[ -n $root ]] || die "usage: proofcast-index <root-dir>"
[[ -d $root ]] || die "root directory does not exist: $root"
[[ -f $TEMPLATE ]] || die "missing template: $TEMPLATE"
[[ -f $PLAYER_CSS ]] || die "missing player stylesheet: $PLAYER_CSS"
[[ -f $PLAYER_JS ]] || die "missing player script: $PLAYER_JS"
root=$(cd -- "$root" && pwd -P)

casts=()
while IFS= read -r cast; do
  casts+=("$cast")
# Sort on the timestamped filename, not the whole path: sorting paths orders by
# slug first, which buries a recording made today under an older slug.
done < <(find "$root" -mindepth 2 -maxdepth 2 -name '*.cast' \
  | awk -F/ '{ print $NF "\t" $0 }' | sort -r | cut -f2-)

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
      "$separator" \
      "$(printf '%s' "$slug" | encode)" \
      "$(printf '%s' "$stamp" | encode)" \
      "$(printf '%s' "$command_line" | encode)" \
      "$(encode "$cast")" \
      "$([[ -f "$root/$slug/$stamp.gif" ]] && echo true || echo false)"
    separator=,
  done

  printf '\n]}'
}

# Build beside the index and move it into place, so a failure part way through
# leaves the previous index intact rather than a truncated one.
index="$root/index.html"
draft=$(mktemp "$root/.index.XXXXXX")
trap 'rm -f -- "$draft"' EXIT

# The template points at resources/vendor so it still opens on its own. The
# generated page inlines the player instead: a recordings root is copied and
# opened anywhere, and replay must not depend on a network.
while IFS= read -r line; do
  case $line in
    *'id="data"'*)
      printf '<script id="data" type="application/json">%s</script>\n' "$(emit_data)" ;;
    *'vendor/asciinema-player.css'*)
      printf '<style>\n'; cat -- "$PLAYER_CSS"; printf '</style>\n' ;;
    *'vendor/asciinema-player.min.js'*)
      printf '<script>\n'; cat -- "$PLAYER_JS"; printf '</script>\n' ;;
    *)
      printf '%s\n' "$line" ;;
  esac
done <"$TEMPLATE" >"$draft"

mv -- "$draft" "$index"

printf '%s\n' "$index"
