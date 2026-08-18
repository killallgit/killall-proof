#!/usr/bin/env bash
set -euo pipefail

readonly DEFAULT_ROOT=.proofcast
readonly WINDOW=120x47
readonly FONT_SIZE=16
readonly FPS=24
readonly IDLE_LIMIT=2

die() {
  printf 'proofcast: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat >&2 <<'EOF'
usage: proofcast [--root <dir>] --name <slug> -- <command> [args...]

  --root  existing directory that holds recordings.
          Defaults to .proofcast in the current directory, created if missing.
  --name  slug for this recording; lowercase, digits, hyphens

Writes <root>/<slug>/<timestamp>.cast and <timestamp>.stdout.log,
then rebuilds <root>/index.html.
EOF
  exit 2
}

(( BASH_VERSINFO[0] >= 4 )) || die "requires bash 4 or newer, found ${BASH_VERSION}"

root=
name=
while (( $# > 0 )); do
  case $1 in
    --root) [[ -n ${2-} ]] || usage; root=$2; shift 2 ;;
    --name) [[ -n ${2-} ]] || usage; name=$2; shift 2 ;;
    --) shift; break ;;
    *) usage ;;
  esac
done

(( $# > 0 )) || usage
[[ -n $name ]] || usage
[[ $name =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || die "name must be lowercase alphanumeric with hyphens: $name"

command -v asciinema >/dev/null 2>&1 || die "missing required binary: asciinema"

# An explicit --root must already exist, so a typo lands nowhere. The default
# root is ours to create.
if [[ -z $root ]]; then
  root="$PWD/$DEFAULT_ROOT"
  mkdir -p -- "$root"
fi
[[ -d $root ]] || die "root directory does not exist: $root"
root=$(cd -- "$root" && pwd -P)

bundle="$root/$name"
mkdir -p -- "$bundle"

timestamp=$(date +%Y%m%d-%H%M%S)
cast="$bundle/$timestamp.cast"
log="$bundle/$timestamp.stdout.log"
[[ ! -e $cast && ! -e $log ]] || die "recording already exists for $timestamp"

work=$(mktemp -d "${TMPDIR:-/tmp}/proofcast.XXXXXX")
runner="$work/run.sh"
raw="$work/recording.cast"
status_file="$work/status"
complete=0

cleanup() {
  if (( complete )); then
    rm -rf -- "$work"
  else
    printf 'proofcast: kept recording evidence at %s\n' "$work" >&2
  fi
}
trap cleanup EXIT

printf -v command_literal '%q ' "$@"
{
  echo '#!/usr/bin/env bash'
  printf 'printf "$ %%s\\n" %q\n' "$*"
  printf '%s\n' "$command_literal"
  printf 'printf %%s "$?" >%q\n' "$status_file"
} >"$runner"
chmod 700 "$runner"

# Fixed geometry: headless recording otherwise falls back to 80x24 and long
# lines wrap out of view during playback. 120 columns at FONT_SIZE renders near
# 1175x1075, so each character keeps enough of the frame to stay readable once a
# viewer scales the gif down to fit.
asciinema record --quiet --headless --window-size "$WINDOW" --overwrite \
  --command "$runner" "$raw" || die "asciinema record failed"

# The runner records the command's own status, so an asciinema failure above is
# never misreported as the recorded command failing.
[[ -f $status_file ]] || die "recorded command never ran"
command_status=$(<"$status_file")

# Stored as asciicast v2: asciinema writes v3, but asciinema-player reads v2
# everywhere, and the recording has to play from a file:// index with no server.
asciinema convert --quiet --overwrite -f asciicast-v2 "$raw" "$cast"
asciinema convert --quiet --overwrite -f txt "$raw" "$log"
complete=1

# Optional: a gif needs no player and no network, for pasting into a PR or chat.
# The cast keeps real time, so the gif is free to skip the waiting: idle gaps
# collapse to IDLE_LIMIT seconds. last-frame-duration 0 drops the 3s frozen tail
# agg pads on by default. Neither changes the file size, only the watching.
if command -v agg >/dev/null 2>&1; then
  gif="$bundle/$timestamp.gif"
  agg --quiet --font-size "$FONT_SIZE" --fps-cap "$FPS" \
    --idle-time-limit "$IDLE_LIMIT" --last-frame-duration 0 "$cast" "$gif"
fi

"${BASH_SOURCE[0]%/*}/proofcast-index.sh" "$root" >/dev/null

printf '%s\n%s\n' "$cast" "$log"
[[ -n ${gif-} ]] && printf '%s\n' "$gif"
printf '%s\n' "$root/index.html"
exit "$command_status"
