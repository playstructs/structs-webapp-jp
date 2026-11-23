# The Japanese overlay

Everything in this directory is applied to the `structs-webapp` submodule as it
is built. Nothing in the submodule is edited.

| Path | What it is |
|---|---|
| `guild.cjs` | The site's guild: id, name, tag, motto, badge, host, telemetry name |
| `strings/<upstream path>.json` | Japanese for one upstream file: `{"exact source text": "replacement"}` |
| `patches.cjs` | Changes that are not text: the guild connection, date locale, sign-up's key, struct-type data |
| `runtime/` | Loaded before webapp's entry: `__ja.t()` with `terms.json` (game data), `__ja.guild`, `__ja.recovery`, `__ja.account` |
| `public/` | Served over webapp's files: `ja/ja.css`, Galmuri, banner frames in `lottie/` |
| `art/banners.py` | Draws those frames from webapp's; `banners.json` records which upstream frames they replace |
| `art/logo.py` | Draws the guild's badge and logo from its tag |
| `page.cjs` | Renders webapp's Twig pages |
| `loader.cjs`, `translate.cjs` | Apply `patches.cjs` then `strings/` to each source file |
| `audit.cjs` | Reports stale entries, English still on screen and translations that don't fit their code |
| `GLOSSARY.md` | The words and voice to use |

## Writing a strings file

- A key is text copied exactly from the upstream file; every occurrence is
  replaced, longest key first. Include enough around it (quotes, tags) that it
  can only match what a player reads, never an id, class, event or stored value.
- Keep `${…}` expressions, tags and attributes; reorder them as Japanese needs.
- Never write the guild's name: use `{{guild}}`, `{{tag}}`, `{{motto}}`, `{{badge}}`.
- Text that code also compares stays English: show it with `__ja.t(…)` and add
  the word to `runtime/terms.json`. Not in `js/workers/` or what it imports.
- `$keep` lists English left as is on purpose, so the audit stops reporting it.

```bash
node ja/audit.cjs js/view_models/signup/IncomingCall1ViewModel.js
```

Art needs `pip install pillow fonttools brotli`, and only runs again when the
audit reports a banner as stale or the guild's tag changes.
