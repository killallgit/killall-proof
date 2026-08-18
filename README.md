# Proofcast

Proofcast is a self-contained Claude Code skill that records an explicitly
requested terminal command or focused validation flow as a replayable
asciicast, and collects every recording into a browsable HTML index.

## Install

```bash
npx skills@latest add killallgit/killall-proof \
  --skill proofcast \
  --agent claude-code \
  --global \
  --yes
```

Proofcast requires Bash 4+ and the `asciinema` binary, and checks for it before
recording. Install `agg` as well to also get a gif of each recording.

## Use

Ask Claude Code to record a command or validation flow. The skill invokes its
bundled script directly; it does not install a global executable or change
`PATH`.

Recordings land in `.proofcast` beside wherever the command ran, unless
`--root` says otherwise:

```
.proofcast/index.html
.proofcast/<slug>/<timestamp>.cast
.proofcast/<slug>/<timestamp>.stdout.log
.proofcast/<slug>/<timestamp>.gif          # only when agg is installed
```

`index.html` opens straight from disk and lists every recording newest first,
replaying the selected one as real text you can pause, scrub, and copy from.
The cast is the artifact of record: it keeps true timing and stays small, since
it stores text rather than pixels. The gif is for pasting where a player cannot
go, such as a pull request comment.

Proofcast records failed commands too, and exits with the recorded command's
own status.

Add `.proofcast/` to `.gitignore` unless the recordings are meant to be
committed. Proofcast captures output verbatim and does not redact secrets.
