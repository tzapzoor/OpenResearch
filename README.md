# Stale plan steering regression

Post-submission browser evidence for alphaXiv/OpenResearch issue #934 and draft PR #935.

Both screenshots show the real OpenResearch Vite dashboard in Chromium on Linux/WSL2, using synthetic API/event fixtures. No private chat data or real agent run is depicted.

Screenshots are captured **after pressing Enter**, waiting for the POST request, waiting for the composer to clear, and processing the fixture acknowledgement event.

- Before (upstream 22295d794fe9b6591b43bfc553aa1b8c205b84e0): the request omits `mode`; one queued chip with the submitted text and a visible **Queued** label appears; there are no steering bubbles.
- After (fix 295e3b15bd121f825e14703401b088ec64e58d36): the request sends `mode: "steer"`; the submitted text appears in a steering bubble in the running assistant message; there are no queued chips.
- The draft composer is cleared in both captures. The old plan remains in transcript history in both.

## Scope of the fixture

The fixture observes the actual outgoing request from the dashboard. Based on its `mode`, it acknowledges the request and emits either `chat.queued` or an updated `chat.message` containing a `steer` part. The script asserts both the outgoing mode and the resulting visible state. This verifies frontend request selection and rendering of server feedback; it does not establish delivery to a live Codex process.

The capture harness is included as `capture.mjs` for inspection. Run it as `.shots/capture.mjs` in a code checkout with UI and e2e dependencies installed and a Vite server at 127.0.0.1:4972. Use `before` against the baseline and `after` against the fix. The Vite backend should point to an unused port: the fixture intercepts API requests, supplies event transport, and blocks off-origin requests.

Evidence is stored separately from the code branch so screenshots do not enter the upstream code diff.

Assisted-by: gpt-6.1-sol
