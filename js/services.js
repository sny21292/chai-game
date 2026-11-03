'use strict';
// Platform services behind small adapters, so game.js never talks to a vendor SDK directly.
// Web portals (CrazyGames / Poki SDKs) and the Capacitor apps (AdMob, in-app purchases, native haptics)
// plug in here later by setting the window.FIL_* hooks before game.js loads. See .claude/docs/phase-0.

const hasWindow = typeof window !== 'undefined';
const query = new URLSearchParams(hasWindow ? location.search : '');
// Local testing only (file:// or localhost): enables the ?all unlock and similar shortcuts.
const IS_DEV = hasWindow && (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));

// ---------- analytics ----------
// Keeps per-level aggregates on this device (Settings → download stats) and forwards every event
// to window.FIL_ANALYTICS_SINK(name, data) when a real analytics backend is plugged in.
const Stats = {
  KEY: 'floorIsLying.stats',   // old name kept on purpose (existing stats)
  data: { sessions: 0, firstSeen: null, levels: {} },
  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem(this.KEY) || '{}')); } catch (e) {}
    this.data.sessions++;
    if (!this.data.firstSeen) this.data.firstSeen = new Date().toISOString();
    this.persist();
  },
  persist() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
  level(id) {
    return this.data.levels[id] || (this.data.levels[id] = { starts: 0, deaths: 0, wins: 0, skips: 0, quits: 0, bestDeaths: null, frames: 0 });
  },
  track(name, data = {}) {
    const lv = data.level ? this.level(data.level) : null;
    if (lv) {
      if (name === 'level_start') lv.starts++;
      else if (name === 'level_death') lv.deaths++;
      else if (name === 'level_skip') lv.skips++;
      else if (name === 'level_quit') lv.quits++;
      else if (name === 'level_win') {
        lv.wins++;
        lv.frames += data.frames || 0;
        lv.bestDeaths = lv.bestDeaths == null ? data.deaths : Math.min(lv.bestDeaths, data.deaths);
      }
    }
    if (hasWindow) this.persist();
    const sink = hasWindow && window.FIL_ANALYTICS_SINK;
    if (sink) { try { sink(name, data); } catch (e) {} }
  },
  export() { return JSON.stringify({ exported: new Date().toISOString(), ...this.data }, null, 2); },
};

// ---------- ads ----------
// A provider is { name, rewarded(placement) -> Promise<boolean>, interstitial(placement) -> Promise<void> }.
// Choose one with window.FIL_ADS_PROVIDER, or open the game with ?ads=mock to see fake ads while testing.
// With no provider the game simply shows no ads and no "skip level" offer.
const Ads = {
  RULES: {
    // no ad breaks during the first state (Maharashtra): let people fall in love first
    breakEveryLevels: 3,           // at most one break per 3 cleared levels...
    minSecondsBetweenBreaks: 120,  // ...and never more often than every 2 minutes
    offerSkipAfterDeaths: 5,       // "skip this level" (rewarded ad) appears after this many deaths on a level
  },
  // showing: set by the provider when the ad actually starts (that's when the game mutes), not on request.
  // blocked: the portal said ads are off (Basic Launch) or blocked; then no ad offers are shown at all.
  provider: null, showing: null, busy: false, blocked: false, levelsSinceBreak: 0, lastBreakAt: 0,
  init() {
    this.provider = (hasWindow && window.FIL_ADS_PROVIDER) || (query.get('ads') === 'mock' ? MockAds : null);
    if (!this.provider && Portal.wanted()) Portal.init();     // sets provider once the portal SDK is ready
  },
  get available() { return !!this.provider && !this.busy && !this.blocked; },
  started(type) { this.showing = { type }; },
  ended(errorCode) {
    this.showing = null;
    if (errorCode === 'adsDisabled' || errorCode === 'adblock') this.blocked = true;
  },
  levelCleared() { this.levelsSinceBreak++; },
  wantsBreak(pastFirstWorld, noAds) {
    const r = this.RULES;
    return this.available && !noAds && pastFirstWorld && this.levelsSinceBreak >= r.breakEveryLevels &&
      Date.now() - this.lastBreakAt >= r.minSecondsBetweenBreaks * 1000;
  },
  async rewarded(placement) {
    if (!this.available) return false;
    this.busy = true;      // the game stays paused while busy, and is muted once the ad starts
    let ok = false;
    try { ok = !!(await this.provider.rewarded(placement)); } catch (e) { ok = false; }
    this.busy = false; this.showing = null;
    Stats.track(ok ? 'ad_reward' : 'ad_no_reward', { placement });
    return ok;
  },
  async interstitial(placement) {
    if (!this.available) return;
    this.busy = true;
    try { await this.provider.interstitial(placement); } catch (e) {}
    this.busy = false; this.showing = null;
    this.levelsSinceBreak = 0;
    this.lastBreakAt = Date.now();
    Stats.track('ad_break', { placement });
  },
};
const MockAds = {
  name: 'mock',
  show(type, result) {
    return new Promise(done => {
      Ads.started(type);
      setTimeout(() => { Ads.ended(); done(result); }, 2500);
    });
  },
  rewarded() { return this.show('rewarded', true); },
  interstitial() { return this.show('interstitial'); },
};

