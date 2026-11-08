# Stale plan steering regression

Browser evidence for alphaXiv/OpenResearch issue #934.

Both screenshots show the real OpenResearch Vite dashboard in Chromium on Linux/WSL2, using synthetic API/event fixtures. No private chat data or real agent run is depicted.

- Before: an older unresolved plan stays docked over a newer running turn and Enter submits without steer mode.
- After: the old plan remains in history, its docked strip is absent, and Enter submits with mode `steer`.

Evidence is stored separately from the code branch so screenshots do not enter the upstream code diff.

Assisted-by: gpt-6.1-sol
