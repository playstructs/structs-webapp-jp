// Builds structs-webapp's client (the structs-webapp submodule) as a static
// Japanese site. structs-webapp's own webpack config is the starting point, so
// its entry, resolution, loaders and plugins follow upstream; this file only
// adds the Japanese overlay, the rendered page and the static files, and points
// the output at dist/.
const fs = require('node:fs');
const path = require('node:path');
const webpack = require('webpack');
const {UPSTREAM_SRC} = require('./ja/translate.cjs');
const {renderPage, hasLeaderboard, leaderboardSectors, renderLeaderboardPage} = require('./ja/page.cjs');

const upstreamConfigFile = path.join(UPSTREAM_SRC, 'webpack.config.js');
if (!fs.existsSync(upstreamConfigFile)) {
  throw new Error('structs-webapp is missing: run `git submodule update --init`');
}
const upstream = require(upstreamConfigFile);

const PUBLIC_DIRS = [
  path.join(UPSTREAM_SRC, 'public'),
  path.join(__dirname, 'ja/public'),
];

// Upstream's public/ is served by PHP: skip the front controller, Apache's
// rules and anything a local upstream build left there (ours replace them).
const SKIP = /^(index\.php|\.htaccess|data\/|js\/(index|test|sectorBlitz|vendors-)|js\/manifest\.json|js\/workers\/)|(^|\/)\.DS_Store$/;

// The Japanese runtime runs first in every page's bundle.
const JA_RUNTIME = path.join(__dirname, 'ja/runtime/index.js');

// The guild this site serves, fixed: never looked up, nor set per build
// (ja/runtime/guild.js). Its services are read from its guild.json on the
// chain's public node.
const GUILD = require('./ja/guild.cjs');
const guildJson = require('./ja/guildjson.cjs');
const DEFAULT_LCD = 'https://public.testnet.structs.network';
// Used only when the guild's guild.json can't be read and none was read before.
const FALLBACK = {
  api: 'https://beta.playstructs.com/api',
  grass: 'wss://beta.playstructs.com:1443',
  chainWs: 'wss://public.testnet.structs.network:26657',
};

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(file, base, out);
    } else {
      out.push(path.relative(base, file).split(path.sep).join('/'));
    }
  }
  return out;
}

/** Emits index.html and every static file, in dev (memory) as in a build. */
class JaSitePlugin {
  apply(compiler) {
    const {Compilation, sources, WebpackError} = compiler.webpack;
    compiler.hooks.thisCompilation.tap('JaSitePlugin', compilation => {
      compilation.hooks.processAssets.tap({
        name: 'JaSitePlugin', stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      }, () => {
        for (const dir of PUBLIC_DIRS) {
          compilation.contextDependencies.add(dir);
          for (const rel of walk(dir)) {
            if (dir === PUBLIC_DIRS[0] && SKIP.test(rel)) {
              continue;
            }
            // Served as upstream ships them: marked minimized so no minifier rewrites them.
            const asset = new sources.RawSource(fs.readFileSync(path.join(dir, rel)));
            compilation.getAsset(rel)
              ? compilation.updateAsset(rel, asset, {minimized: true})
              : compilation.emitAsset(rel, asset, {minimized: true});
          }
        }

        const bundle = name => {
          const files = compilation.entrypoints.get(name).getFiles().filter(file => file.endsWith('.js'));
          if (files.length !== 1) {
            throw new Error(`Expected one JavaScript bundle for ${name}`);
          }
          return files[0];
        };
        const emitPage = (file, {html, stale, dependencies}) => {
          dependencies.forEach(dependency => compilation.fileDependencies.add(dependency));
          stale.forEach(message => compilation.warnings.push(new WebpackError(`ja: ${message}`)));
          compilation.emitAsset(file, new sources.RawSource(html), {minimized: true});
        };
        compilation.contextDependencies.add(path.join(__dirname, 'ja/strings/templates'));

        if (!GUILD.founded) {
          compilation.warnings.push(new WebpackError(`ja: the guild is not founded yet: playing through ${GUILD.id} (ja/guild.cjs)`));
        }
        const published = guildJson();
        if (published) {
          compilation.emitAsset('guild.json', new sources.RawSource(published), {minimized: true});
        }
        emitPage('index.html', renderPage(bundle('index')));
        // The public leaderboard at /sector-blitz and /sector-blitz/{sector}.
        if (compilation.entrypoints.has('sectorBlitz')) {
          const leaderboard = bundle('sectorBlitz');
          emitPage('sector-blitz/index.html', renderLeaderboardPage(leaderboard));
          for (const sector of leaderboardSectors()) {
            emitPage(`sector-blitz/${sector}/index.html`, renderLeaderboardPage(leaderboard, sector));
          }
        }
      });
    });
  }
}

module.exports = (env, argv) => {
  const config = {
    guildId: GUILD.id,
    founded: GUILD.founded,
    lcd: process.env.JA_LCD_URL || DEFAULT_LCD,
    // Set, these override what the guild publishes.
    api: (process.env.JA_GUILD_API || '').replace(/\/+$/, ''),
    grass: process.env.JA_GRASS_URL || '',
    chainWs: process.env.JA_CHAIN_WS || '',
    fallback: FALLBACK,
  };

  const plugins = upstream.plugins
    .filter(plugin => plugin.constructor.name !== 'AssetManifestPlugin')
    // Rebuilt on this webpack: upstream's copy comes from its own node_modules.
    .map(plugin => plugin.constructor.name === 'ProvidePlugin'
      ? new webpack.ProvidePlugin(plugin.definitions)
      : plugin);

  return {
    ...upstream,
    context: UPSTREAM_SRC,
    entry: {
      index: [JA_RUNTIME, upstream.entry.index],
      ...(upstream.entry.sectorBlitz && hasLeaderboard()
        ? {sectorBlitz: [JA_RUNTIME, upstream.entry.sectorBlitz]}
        : {}),
    },
    output: {
      ...upstream.output,
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/' + upstream.output.filename,
      chunkFilename: 'js/' + upstream.output.chunkFilename,
      publicPath: '/',
      clean: true,
    },
    module: {
      ...upstream.module,
      rules: [
        {
          test: /\.js$/,
          include: path.join(UPSTREAM_SRC, 'js'),
          exclude: path.join(UPSTREAM_SRC, 'js/ts'),
          enforce: 'pre',
          loader: path.join(__dirname, 'ja/loader.cjs'),
        },
        ...upstream.module.rules,
      ],
    },
    plugins: [
      ...plugins,
      new webpack.DefinePlugin({
        __JA_CONFIG__: JSON.stringify(config),
      }),
      new JaSitePlugin(),
    ],
    performance: {hints: false},
    devServer: {
      port: 5183,
      static: false,
      hot: false,
      liveReload: true,
      client: {overlay: {errors: true, warnings: false}},
    },
  };
};
