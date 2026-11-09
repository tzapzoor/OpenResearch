# PR 935 shell-command approval evidence

Synthetic API fixtures rendered by the real Vite dashboard in Chromium on Linux/WSL2, Node 22.23.4.

Before: reviewed commit b3163de; `!git status` finishes and the pending plan controls disappear.
After: e9a0054; the controls remain, and Accept plan sends the current prompt ID with approve=true and clears the strip.

The capture script checks actual browser requests and visible shell output, and captures light, dark and 720px layouts. Fixtures contain no real project or chat data. No live agents, native desktop webviews or Rust server were used.

Run the UI Vite server at 127.0.0.1:4972. Place capture.mjs in .shots/ of the repository with e2e Playwright dependencies installed, then run `node .shots/capture.mjs after`. For before, use b3163de and `node .shots/capture.mjs before`.

Six new full-app regressions failed on b3163de and passed on e9a0054. Full UI suite: 717 passed, 0 failed. Typecheck, i18n/style lint and Vite build passed.
