# Proofcast

Proofcast is a self-contained Claude Code skill that records an explicitly
requested terminal command or focused validation flow as an H.264 MP4.

## Install

```bash
npx skills@latest add killallgit/killall-proof \
  --skill proofcast \
  --agent claude-code \
  --global \
  --yes
```

Proofcast requires Bash and the `asciinema`, `agg`, and `ffmpeg` binaries. Its
bundled script checks all three before recording and reports any that are
missing.

## Use

Ask Claude Code to record a command or validation flow. The skill invokes its
bundled script directly; it does not install a global executable or change
`PATH`.

Proofcast prints the recorded command output followed by the absolute MP4 path.
It renders failed commands too and returns the recorded command's exit status.

Proofcast captures output verbatim and does not redact secrets.
