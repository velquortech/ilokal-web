# Commit Skill

Run `git status`, `git diff --staged`, and `git diff` (unstaged), then:

1. Identify all changed files and group them by logical concern (feature / fix / chore / docs / refactor).
2. Run a smoke check appropriate to the project type — detect from the repo root:
   - **Next.js / Node**: `npm run lint -- --fix && npm run build` (or `yarn lint --fix && yarn build`)
   - **Makefile project**: `make build` if the target exists
   - **Python**: `python -m py_compile` or `pytest --co -q` if tests exist
   - **No build system detected**: skip the smoke check and note it
   Abort and report if the smoke check fails.
3. Stage relevant files by name (never `git add -A` or `git add .` — could accidentally include `.env` or binaries).
4. Draft a conventional commit message following the pattern already used in this repo (`feat:` / `fix:` / `chore:` / `refactor:` / `docs:`). Focus on the *why*, not the *what*.
5. Show the staged file list and proposed commit message to the user and **wait for explicit approval** before running `git commit`.
6. After approval, commit using a HEREDOC so multi-line messages format correctly. Always append the Co-Authored-By trailer:
   ```
   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```
7. Run `git status` after the commit to confirm it succeeded.

**Do not push** unless the user explicitly asks.