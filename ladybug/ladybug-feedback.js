/*
 * ARTEZIQ Ladybug PWA connector — shared, app-agnostic build (v0.2, based on reference v0.1.0).
 * Per-app values (name, slug, session-id prefix, mask selectors) are passed in as options; nothing else differs between apps.
 * Request shapes match Feedback System v0.2.0 (BACKEND-CONTRACT-v0.2.0.md).
 *
 * Adaptations from the reference connector:
 *  - Launcher uses the supplied Ladybug PNG (iconUrl) and the ARTEZIQ UI standard:
 *    fixed bottom-right, 16px/12px offsets, safe-area aware, 56px phone / 64px tablet+.
 *  - In-panel sign-in (via the injected `auth` helper) because the app is in Development mode.
 *  - Friendly handling of offline, 401, 403, 429 and 5xx responses; the typed report is kept on failure.
 *  - Basic focus containment inside the dialog.
 * v065 additions:
 *  - "Capture the app screen": the report window steps aside (your typed draft is kept), a small bar lets the
 *    tester scroll/position the app, then ONE tap takes the screenshot (vendored html2canvas, loaded only when used)
 *    and the report returns with a preview (Retake / Remove). Nothing is captured without that tap.
 *  - Privacy: location text and (by default) the map are blanked in the screenshot; the tester sees a preview first.
 *  - After a successful send a clear "Report sent" pop-up appears and the report window closes.
 *  - Text follows the app's --tx text-size setting (Standard / Large / Extra large).
 * No bundled credentials. Tokens are never put in telemetry.
 */

const TYPES = new Set(['bug', 'feature', 'suggestion', 'question', 'other']);
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
const FILE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'text/plain', 'application/json']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SENSITIVE_FIELD = /(?:password|passcode|token|secret|api.?key|authorization|cookie|session|email|phone|address|gps|latitude|longitude|coords?|location|precise|message|prompt|query|body|request|response|header|audio|transcript)/i;

