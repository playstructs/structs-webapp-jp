# ストラクト: Structs in Japanese

The [structs-webapp](https://github.com/playstructs/structs-webapp) game client,
in Japanese. structs-webapp is a git submodule (`structs-webapp/`, following its
`main`) and its client is built as it is: its own JavaScript, page, styles and
art, with its webpack configuration as the starting point. What this repository
adds is the overlay in [`ja/`](ja/README.md), applied while webpack reads
webapp's sources. Nothing in the submodule is edited, so a newer structs-webapp
builds with the same overlay. It follows structs-kor and structs-webapp-bra.

Only the client side is used. This site hosts no guild API of its own: the page
talks straight to a guild's API, its GRASS feed and its chain node.

## Setup

```bash
git clone --recurse-submodules <this repository>
npm install          # also installs structs-webapp/src's own dependencies
npm run dev          # http://localhost:5183
```

## Which guild

星間建設 (tag `星建`, "seiken"), at `seiken.structs.zone`, motto 安全第一、採掘第二。
("Safety first, mining second."), token `bento` / `tsubu`. Its details are in one
file, [`ja/guild.cjs`](ja/guild.cjs), and the `guild.json` the site serves is
written from it.

The guild is fixed at build time and never looked up, since it shares SN Corp's
guild API: webapp's `/guild/this` is asked as `/guild/<id>`. Its services come
from the `guild.json` at the endpoint it set on chain, then what was last read,
then the fallback in `webpack.config.js` (`ja/runtime/guild.js`). Requests carry
a bearer token, since a guild's session cookie would be third-party here.

| Variable (build time) | Default | |
|---|---|---|
| `JA_LCD_URL` | `https://public.testnet.structs.network` | the chain node the guild is read from |
| `JA_GUILD_API` | none | a fixed guild API (a local guild), skipping guild.json |
| `JA_GRASS_URL`, `JA_CHAIN_WS` | none | override what the guild publishes |

### On chain

| | |
|---|---|
| Guild | `0-15` 星間建設, owned by founder player `1-14688` (`structs14axe4vp9m52gprqmje3cc80gpfw0erj8aq27pd`) |
| Primary reactor | `3-5` LuckyStar |
| Entry substation | `4-26`, fed by allocation `6-76` from the guild's own stake |
| Joining | open: join minimum 0, invite bypass permissioned |
| Endpoint | `https://seiken.structs.zone/guild.json` |
| Sign-up (TSA) | player `1-14690` (`structs1ezyhq6q940m6wva25zgjrkzs7sdn34fk0972ca`), the host's proxy-join signer: 512 (GuildMembership) on `0-15`, 1024 (SubstationConnection) on `4-26` |

Still to do: the GitHub remote, Pages (source: GitHub Actions) with the custom
domain, and a CNAME for `seiken.structs.zone` to `playstructs.github.io`, as the
other guilds' sites have.

## Sign-up and the player's key

As in structs-kor: sign-up has no recovery key section, and the Account page has
プレイヤーをダウンロード (a text file holding the mnemonic this browser signs
with) where webapp has Log Out (`ja/runtime/account.js`).

## Updating structs-webapp

```bash
npm run update:webapp
```

This moves the submodule to the latest `main`, installs its dependencies and
runs the audit: `stale` (English changed), `untranslated` (new English),
`orphan`, `broken` and `mismatch`. `npm test` fails while any remain. Commit the
submodule pointer together with the overlay.

## Building and serving

`npm run build` writes `dist/`, a static site with absolute paths: serve it from
the root of its domain. `.github/workflows/pages.yml` publishes it.

## Licences

structs-webapp is Apache-2.0 (Slow Ninja Inc). Galmuri, the pixel font that
`ja/public/ja/ja.css` gives webapp's fonts for Japanese, is SIL OFL 1.1
(`ja/public/ja/fonts/Galmuri-OFL.md`).
