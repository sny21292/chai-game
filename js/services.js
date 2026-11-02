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
  KEY: 'floorIsLying.stats',
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
  provider: null, showing: null, busy: false, levelsSinceBreak: 0, lastBreakAt: 0,
  init() {
    this.provider = (hasWindow && window.FIL_ADS_PROVIDER) || (query.get('ads') === 'mock' ? MockAds : null);
  },
  get available() { return !!this.provider && !this.busy; },
  levelCleared() { this.levelsSinceBreak++; },
  wantsBreak(pastFirstWorld, noAds) {
    const r = this.RULES;
    return this.available && !noAds && pastFirstWorld && this.levelsSinceBreak >= r.breakEveryLevels &&
      Date.now() - this.lastBreakAt >= r.minSecondsBetweenBreaks * 1000;
  },
  async rewarded(placement) {
    if (!this.available) return false;
    this.busy = true;
    let ok = false;
    try { ok = !!(await this.provider.rewarded(placement)); } catch (e) { ok = false; }
    this.busy = false;
    Stats.track(ok ? 'ad_reward' : 'ad_no_reward', { placement });
    return ok;
  },
  async interstitial(placement) {
    if (!this.available) return;
    this.busy = true;
    try { await this.provider.interstitial(placement); } catch (e) {}
    this.busy = false;
    this.levelsSinceBreak = 0;
    this.lastBreakAt = Date.now();
    Stats.track('ad_break', { placement });
  },
};
const MockAds = {
  name: 'mock',
  show(type, result) {
    return new Promise(done => {
      Ads.showing = { type };
      setTimeout(() => { Ads.showing = null; done(result); }, 2500);
    });
  },
  rewarded() { return this.show('rewarded', true); },
  interstitial() { return this.show('interstitial'); },
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