const CSS = `
:host{all:initial;color-scheme:dark;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --arteziq-ladybug-right:16px;--arteziq-ladybug-bottom-offset:16px;--t:var(--tx,1)}
@media (max-width:767px){:host{--arteziq-ladybug-right:12px;--arteziq-ladybug-bottom-offset:12px}}
*,*:before,*:after{box-sizing:border-box}
button,input,select,textarea{font:inherit}
button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #f2bd4b;outline-offset:2px}
#bug{position:fixed;right:calc(var(--arteziq-ladybug-right) + env(safe-area-inset-right,0px));bottom:calc(var(--arteziq-ladybug-bottom-offset) + env(safe-area-inset-bottom,0px));
  width:56px;height:56px;z-index:2147482600;border:0;padding:0;margin:0;background:transparent;cursor:pointer;display:block;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
@media (min-width:768px){#bug{width:64px;height:64px}}
#bug img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;-webkit-user-drag:none;user-select:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.6));transition:transform .12s ease}
#bug:hover img{transform:scale(1.06)}#bug:active img{transform:scale(.93)}
#bug .fallback{font-size:38px;line-height:56px;text-align:center;display:block}
#bug[hidden],#overlay[hidden],[hidden]{display:none!important}
#overlay{position:fixed;inset:0;z-index:2147482601;background:#000a;display:flex;align-items:center;justify-content:center;padding:12px max(12px,env(safe-area-inset-right,0px)) 12px max(12px,env(safe-area-inset-left,0px))}
#panel{background:#06282d;color:#fff;border:1px solid #43e2c0;border-radius:18px;width:min(540px,100%);max-height:calc(100dvh - 28px);overflow-y:auto;padding:20px;box-shadow:0 18px 35px #000a;font:calc(17px * var(--t))/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
#heading h2{display:flex;align-items:center;gap:10px}
#heading h2 img{width:34px;height:34px;object-fit:contain}
h2{font-size:calc(23px * var(--t));line-height:1.25;margin:0}
#close{background:none;border:1px solid #6b9295;color:white;border-radius:8px;font-size:26px;min-width:48px;min-height:48px;cursor:pointer}
label{display:block;font-weight:650;margin-top:13px;margin-bottom:6px;color:#e5eeee}
input:not([type=checkbox]):not([type=file]),select,textarea{width:100%;padding:11px 12px;background:#021b20;color:#fff;border:1px solid #5d888d;border-radius:9px;min-height:48px;font-size:max(16px,calc(17px * var(--t)))}
textarea{min-height:105px;resize:vertical}select{color-scheme:dark}
input[type=file]{display:block;width:100%;max-width:100%;font-size:calc(15px * var(--t));color:#e1eff0}
.row{display:flex;gap:12px;flex-wrap:wrap}.row>div{flex:1;min-width:135px}
.small{font-size:calc(14px * var(--t));color:#b6cbcd;margin:4px 0 7px}
.check{font-weight:500;display:flex;align-items:flex-start;gap:10px;line-height:1.45}.check input{margin-top:3px;accent-color:#43e2c0;width:24px;height:24px;flex:none}
.actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;flex-wrap:wrap}
.action{border:0;border-radius:10px;cursor:pointer;min-height:50px;padding:10px 18px;font-weight:750;font-size:calc(17px * var(--t))}
.primary{background:#43e2c0;color:#042528}.secondary{background:#16464b;color:#fff;border:1px solid #568b90}.action:disabled{opacity:.55;cursor:wait}
.linkbtn{background:none;border:0;color:#7fe9d0;text-decoration:underline;cursor:pointer;padding:8px 2px;min-height:48px;font-size:calc(16px * var(--t))}
#who{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#0a3a40;border:1px solid #2f6f74;border-radius:10px;padding:6px 6px 6px 12px;font-size:calc(15px * var(--t));color:#cfe8e6;margin:4px 0 2px}
#who span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#status{min-height:20px;font-size:calc(15px * var(--t));margin-top:12px;white-space:pre-wrap}
#status.error{color:#ffaaaa}#status.success{color:#8dffdf}#status.info{color:#b9d7dc}
.privacy{font-size:calc(14px * var(--t));color:#b6cbcd;margin:2px 0 0 34px}

/* --- screenshot capture --- */
.shotbox{background:#0a3a40;border:1px solid #2f6f74;border-radius:12px;padding:12px;margin-top:2px}
.shotbtns{display:flex;gap:10px;flex-wrap:wrap}
.shotbtns .action{flex:1 1 200px}
.shotor{font-size:calc(14px * var(--t));color:#b6cbcd;margin:12px 0 4px}
#capPreview{margin-top:12px}
#capPreview img{display:block;width:100%;max-height:220px;object-fit:contain;background:#021b20;border:1px solid #5d888d;border-radius:10px}
#capPreview .shotbtns{margin-top:8px}
#capPreview .action{min-height:46px;padding:8px 14px;flex:1 1 120px}
#capbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147482602;
  width:min(560px,calc(100vw - 24px));background:#06282d;color:#fff;border:2px solid #43e2c0;border-radius:16px;padding:12px 14px;box-shadow:0 12px 30px #000c;
  font:calc(17px * var(--t))/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#capbar p{margin:0 0 10px}
#capbar .shotbtns .action{flex:1 1 140px}
#done{position:fixed;inset:0;z-index:2147482700;background:#000b;display:flex;align-items:center;justify-content:center;padding:16px}
#donebox{background:#06282d;color:#fff;border:2px solid #43e2c0;border-radius:20px;width:min(440px,100%);padding:26px 22px 22px;text-align:center;box-shadow:0 20px 45px #000c;
  font:calc(17px * var(--t))/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-height:calc(100dvh - 32px);overflow-y:auto}
#donecheck{width:76px;height:76px;margin:0 auto 12px;border-radius:50%;background:#43e2c0;color:#042528;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:900;line-height:1}
#donebox h2{font-size:calc(26px * var(--t));margin-bottom:8px}
#donebox p{margin:6px 0}
#doneid{display:inline-block;margin:8px 0 2px;padding:6px 12px;border-radius:8px;background:#021b20;border:1px solid #5d888d;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:calc(14px * var(--t));word-break:break-all}
#donewarn{margin-top:10px;padding:10px 12px;border-radius:10px;background:#3a2b08;border:1px solid #f2bd4b;color:#ffe3a1;font-size:calc(15px * var(--t));text-align:left}
#donebox .action{width:100%;margin-top:18px;min-height:54px}
@media (max-width:450px){#panel{padding:15px}#overlay{padding:7px}.row{gap:0}.row>div{flex:1 1 100%}}
@media (prefers-reduced-motion:reduce){#bug img{transition:none}}`;

const trim = (value, length) => typeof value === 'string' ? value.trim().slice(0, length) : '';
function safeData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out = {};
  for (const [key, value] of Object.entries(data).slice(0, 12)) {
    if (SENSITIVE_FIELD.test(key)) continue;
    if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
      out[trim(key, 60)] = value;
    } else if (typeof value === 'string') {
      out[trim(key, 60)] = trim(value, 120);
    }
  }
  return out;
}
function getDevice() {
  const ua = navigator.userAgent || '';
  return /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iPad'
    : /iPhone/i.test(ua) ? 'iPhone' : /Android/i.test(ua) ? 'Android' : 'Desktop';
}
function getOs() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua) || getDevice() === 'iPad' ? 'iPadOS/iOS'
    : /Android/i.test(ua) ? 'Android' : /Win/i.test(ua) ? 'Windows'
    : /Mac/i.test(ua) ? 'macOS' : 'Other';
}
function getBrowser() {
  const ua = navigator.userAgent || '';
  return /Edg\//i.test(ua) ? 'Edge' : /CriOS|Chrome\//i.test(ua) ? 'Chrome'
    : /FxiOS|Firefox\//i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other';
}
function generatedId(prefix) {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('Ladybug requires a secure context with crypto.randomUUID().');
  }
  return `${prefix}-${crypto.randomUUID()}`;
}

