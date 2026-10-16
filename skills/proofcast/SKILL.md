---
name: proofcast
description: Use when the user says 'prove it' about code or command behavior, asks to record or capture terminal output, or says 'turn on the bodycam'. Records the actual commands and output as a replayable asciicast.
license: CC0-1.0
compatibility: Requires bash 4.2+ and asciinema 3.0+; agg is optional and adds a gif
metadata:
  author: killallgit <@archae0pteryx>
---

# Instructions

Treat "prove it" about code or command behavior as a request to record terminal
evidence with this skill, even when the user does not mention recording.
Also use it for requests for "proof", a "recording", "capture", or "video" of
terminal output. Record the commands that demonstrate the claim:

## Prerequisites

- asciinema (3.0 or newer)
- agg (optional; when present, each recording also gets a gif)

1. Confirm asciinema is installed. If not, ask the user to install it, or help
   install if the situation allows.
2. Recordings default to `.proofcast` in the current directory, created if
   missing. Only ask the user for a location when they want them somewhere
   else, then pass it with `--root`.
3. Choose the literal command that demonstrates the behavior: the real tool,
   typed the way a person types it at a prompt. The recording shows that
   command on its `$` line and captures its actual output.
   - For a multi-step flow, record each command as its own recording under the
     same `<slug>`.
   - When one command needs shell syntax such as a pipe, record
     `bash -xc '<pipeline>'` so Bash traces the commands it executes.
   - **A wrapper's name and printed claims are not evidence of its underlying
     commands.** Prefer running those commands directly. If a script is needed,
     inspect it first and record Bash scripts with `bash -x ./script.sh [args...]`
     (execution tracing, not `bash -v` source listing). This applies to existing
     project scripts as well as scripts written for the recording.
   - Keep tracing enabled and its stderr visible throughout the proof. Trace
     nested scripts too: `bash -x` does not trace a child interpreter. For other
     interpreters, use execution tracing or record the underlying commands one
     by one. A wrapper's `echo` output cannot replace execution traces.
   - Never stage output with `echo`, `printf`, or `cat` of text you prepared.
     When the real commands cannot run or cannot be made visible, tell the user
     the limitation instead of recording a substitute.
4. Confirm the command and its trace cannot print passwords, tokens, or API keys.
   Tracing exposes expanded arguments and assignments, even when normal output
   hides them. Use safe inputs or choose another demonstration; keep tracing on.
   Proofcast captures output verbatim and does not redact.
5. Run this skill's bundled `scripts/proofcast.sh --name <slug> -- <command> [args...]`
   using the absolute path to the directory containing this `SKILL.md`. In Claude
   Code, that is `"${CLAUDE_SKILL_DIR}/scripts/proofcast.sh"`. Choose a short
   lowercase-hyphenated `<slug>` for what is being proven.
6. Proofcast prints every file it wrote, index last. After the last recording,
   report the recordings directory (the index's parent, `.proofcast` unless
   `--root` changed it) as an absolute path and the index as a clickable link,
   then say exactly `I stopped the recording.` Report the exit status of any
   command that failed.
7. Unless the user already asked to open the page, ask explicitly:
   **"Would you like me to open the recording webpage in your browser?"**
   After agreement (or if already requested), open the generated `index.html`
   using its absolute path with an available browser tool or the platform's
   opener (`open` on macOS, `xdg-open` on Linux). If opening is unavailable,
   explain that and leave the clickable link so the user can open it themselves.

## Bundle layout

Each run adds a timestamped set under a per-slug directory and rebuilds the
index covering every recording in the root:

```
<root>/index.html          # <root> is .proofcast unless --root says otherwise
<root>/<slug>/<timestamp>.cast
<root>/<slug>/<timestamp>.stdout.log
<root>/<slug>/<timestamp>.gif          # only when agg is installed
```

Reuse the same `<slug>` to collect repeat runs and the steps of one flow
together.
`index.html` opens straight from disk, lists every recording newest first, and
replays the selected one with real text you can pause, scrub, and copy from.
Rebuild it without recording by running
the bundled `scripts/proofcast-index.sh <root>` using the same skill directory.
The page comes from
`resources/index.html`, a plain HTML file that opens on its own with an empty
list; the index script swaps its `<script id="data">` element for the real
recordings and inlines the player from `resources/vendor/`. Edit that file to
change how the index looks. The generated page carries the player with it, so
it replays with no network.

A `.proofcast` directory inside a repository holds verbatim terminal output.
Add it to `.gitignore` unless the recordings are meant to be committed.

Share the index for review. Share the gif where a player cannot go, such as a
pull request comment or a chat message.