// ---------- web portal: CrazyGames SDK v3 ----------
// Loaded only when the game runs on a CrazyGames domain, or with ?portal=crazygames (add &useLocalSdk=true to
// test the SDK's local mode). Docs: docs.crazygames.com/sdk (ads: requestAd 'midgame' | 'rewarded';
// game: gameplayStart/Stop, happytime, settings.muteAudio). Poki would get a sibling adapter here later.
const Portal = {
  name: null, game: null, data: null, playing: null, muted: false,
  onReady: null,   // set by game.js: ({ locale, save }) once the SDK is up (save = the cloud save string or null)
  wanted() {
    return hasWindow && (query.get('portal') === 'crazygames' || /(^|\.)crazygames\./.test(location.hostname));
  },
  init() {
    const s = document.createElement('script');
    s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
    s.onload = async () => {
      try {
        const SDK = window.CrazyGames.SDK;
        await SDK.init();
        if (SDK.environment === 'disabled') return;
        this.name = 'crazygames'; this.game = SDK.game;
        this.muted = !!(SDK.game.settings && SDK.game.settings.muteAudio);
        SDK.game.addSettingsChangeListener(st => { this.muted = !!st.muteAudio; });
        if (!Ads.provider) Ads.provider = CrazyGamesAds;
        // Data module (progress saves follow a logged-in player across devices). Enabled with the
        // "Progress Save" toggle when submitting; without it SDK.data is missing or throws, and localStorage is used.
        this.data = SDK.data || null;
        let save = null, locale = null;
        try { if (this.data) save = this.data.getItem(SAVE_KEY); } catch (e) {}
        try { locale = SDK.user && SDK.user.systemInfo && SDK.user.systemInfo.locale; } catch (e) {}
        if (this.onReady) this.onReady({ locale, save });
        Stats.track('portal_ready', { portal: this.name, env: SDK.environment, data: !!this.data, locale });
      } catch (e) { Stats.track('portal_error', { portal: 'crazygames', message: String(e && e.message) }); }
    };
    document.head.appendChild(s);
  },
  // gameplay(true) while a level is being played, false on menus, pause, level-end screens and ads
  gameplay(on) {
    if (!this.game || on === this.playing) return;
    this.playing = on;
    try { on ? this.game.gameplayStart() : this.game.gameplayStop(); } catch (e) {}
  },
  store(key, value) { try { if (this.data) this.data.setItem(key, value); } catch (e) {} },
  happy() { try { if (this.game) this.game.happytime(); } catch (e) {} },   // big moments only: a boss, the whole map
};
const CrazyGamesAds = {
  name: 'crazygames',
  request(type) {
    return new Promise(done => {
      try {
        window.CrazyGames.SDK.ad.requestAd(type, {
          adStarted: () => Ads.started(type === 'rewarded' ? 'rewarded' : 'interstitial'),
          adFinished: () => { Ads.ended(); done(true); },
          // adsDisabled (Basic Launch), adblock, unfilled, adCooldown, other: no reward
          adError: e => { const code = e && e.code; Ads.ended(code); Stats.track('ad_error', { type, code }); done(false); },
        });
      } catch (e) { done(false); }
    });
  },
  rewarded() { return this.request('rewarded'); },
  interstitial() { return this.request('midgame').then(() => {}); },
};

// ---------- haptics ----------
// Browser vibration where supported (Android Chrome); the native apps set window.FIL_HAPTICS instead.
const Haptics = {
  buzz(pattern) {
    if (!hasWindow || !save.vibrate) return;
    if (window.FIL_HAPTICS) { try { window.FIL_HAPTICS(pattern); } catch (e) {} return; }
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
  },
};