class ApiError extends Error {
  constructor(message, status = 0, kind = 'api') { super(message); this.name = 'ApiError'; this.status = status; this.kind = kind; }
}
function explain(status, serverMessage, appName = 'this app') {
  if (status === 401) return 'Your sign-in expired. Please sign in again.';
  if (status === 403) return `This account isn't authorized to send ${appName} feedback.`;
  if (status === 413) return 'That attachment is too large for the feedback service.';
  if (status === 429) return 'Too many reports in a short time. Wait a minute and try again.';
  if (status >= 500) return `The feedback service had a problem (HTTP ${status}). Your text is still here. Try again in a moment.`;
  return trim(serverMessage || '', 250) || `Request failed (HTTP ${status}).`;
}

/**
 * Required: supabaseUrl, publishableKey, appKey, getAccessToken(force?).
 * Optional: slug, iconUrl, bottomOffsetPx, bottomOffsetPhonePx, getContext(), auth, onAuthRequired().
 * `auth` (see ladybug-auth.js) lets the panel sign the tester in. The host app owns Supabase Auth.
 * The connector NEVER stores tokens or passwords itself.
 */
export function createLadybugFeedback(options) {
  const opts = options || {};
  const { supabaseUrl, publishableKey, appKey, getAccessToken, auth } = opts;
  if (!/^https:\/\/[^\s/]+\.supabase\.co\/?$/.test(supabaseUrl || '')) throw new Error('A valid Supabase project URL is required.');
  if (!publishableKey || !appKey || typeof getAccessToken !== 'function') throw new Error('publishableKey, appKey, and getAccessToken() are required.');

  const slug = trim(opts.slug || '', 120);
  if (!slug) throw new Error('slug is required (the app slug registered in the Feedback Dashboard).');
  // Display name shown in the panel; defaults to a title-cased slug. Session-id prefix defaults to the slug's initials ("anglers-navigator" -> "AN").
  const appName = trim(opts.appName || slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 80);
  const idPrefix = trim(opts.sessionIdPrefix || slug.split('-').map((w) => w.charAt(0).toUpperCase()).join(''), 12) || 'APP';
  const base = supabaseUrl.replace(/\/$/, '');
  const sessionId = generatedId(idPrefix);
  const buffer = [];
  const queue = [];
  const settingKey = `arteziq_ladybug_diagnostics_${slug}`;
  let diagnosticsEnabled = false;
  let mounted = false;
  let destroyed = false;
  let host = null;
  let shadow = null;
  let sending = false;
  let lastFocus = null;
  let statusNode = null;
  let flushPromise = null;
  let backgroundTimer = null;
  let authMode = 'password';   // 'password' | 'code'
  let codeSent = false;
  let capturing = false;       // true while the report is stepped aside so the tester can position the app
  let captured = null;         // { file, url } screenshot taken with "Capture the app screen"
  let h2cPromise = null;
  const maskSelectors = Array.isArray(opts.maskSelectors) ? opts.maskSelectors.filter((x) => typeof x === 'string').slice(0, 20) : [];
  const mapSelectors = Array.isArray(opts.mapSelectors) ? opts.mapSelectors.filter((x) => typeof x === 'string').slice(0, 10) : [];

  try { diagnosticsEnabled = localStorage.getItem(settingKey) === 'yes'; } catch { /* private browsing or blocked storage */ }

  function context() {
    let appCtx = {};
    try { appCtx = typeof opts.getContext === 'function' ? (opts.getContext() || {}) : {}; } catch { /* do not break host app */ }
    const path = location.pathname; // Never include query string or URL fragment.
    return {
      platform: 'pwa', appVersion: trim(appCtx.appVersion || opts.appVersion || 'unknown', 80),
      buildNumber: trim(appCtx.buildNumber || '', 80),
      device: getDevice(), os: getOs(), browser: getBrowser(),
      screen: trim(appCtx.screen || 'App', 200), route: trim(path, 500),
      installedPwa: Boolean(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone),
      online: navigator.onLine, testerMode: diagnosticsEnabled,
    };
  }

  function setDiagnosticsEnabled(enabled) {
    diagnosticsEnabled = Boolean(enabled);
    if (!diagnosticsEnabled) { buffer.length = 0; queue.length = 0; }
    try { localStorage.setItem(settingKey, diagnosticsEnabled ? 'yes' : 'no'); } catch { /* optional */ }
  }

  function track(name, details = {}) {
    if (!diagnosticsEnabled || destroyed) return;
    const ctx = context();
    const event = {
      name: trim(name, 120) || 'unknown',
      type: trim(details.type || 'workflow', 60),
      level: LEVELS.has(details.level) ? details.level : 'info',
      occurredAt: new Date().toISOString(),
      screen: trim(details.screen || ctx.screen, 200),
      route: ctx.route,
      data: safeData(details.data),
    };
    buffer.push(event);
    if (buffer.length > 50) buffer.shift();
    queue.push(event);
    if (queue.length > 50) queue.shift();
  }

  async function authHeaders(isJson = true, promptAuth = true, force = false) {
    const accessToken = await getAccessToken(force);
    if (!accessToken || typeof accessToken !== 'string') {
      if (promptAuth && typeof opts.onAuthRequired === 'function') await opts.onAuthRequired();
      throw new ApiError('Sign in to your authorized ARTEZIQ account before submitting feedback.', 401, 'auth');
    }
    return {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  async function post(functionName, body, asForm = false, promptAuth = true) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = await authHeaders(!asForm, promptAuth, attempt > 0);
      let response;
      try {
        response = await fetch(`${base}/functions/v1/${functionName}`, {
          method: 'POST', headers,
          body: asForm ? body : JSON.stringify(body),
        });
      } catch {
        throw new ApiError("Couldn't reach the feedback service. Check your connection. Your text is still here.", 0, 'network');
      }
      if (response.status === 401 && attempt === 0) continue;   // one retry with a force-refreshed token
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false || result.error) {
        const status = response.ok ? 400 : response.status;
        throw new ApiError(explain(status, result.error, appName), status, status === 401 ? 'auth' : 'api');
      }
      return result;
    }
    throw new ApiError('Your sign-in expired. Please sign in again.', 401, 'auth');
  }

  async function checkAccess() {
    const result = await post('check-app-access', { slug });
    if (!result.canLaunch) throw new ApiError('Your account is not authorized for this app in its current Access Mode.', 403);
    return result;
  }

  async function flush() {
    if (!diagnosticsEnabled || !queue.length) return { ok: true, accepted: 0 };
    if (flushPromise) return flushPromise;
    const events = queue.slice(0, 50);
    flushPromise = (async () => {
      const result = await post('ingest-telemetry', {
        appKey, sessionId, context: context(), events,
      }, false, false);
      queue.splice(0, Math.min(events.length, queue.length));
      return result;
    })();
    try { return await flushPromise; } finally { flushPromise = null; }
  }

  /* ---------- UI helpers ---------- */
  const $ = (id) => shadow.getElementById(id);

  function status(message, kind = 'info') {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.className = kind;
    statusNode.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  }

  function signedIn() { return auth ? auth.isSignedIn() : true; }

  function renderView() {
    if (!shadow) return;
    const inn = signedIn();
    $('authView').hidden = inn;
    $('form').hidden = !inn;
    $('who').hidden = !(inn && auth);
    if (inn && auth) $('whoEmail').textContent = auth.getEmail() ? `Signed in as ${auth.getEmail()}` : 'Signed in';
    // sign-in sub-state
    const pw = authMode === 'password';
    $('authPwWrap').hidden = !pw;
    $('authCodeWrap').hidden = pw ? true : !codeSent;
    $('authSubmit').textContent = pw ? 'Sign in' : (codeSent ? 'Verify code' : 'Email me a code');
    $('authSwitch').textContent = pw ? 'Email me a sign-in code instead' : 'Use my password instead';
    $('authEmail').setAttribute('autocomplete', pw ? 'username' : 'email');
  }

  function close() {
    if (!shadow) return;
    $('overlay').hidden = true;
    $('bug').hidden = false;
    $('authPassword').value = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    track('feedback_closed', { type: 'ui' });
  }

  function open() {
    if (!shadow || capturing || !$('done').hidden) return;
    lastFocus = $('bug');
    $('overlay').hidden = false;
    $('bug').hidden = true;
    renderView();
    status(signedIn() ? '' : 'Development mode: sign in with your authorized ARTEZIQ account to send feedback.');
    track('feedback_opened', { type: 'ui' });
    ($('form').hidden ? $('authEmail') : $('feedbackTitle')).focus();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !shadow) return;
    const inDone = !$('done').hidden;
    if ($('overlay').hidden && !inDone) return;
    const nodes = [...shadow.querySelectorAll(inDone ? '#donebox button' : '#panel button, #panel input, #panel select, #panel textarea')]
      .filter((n) => !n.disabled && n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    const active = shadow.activeElement;
    if (event.shiftKey && (active === first || !active)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }

  function onKeyDown(event) {
    if (!shadow) return;
    if (event.key === 'Escape' && !$('done').hidden) dismissDone();
    else if (event.key === 'Escape' && capturing) cancelCapture();
    else if (event.key === 'Escape' && !$('overlay').hidden) close();
    else trapFocus(event);
  }

  function onJsError() {
    // Never record raw exception messages or stack traces (may contain sensitive data).
    track('javascript_exception', { type: 'error', level: 'error', data: { source: 'window', kind: 'uncaught' } });
    if (diagnosticsEnabled && navigator.onLine) void flush().catch(() => {});
  }
  function onRejected() {
    track('unhandled_rejection', { type: 'error', level: 'error', data: { source: 'window', kind: 'promise' } });
    if (diagnosticsEnabled && navigator.onLine) void flush().catch(() => {});
  }

/* ---------- screenshot capture ---------- */
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (h2cPromise) return h2cPromise;
    const src = typeof opts.html2canvasUrl === 'string' && opts.html2canvasUrl
      ? opts.html2canvasUrl : new URL('./vendor/html2canvas.min.js', import.meta.url).href;
    h2cPromise = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = src; sc.async = true;
      sc.onload = () => (window.html2canvas ? resolve(window.html2canvas) : reject(new Error('capture library missing')));
      sc.onerror = () => reject(new Error('capture library failed to load'));
      document.head.appendChild(sc);
    }).catch((e) => { h2cPromise = null; throw e; });
    return h2cPromise;
  }

  function showCaptured(file) {
    if (captured) { try { URL.revokeObjectURL(captured.url); } catch { /* ignore */ } }
    captured = file ? { file, url: URL.createObjectURL(file) } : null;
    $('capPreview').hidden = !captured;
    if (captured) $('capImg').src = captured.url; else $('capImg').removeAttribute('src');
    $('capBtn').textContent = captured ? '📸 Capture again' : '📸 Capture the app screen';
  }

  function startCapture() {
    if (capturing || sending) return;
    capturing = true;
    $('overlay').hidden = true;
    $('bug').hidden = true;
    $('capbar').hidden = false;
    $('capTake').disabled = false;
    void loadH2C().catch(() => { /* reported when the tester taps Take screenshot */ });
    track('screenshot_capture_started', { type: 'ui' });
    $('capTake').focus();
  }

  function endCapture() {
    capturing = false;
    $('capbar').hidden = true;
    $('overlay').hidden = false;
    $('bug').hidden = true;
  }

  function cancelCapture() {
    if (!capturing) return;
    endCapture();
    status('Screenshot cancelled. Your report is still here.', 'info');
    $('capBtn').focus();
  }

  function applyMasks(doc) {
    for (const sel of maskSelectors) {
      let list = [];
      try { list = doc.querySelectorAll(sel); } catch { continue; }
      list.forEach((el) => {
        if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) { el.value = ''; el.setAttribute('placeholder', 'Hidden for privacy'); }
        else el.textContent = 'Hidden for privacy';
        el.style.setProperty('background', '#26484c', 'important');
      });
    }
    const hideMap = $('capHideMap') ? $('capHideMap').checked : false;
    if (hideMap) {
      for (const sel of mapSelectors) {
        let list = [];
        try { list = doc.querySelectorAll(sel); } catch { continue; }
        list.forEach((el) => {
          el.textContent = 'Map hidden for privacy';
          el.style.setProperty('background', '#26484c', 'important');
          el.style.setProperty('color', '#cfe8e6', 'important');
          el.style.setProperty('display', 'flex', 'important');
          el.style.setProperty('align-items', 'center', 'important');
          el.style.setProperty('justify-content', 'center', 'important');
          el.style.setProperty('text-align', 'center', 'important');
        });
      }
    }
  }

  const canvasToBlob = (canvas, q) => new Promise((resolve) => {
    try { canvas.toBlob((b) => resolve(b), 'image/jpeg', q); } catch { resolve(null); }
  });

  async function takeScreenshot() {
    if (!capturing) return;
    $('capTake').disabled = true;
    // Hide our own bar (it is also excluded from the picture), let the page repaint, then capture.
    $('capbar').hidden = true;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))));
    try {
      const h2c = await loadH2C();
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 2, 1600 / Math.max(vw, vh)));
      const work = h2c(document.documentElement, {
        x: window.scrollX, y: window.scrollY, width: vw, height: vh,
        windowWidth: vw, windowHeight: vh, scale,
        useCORS: true, logging: false, backgroundColor: '#04161a',
        ignoreElements: (el) => !!(el.hasAttribute && el.hasAttribute('data-arteziq-ladybug')),
        onclone: (doc) => { try { applyMasks(doc); } catch { /* never block the screenshot on masking errors */ } },
      });
      const canvas = await Promise.race([work, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000))]);
      let blob = null;
      for (const q of [0.85, 0.65, 0.45]) {
        blob = await canvasToBlob(canvas, q);
        if (blob && blob.size <= MAX_FILE_BYTES) break;
      }
      if (!blob || blob.size > MAX_FILE_BYTES) throw new Error('image too large');
      const d = new Date(); const z = (n) => String(n).padStart(2, '0');
      const name = `screenshot-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.jpg`;
      showCaptured(new File([blob], name, { type: 'image/jpeg' }));
      $('feedbackFile').value = '';
      endCapture();
      status('Screenshot added. Check the preview, then tap Send feedback.', 'success');
      track('screenshot_captured', { type: 'ui' });
      $('capPreview').scrollIntoView?.({ block: 'center' });
    } catch (e) {
      endCapture();
      status("Sorry, the screenshot couldn't be taken on this device. Your report is still here. You can attach a screenshot from your photos below, or just send it without one.", 'error');
      track('screenshot_failed', { type: 'error', level: 'warn' });
    }
  }

  function showDone(id, warning) {
    $('doneid').textContent = id || '';
    $('donewarn').hidden = !warning;
    $('donewarn').textContent = warning || '';
    $('overlay').hidden = true;
    $('bug').hidden = true;
    $('done').hidden = false;
    $('doneBtn').focus();
  }

  function dismissDone() {
    $('done').hidden = true;
    $('bug').hidden = false;
    status('');
    track('feedback_confirmation_closed', { type: 'ui' });
    try { $('bug').focus({ preventScroll: true }); } catch { /* ignore */ }
  }

  /* ---------- sign-in ---------- */
  async function afterSignedIn() {
    // Confirm the account is actually authorized for this app before showing the form.
    status('Checking your access…');
    try {
      await checkAccess();
      renderView();
      status('Signed in. You can send feedback now.', 'success');
      $('feedbackTitle').focus();
      track('feedback_signed_in', { type: 'ui' });
    } catch (e) {
      if (e.status === 403) {
        try { await auth.signOut(); } catch { /* ignore */ }
        renderView();
        status(`${e.message}\nAsk David to add this account to ${appName} testing.`, 'error');
      } else {
        renderView();
        status(`Signed in, but access could not be confirmed yet: ${e.message}`, 'error');
      }
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (!auth || sending) return;
    const email = trim($('authEmail').value, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status('Enter the email address of your ARTEZIQ account.', 'error'); return; }
    sending = true;
    $('authSubmit').disabled = true;
    try {
      if (!navigator.onLine) throw new Error("You're offline. Reconnect to sign in.");
      if (authMode === 'password') {
        const password = $('authPassword').value;
        if (!password) throw new Error('Enter your password.');
        status('Signing in…');
        await auth.signInWithPassword(email, password);
        $('authPassword').value = '';
        await afterSignedIn();
      } else if (!codeSent) {
        status('Sending code…');
        await auth.sendCode(email);
        codeSent = true;
        renderView();
        status(`We emailed a sign-in code to ${email}. Enter it below.`, 'success');
        $('authCode').focus();
      } else {
        const code = trim($('authCode').value, 20);
        if (!code) throw new Error('Enter the code from your email.');
        status('Verifying…');
        await auth.verifyCode(email, code);
        $('authCode').value = '';
        codeSent = false;
        await afterSignedIn();
      }
    } catch (e) {
      status(e.message || 'Sign-in failed.', 'error');
    } finally {
      sending = false;
      $('authSubmit').disabled = false;
    }
  }

  async function doSignOut() {
    if (!auth) return;
    await auth.signOut();
    codeSent = false;
    renderView();
    status('Signed out.', 'info');
    track('feedback_signed_out', { type: 'ui' });
  }

  /* ---------- submit report ---------- */
  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    const form = $('form');
    if (!form.reportValidity()) return;
    const title = trim($('feedbackTitle').value, 180);
    const description = trim($('feedbackDescription').value, 12000);
    if (!description) { status('Enter a description before sending.', 'error'); return; }
    const typeRaw = $('feedbackType').value;
    const severityRaw = $('feedbackSeverity').value;
    const file = (captured && captured.file) || $('feedbackFile').files?.[0] || null;
    if (file && (!FILE_TYPES.has(file.type) || file.size > MAX_FILE_BYTES)) {
      status('Attachment must be PNG/JPG/WebP/MP4/TXT/JSON and 10 MB or smaller.', 'error');
      return;
    }
    if (!navigator.onLine) {
      status("You're offline, so the report was not sent. Your text is still here. Reconnect and tap Send again.", 'error');
      return;
    }
    sending = true;
    $('send').disabled = true;
    status('Checking access and sending report…');
    track('feedback_submit_started', { type: 'workflow' });
    try {
      await checkAccess();
      if (diagnosticsEnabled) {
        try { await flush(); } catch { /* send report with local diagnostic buffer even if telemetry fails */ }
      }
      const result = await post('submit-report', {
        appKey, sessionId,
        type: TYPES.has(typeRaw) ? typeRaw : 'bug',
        severity: SEVERITIES.has(severityRaw) ? severityRaw : 'medium',
        title, description,
        expectedBehavior: trim($('feedbackExpected').value, 8000),
        context: context(),
        recentEvents: diagnosticsEnabled ? buffer.slice(-50) : [],
        metadata: {},
      });
      const id = result.publicId || result.reportId;
      let warning = '';
      if (file) {
        try {
          const data = new FormData();
          data.append('appKey', appKey);
          data.append('reportId', result.reportId);
          data.append('file', file, file.name);
          await post('upload-attachment', data, true);
        } catch (uploadErr) {
          warning = `Your report was received, but the attachment did NOT upload: ${uploadErr.message} You can send another report with the file if you need to.`;
        }
      }
      // Clear the draft, close the report window, and show a clear confirmation.
      form.reset();
      showCaptured(null);
      $('diagnosticsOptIn').checked = diagnosticsEnabled;
      status('');
      showDone(id, warning);
      track('feedback_submitted', { type: 'workflow' });
    } catch (error) {
      if (error.status === 401 && auth) {
        // Session is no longer valid (refresh failed): go back to sign-in, keep the typed report.
        try { await auth.signOut(); } catch { /* ignore */ }
        renderView();
        $('authView').hidden = false;
        $('form').hidden = true;
        status('Your sign-in expired. Please sign in again. Your report text will be here when you return.', 'error');
        // keep the typed text in the (hidden) form fields; show it again after sign-in
      } else {
        status(error.message || 'The report could not be submitted.', 'error');
      }
      track('feedback_submit_failed', { type: 'error', level: 'warn', data: { status: Number(error.status) || 0, kind: error.kind || 'unknown' } });
    } finally {
      sending = false;
      $('send').disabled = false;
    }
  }

  function mount(parent = document.body) {
    if (mounted || destroyed) return;
    mounted = true;
    host = document.createElement('div');
    host.setAttribute('data-arteziq-ladybug', slug);
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    // Apps may only raise the bottom offset (never move the launcher out of the bottom-right corner).
    const desk = Number.isFinite(opts.bottomOffsetPx) ? Math.max(0, Math.min(220, opts.bottomOffsetPx)) : 16;
    const phone = Number.isFinite(opts.bottomOffsetPhonePx) ? Math.max(0, Math.min(220, opts.bottomOffsetPhonePx)) : 12;
    style.textContent = CSS + `\n:host{--arteziq-ladybug-bottom-offset:${desk}px}@media (max-width:767px){:host{--arteziq-ladybug-bottom-offset:${phone}px}}`;
    shadow.appendChild(style);
    const iconUrl = typeof opts.iconUrl === 'string' ? opts.iconUrl : '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <button id="bug" type="button" aria-label="Open feedback" title="Send ARTEZIQ feedback">${iconUrl ? '<img id="bugImg" alt="" draggable="false" decoding="async">' : '<span class="fallback" aria-hidden="true">🐞</span>'}</button>
      <div id="overlay" hidden>
        <section id="panel" role="dialog" aria-modal="true" aria-labelledby="panelTitle">
          <div id="heading"><h2 id="panelTitle">${iconUrl ? '<img id="headImg" alt="" aria-hidden="true">' : '🐞 '}Send feedback</h2><button id="close" type="button" aria-label="Close feedback">×</button></div>
          <div class="small">${appName.replace(/[<>&"]/g, '')} · ARTEZIQ Feedback</div>
          <div id="who" hidden><span id="whoEmail"></span><button type="button" class="linkbtn" id="signOut">Sign out</button></div>

          <form id="authView" hidden novalidate>
            <div class="small">Feedback is limited to approved ARTEZIQ Explorers while the app is in testing.</div>
            <label for="authEmail">Email</label>
            <input id="authEmail" type="email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username" placeholder="you@example.com">
            <div id="authPwWrap"><label for="authPassword">Password</label>
              <input id="authPassword" type="password" autocomplete="current-password"></div>
            <div id="authCodeWrap" hidden><label for="authCode">Code from your email</label>
              <input id="authCode" inputmode="numeric" autocomplete="one-time-code" maxlength="12" placeholder="123456"></div>
            <div class="small">Your password goes directly to the ARTEZIQ sign-in service and is not stored in this app.</div>
            <div class="actions"><button type="button" class="linkbtn" id="authSwitch"></button><button type="submit" class="action primary" id="authSubmit"></button></div>
          </form>

          <form id="form" hidden>
            <div class="row"><div><label for="feedbackType">Feedback type</label><select id="feedbackType"><option value="bug">Bug / problem</option><option value="feature">Feature request</option><option value="suggestion">Suggestion</option><option value="question">Question</option><option value="other">Other</option></select></div>
            <div><label for="feedbackSeverity">Severity</label><select id="feedbackSeverity"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></div>
            <label for="feedbackTitle">Short title</label><input id="feedbackTitle" maxlength="180" required placeholder="What happened?">
            <label for="feedbackDescription">Description</label><textarea id="feedbackDescription" maxlength="12000" required placeholder="What were you doing? What went wrong?"></textarea>
            <label for="feedbackExpected">What did you expect? (optional)</label><textarea id="feedbackExpected" maxlength="8000" placeholder="Expected behavior"></textarea>
            <label for="capBtn">Screenshot (optional)</label>
            <div class="shotbox">
              <div class="shotbtns"><button type="button" class="action secondary" id="capBtn">📸 Capture the app screen</button></div>
              <div class="small">Your report is kept while you line up the shot. Then tap <b>Take screenshot</b>. Location text is hidden automatically.</div>
              ${mapSelectors.length ? '<label class="check" style="margin-top:8px"><input id="capHideMap" type="checkbox" checked> <span>Hide the map in the screenshot (it can show where you fish)</span></label>' : ''}
              <div id="capPreview" hidden>
                <img id="capImg" alt="Preview of the screenshot you took">
                <div class="shotbtns"><button type="button" class="action secondary" id="capRetake">Retake</button><button type="button" class="action secondary" id="capRemove">Remove</button></div>
              </div>
              <div class="shotor">Or attach a file you already have:</div>
              <input id="feedbackFile" type="file" aria-label="Attach a screenshot or file" accept="image/png,image/jpeg,image/webp,video/mp4,text/plain,application/json">
              <div class="small">Maximum 10 MB. Look at a screenshot before sending: it can show where you are.</div>
            </div>
            <label class="check"><input id="diagnosticsOptIn" type="checkbox"> <span>Include limited diagnostic events (Tester Mode) <b>(optional, off by default)</b></span></label>
            <div class="privacy">Sends app version, device/browser type, which screen you were on, and simple steps like "scan completed" with counts. Never your location, saved spots, typed searches, or passwords.</div>
            <div class="actions"><button type="button" class="action secondary" id="cancel">Cancel</button><button type="submit" class="action primary" id="send">Send feedback</button></div>
          </form>
          <div id="status" role="status" aria-live="polite"></div>
        </section>
      </div>
      <div id="capbar" role="region" aria-label="Screenshot" hidden>
        <p id="capText"><b>Line up your screenshot.</b> Scroll or open the screen you want to show, then tap <b>Take screenshot</b>. Your report is saved.</p>
        <div class="shotbtns"><button type="button" class="action primary" id="capTake">📸 Take screenshot</button><button type="button" class="action secondary" id="capCancel">Cancel</button></div>
      </div>
      <div id="done" hidden>
        <section id="donebox" role="alertdialog" aria-modal="true" aria-labelledby="doneTitle" aria-describedby="doneText">
          <div id="donecheck" aria-hidden="true">✓</div>
          <h2 id="doneTitle">Report sent!</h2>
          <p id="doneText">Thank you. Your feedback was submitted successfully.</p>
          <div class="small">Report ID</div><span id="doneid"></span>
          <div id="donewarn" hidden></div>
          <button type="button" class="action primary" id="doneBtn">Back to the app</button>
        </section>
      </div>`;
    shadow.appendChild(wrapper);
    if (iconUrl) {
      for (const id of ['bugImg', 'headImg']) {
        const img = shadow.getElementById(id);
        if (!img) continue;
        img.src = iconUrl;
        // If the icon cannot load, fall back to a visible emoji so the launcher never disappears.
        img.addEventListener('error', () => {
          if (id === 'bugImg') shadow.getElementById('bug').innerHTML = '<span class="fallback" aria-hidden="true">🐞</span>';
          else img.remove();
        }, { once: true });
      }
    }
    statusNode = $('status');
    $('diagnosticsOptIn').checked = diagnosticsEnabled;
    $('diagnosticsOptIn').addEventListener('change', (e) => setDiagnosticsEnabled(e.target.checked));
    $('bug').addEventListener('click', open);
    $('close').addEventListener('click', close);
    $('cancel').addEventListener('click', close);
    $('form').addEventListener('submit', submit);
    $('capBtn').addEventListener('click', startCapture);
    $('capRetake').addEventListener('click', startCapture);
    $('capRemove').addEventListener('click', () => { showCaptured(null); status('Screenshot removed.', 'info'); });
    $('capTake').addEventListener('click', takeScreenshot);
    $('capCancel').addEventListener('click', cancelCapture);
    $('doneBtn').addEventListener('click', dismissDone);
    $('feedbackFile').addEventListener('change', () => { if ($('feedbackFile').files?.length) showCaptured(null); });
    $('authView').addEventListener('submit', submitAuth);
    $('signOut').addEventListener('click', doSignOut);
    $('authSwitch').addEventListener('click', () => {
      authMode = authMode === 'password' ? 'code' : 'password';
      codeSent = false;
      status('');
      renderView();
    });
    $('overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') close(); });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('error', onJsError);
    window.addEventListener('unhandledrejection', onRejected);
    parent.appendChild(host);
    // Background flushing is opt-in and best-effort. Never interrupts app workflows.
    backgroundTimer = window.setInterval(() => {
      if (diagnosticsEnabled && navigator.onLine && queue.length) void flush().catch(() => {});
    }, 45000);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('error', onJsError);
    window.removeEventListener('unhandledrejection', onRejected);
    if (backgroundTimer !== null) window.clearInterval(backgroundTimer);
    backgroundTimer = null;
    if (captured) { try { URL.revokeObjectURL(captured.url); } catch { /* ignore */ } captured = null; }
    host?.remove();
    host = null; shadow = null; mounted = false;
    buffer.length = 0; queue.length = 0;
  }

  return { mount, open, close, destroy, track, flush, checkAccess, setDiagnosticsEnabled, getDiagnosticsEnabled: () => diagnosticsEnabled, getSessionId: () => sessionId };
}
