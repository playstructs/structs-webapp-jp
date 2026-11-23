// Changes to structs-webapp's sources that are not translation, as
// [upstream text, replacement] pairs per upstream file.
//
// structs-webapp is served by its guild and reaches the guild API at /api,
// with a session cookie, and GRASS and the chain node on the same host. This
// page hosts none of them: these patches send webapp to the site's guild's
// services (ja/guild.cjs), as ja/runtime/guild.js reads them, with a bearer token instead
// of the cookie.
const guild = require('./guild.cjs');

module.exports = {
  'js/index.js': [
    // Nothing below may run before the guild, and so its services, is known.
    // The tutorial is a simulation and needs no guild.
    ['const tutorialMode = TutorialMode.isActive();', 'if (!TutorialMode.isActive()) await __ja.guild.ready;\nconst tutorialMode = TutorialMode.isActive();'],
    ['`ws://${window.location.hostname}:1443`', '(__ja.guild.grass || `ws://${window.location.hostname}:1443`)'],
  ],
  'js/managers/SigningClientManager.js': [
    [': `ws://${window.location.hostname}:26657`)', ': (__ja.guild.chainWs || `ws://${window.location.hostname}:26657`))'],
  ],
  'js/api/GuildAPI.js': [
    ["this.apiUrl = '/api';", "Object.defineProperty(this, 'apiUrl', {get: () => __ja.guild.api, enumerable: true});"],
    // This page's guild is fixed (ja/guild.cjs), never looked up: /guild/this is the
    // API host's own guild, and this site's guild shares SN Corp's API.
    ['`${this.apiUrl}/guild/this`', '`${this.apiUrl}/guild/${__ja.guild.id}`'],
    // /auth/token takes the same signed login as /auth/login and answers with a bearer token.
    [
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/login`, loginRequestDTO, {...options, reauthenticate: false});',
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/token`, loginRequestDTO, {...options, reauthenticate: false});\n'
      + '    __ja.guild.setToken(jsonResponse?.success ? jsonResponse.data?.access_token : null);',
    ],
    [
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/logout`, {}, options);',
      'const jsonResponse = await this.ajax.post(`${this.apiUrl}/auth/logout`, {}, options);\n    __ja.guild.setToken(null);',
    ],
  ],
  // Sector Blitz contests are read from the same guild's /api/influence.
  'js/api/InfluenceAPI.js': [
    ["this.apiUrl = '/api/influence';", "Object.defineProperty(this, 'apiUrl', {get: () => `${__ja.guild.api}/influence`, enumerable: true});"],
  ],
  // The public leaderboard and spectating read the guild's public API, with
  // nobody signed in. The leaderboard page asks before the guild is known.
  'js/api/PublicSectorBlitzAPI.js': [
    ["this.apiUrl = '/api/public/sector-blitz';", "Object.defineProperty(this, 'apiUrl', {get: () => `${__ja.guild.api}/public/sector-blitz`, enumerable: true});"],
    ['    const response = await fetch(', '    await __ja.guild.ready;\n    const response = await fetch('],
  ],
  'js/framework/JsonAjaxer.js': [
    ["headers: {\n        'Content-Type': 'application/json'\n      },", "headers: {\n        'Content-Type': 'application/json',\n        ...__ja.guild.headers()\n      },"],
  ],
  'js/managers/AuthManager.js': [
    // Before any guild API call, recovery checks on chain that the player is in
    // this guild, moving them here from another guild, and stops if they are
    // not: a shared guild API may log in another guild's player (recovery.js).
    [
      'import {MenuPage} from "../framework/MenuPage";',
      'import {MenuPage} from "../framework/MenuPage";\nimport {MenuWaitingViewModel} from "../view_models/generic/MenuWaitingViewModel";',
    ],
    [
      'const primaryAddress = this.gameState.signingAccount.address;\n    const guildId = this.gameState.thisGuild.id;',
      'const primaryAddress = this.gameState.signingAccount.address;\n'
      + '    if (!await __ja.recovery.ensureInThisGuild(this, primaryAddress, signal, MenuWaitingViewModel.setMessage)) return false;\n'
      + '    const guildId = this.gameState.thisGuild.id;',
    ],
  ],
  // No recovery key section in sign-up (runtime/account.js): once the player
  // has chosen their name the key is made and the account created, with
  // nothing shown, explained or confirmed, and sign-up goes on to Success
  // (whose text no longer mentions the key: strings/.../SignupSuccessViewModel).
  'js/controllers/AuthController.js': [
    [
      '  signupRecoveryKeyIntro() {\n    const viewModel = new RecoveryKeyIntroViewModel();\n    viewModel.render();\n  }',
      '  signupRecoveryKeyIntro() {\n    __ja.account.createAccount(this, MenuPage);\n  }',
    ],
  ],
  // The Account page: Download Player (a file holding the mnemonic) in place
  // of Log Out.
  'js/view_models/account/AccountIndexViewModel.js': [
    ['<button id="${this.logoutBtnId}" class="sui-screen-btn sui-mod-destructive">Log Out</button>',
      '${__ja.account.downloadButtonHTML(this)}'],
    [
      "    document.getElementById(this.logoutBtnId).addEventListener('click', () => {\n      MenuPage.router.goto('Account', 'logoutConfirm');\n    });\n",
      "    __ja.account.bindDownload(this);\n",
    ],
  ],
  'js/telemetry/OnboardingTelemetry.js': [
    // Onboarding and tutorial runs are reported under this interface's own name.
    ["ONBOARDING_INTERFACE_NAME = 'structs-webapp'", `ONBOARDING_INTERFACE_NAME = '${guild.telemetry}'`],
    ['fetch(ENDPOINT, {', 'fetch(`${__ja.guild.api}/onboarding/events`, {'],
    ['navigator.sendBeacon(ENDPOINT, body)', 'navigator.sendBeacon(`${__ja.guild.api}/onboarding/events`, body)'],
  ],
  // 'default' is the browser's own language, which may not be the page's.
  'js/util/DateFormatter.js': [
    [".toLocaleDateString(\n      'default',", ".toLocaleDateString(\n      'ja-JP',"],
    [".toLocaleTimeString(\n      'default',", ".toLocaleTimeString(\n      'ja-JP',"],
  ],
  'js/view_models/account/AccountDevicesViewModel.js': [
    [".toLocaleDateString(\n      'default',", ".toLocaleDateString(\n      'ja-JP',"],
  ],
  // Display text of struct types arrives in English; type and category stay
  // as they are, since webapp's code compares them.
  'js/factories/StructTypeFactory.js': [
    ['    return structType;', `    __ja.fields(structType, [
      'class', 'class_abbreviation', 'unit_description',
      'primary_weapon_label', 'primary_weapon_description', 'primary_weapon_class',
      'secondary_weapon_label', 'secondary_weapon_description', 'secondary_weapon_class',
      'drive_label', 'drive_description', 'passive_weaponry_label', 'passive_weaponry_description',
      'unit_defenses_label', 'unit_defenses_description', 'ore_reserve_defenses_label',
      'ore_reserve_defenses_description', 'planetary_defenses_label', 'planetary_defenses_description',
    ]);
    return structType;`],
  ],
};
