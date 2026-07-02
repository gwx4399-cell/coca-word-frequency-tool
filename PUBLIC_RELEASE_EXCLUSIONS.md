# Public Release Exclusions

The following source files or content were excluded from `04_portfolio/coca-word-frequency-tool/` for the public release.

## Excluded Files And Directories

- `.git/` — repository metadata; not copied.
- `.cursor/` — local Cursor rules and development guidance; not copied.
- `.cursor/rules/coca-word-tool.mdc` — Cursor project rule; not copied.
- Source `README.md` — not copied; replaced with a concise public README because it referenced the private/source repository path, old `/test/` Pages path, local dev URL, and `.cursor` development-history details.
- `hello.py` — unrelated development scratch file; not needed to build or run the browser app.
- `node_modules/`, `dist/`, caches, temp files, task logs, resume-agent files, `.env`, credential files — not present in the copy allowlist and not copied.

## Sensitive-Content Findings

No API keys, tokens, passwords, private keys, `.env` files, credentials, personal contact details, or internal task links were found in the copied build files.

Public-unsafe development references found and excluded:

- Source README private/source repository command: `git clone https://github.com/gwx4399-cell/test.git`
- Source README old local dev path: `http://localhost:5173/test/`
- Source README old Pages URL: `https://gwx4399-cell.github.io/test/`
- Source README `.cursor/` development-rule references

Dataset scan note: keyword scanning matched ordinary COCA words such as `secret`, `secretary`, `administrator`, `resume`, and `notion` inside the frequency CSV. These are vocabulary entries, not secrets or internal references.
