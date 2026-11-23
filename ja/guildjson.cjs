// The guild.json this site serves at its root, the guild's on-chain endpoint,
// written from guild.cjs. Null until the guild is founded: it has no id before.
const guild = require('./guild.cjs');

module.exports = function guildJson() {
  if (!guild.founded) return null;
  const site = `https://${guild.host}`;
  return JSON.stringify({
    guild: {
      schema_version: 1,
      id: guild.id,
      name: guild.name,
      description: guild.motto,
      tag: guild.tag,
      logo: `${site}/ja/img/guild-logo.png`,
      webapp: guild.host,
      website: site,
      recruiting: {status: 'open'},
      socials: {
        bluesky: '', facebook: '', farcaster: '', instagram: '', twitch: '', x: '', youtube: '',
        discord_contact: '', discord_server: '', telegram_contact: '', telegram_channel: '',
      },
      denom: {6: guild.denom.whole, 0: guild.denom.small},
      // Shared with SN Corp, as the other guilds' are.
      services: {
        guild_api: 'https://beta.playstructs.com/api/',
        reactor_api: 'https://public.testnet.structs.network/',
        client_websocket: 'wss://public.testnet.structs.network:26657/websocket',
        grass_nats_websocket: 'wss://beta.playstructs.com:1443',
        matrix: 'https://matrix.beta.playstructs.com',
        explorer: '',
      },
    },
  }, null, 2) + '\n';
};
