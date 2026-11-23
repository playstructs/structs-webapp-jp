// The guild this site serves, and the words the overlay uses for it.
//
// Everything about the guild is here: strings/ and runtime/ name it only
// through these values ({{guild}}, {{tag}}, {{motto}}, {{badge}} in strings/,
// filled in by translate.cjs) and guild.json is written from them
// (guildjson.cjs), so founding or renaming it changes this file and the art.
//
// Seikan Kensetsu (星間建設, spelled in Latin for now, here and on chain) was
// founded on 2026-11-22. With `founded` false, recovery would move
// nobody into the guild (runtime/recovery.js), no guild.json would be written
// and the Pages workflow would refuse to deploy.
module.exports = {
  founded: true,
  id: '0-15',
  name: 'Seikan Kensetsu',
  tag: '星建',
  motto: '安全第一、採掘第二。',
  badge: '/ja/img/guild-badge.png',

  // The site's hostname; the guild's on-chain endpoint is https://<host>/guild.json.
  host: 'seiken.structs.zone',
  // guild.json's language: an uppercase code (structs-pg's guild_meta; EN when absent).
  language: 'JA',
  // The guild's token: one whole is 1,000,000 of the small unit.
  denom: {whole: 'bento', small: 'tsubu'},
  // Onboarding telemetry's interface name: a guild accepts only
  // RegexPattern::SLUG here (ASCII letters, digits, _ . -).
  telemetry: 'seiken.structs.zone',
  // Google Tag Manager container, e.g. 'GTM-XXXXXXX'; empty for none.
  gtm: '',
};
