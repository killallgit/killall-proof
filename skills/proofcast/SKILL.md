---
name: proofcast
description: Records terminal output as a replayable asciicast for review. Use when the user asks to record, capture, 'turn on the bodycam', or create proof of terminal output.
license: CC0-1.0
compatibility: Requires bash 4.2+ and asciinema 3.0+; agg is optional and adds a gif
metadata:
  author: killallgit <@archae0pteryx>
---

# Instructions

When asked to provide "proof", a "recording", "capture", "video" (or related
terminology), of terminal (shell) output, follow these steps:

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
   command on its `$` line, and every line of output must come from it.
   - For a multi-step flow, record each command as its own recording under the
     same `<slug>`.
   - When one command needs shell syntax such as a pipe, record
     `bash -c '<pipeline>'` so the whole pipeline shows on the `$` line.
   - A script the project already ships is a literal command. A script, alias,
     or function written for the recording is a wrapper: it hides what ran and
     can print anything, so the recording proves nothing.
   - Never stage output with `echo`, `printf`, or `cat` of text you prepared.
     When the literal command cannot run, tell the user instead of recording a
     substitute.
4. Confirm the command cannot print passwords, tokens, or API keys. Proofcast
   captures output verbatim and does not redact.
5. Run this skill's bundled `scripts/proofcast.sh --name <slug> -- <command> [args...]`
   using the absolute path to the directory containing this `SKILL.md`. In Claude
   Code, that is `"${CLAUDE_SKILL_DIR}/scripts/proofcast.sh"`. Choose a short
   lowercase-hyphenated `<slug>` for what is being proven.
6. Proofcast prints every file it wrote, index last. After the last recording,
   report the recordings directory (the index's parent, `.proofcast` unless
   `--root` changed it) as an absolute path and the index as a clickable link,
   then say exactly `I stopped the recording.` Report the exit status of any
   command that failed. Offer to open the index in the user's browser, and open
   it only after the user agrees.

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
