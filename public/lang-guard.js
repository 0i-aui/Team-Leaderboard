/* Pre-paint language/direction guard. Plain classic script (no modules,
 * no imports) served verbatim from /lang-guard.js so the strict
 * Content-Security-Policy (script-src 'self', no inline scripts) stays
 * intact. Runs synchronously before first paint to avoid a flash of
 * wrong-direction content. Reads only a language preference ('ar'|'en').
 * Wrapped in try/catch so private-mode storage errors never break load. */
try {
  var __tl = localStorage.getItem('team-leaderboard-lang');
  if (__tl !== 'ar' && __tl !== 'en') {
    __tl = 'ar';
  }
  document.documentElement.lang = __tl;
  document.documentElement.dir = __tl === 'ar' ? 'rtl' : 'ltr';
} catch (e) {}
