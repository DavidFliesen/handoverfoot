/*
 * ARTEZIQ Feedback — Supabase Auth helper (shared, app-agnostic).
 *
 * Talks to the Feedback project's Supabase Auth (GoTrue) REST API using ONLY the
 * public publishable key. It never sees or stores a service-role key, a
 * Management API PAT, or any private secret.
 *
 * What it keeps in this browser (localStorage, one key): the signed-in user's own
 * session { access_token (JWT), refresh_token, expires_at, email }. That is the same
 * thing supabase-js stores. It is removed by signOut().
 * Passwords are sent straight to Supabase Auth over HTTPS and are never stored.
 */

const SESSION_VERSION = 1;

class AuthError extends Error {
  constructor(message, status = 0, code = '') { super(message); this.name = 'AuthError'; this.status = status; this.code = code; }
}

function friendly(status, body, fallback) {
  const code = String(body?.error_code || body?.code || body?.error || '').toLowerCase();
  const msg = String(body?.msg || body?.message || body?.error_description || '').toLowerCase();
  if (status === 0) return "Couldn't reach the sign-in service. Check your connection and try again.";
  if (status === 429 || code.includes('rate_limit') || msg.includes('rate limit') || msg.includes('seconds')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (code.includes('invalid_credentials') || msg.includes('invalid login')) return 'That email or password is not correct.';
  if (code.includes('otp_expired') || msg.includes('expired') || msg.includes('invalid') && msg.includes('token')) {
    return 'That code is invalid or has expired. Request a new one.';
  }
  if (code.includes('signup') || msg.includes('signups not allowed') || msg.includes('user not found')) {
    return "That email isn't registered for ARTEZIQ Explorer testing. Ask David to invite you.";
  }
  if (code.includes('email_not_confirmed')) return 'Please confirm your email first (check your inbox).';
  if (status >= 500) return 'The sign-in service had a problem. Please try again in a moment.';
  return fallback;
}

export function createFeedbackAuth(options) {
  const { supabaseUrl, publishableKey } = options || {};
  const storageKey = (options && options.storageKey) || 'arteziq_feedback_session_v1';
  if (!/^https:\/\/[^\s/]+\.supabase\.co\/?$/.test(supabaseUrl || '')) throw new Error('A valid Supabase project URL is required.');
  if (!publishableKey) throw new Error('A Supabase publishable key is required.');
  const base = supabaseUrl.replace(/\/$/, '') + '/auth/v1';
  const doFetch = (options && options.fetch) || ((...a) => fetch(...a));

  let memory = null;      // used when localStorage is unavailable
  let refreshing = null;  // single in-flight refresh (refresh tokens are single-use)

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === SESSION_VERSION && typeof s.refresh_token === 'string') return s;
      }
    } catch { /* blocked or corrupt storage */ }
    return memory;
  }
  function save(session) {
    memory = session;
    try { localStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* keep in memory only */ }
  }
  function clear() {
    memory = null;
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }

  async function call(path, body, extraHeaders = {}) {
    let res;
    try {
      res = await doFetch(base + path, {
        method: 'POST',
        headers: { apikey: publishableKey, 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify(body || {}),
      });
    } catch {
      throw new AuthError(friendly(0), 0, 'network');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new AuthError(friendly(res.status, json, 'Sign-in failed. Please try again.'), res.status, json?.error_code || '');
    return json;
  }

  function adopt(json) {
    if (!json || !json.access_token || !json.refresh_token) throw new AuthError('Sign-in did not return a session. Please try again.');
    const now = Math.floor(Date.now() / 1000);
    const session = {
      v: SESSION_VERSION,
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Number(json.expires_at) || now + (Number(json.expires_in) || 3600),
      email: String(json.user?.email || '').slice(0, 200),
    };
    save(session);
    return session;
  }

  async function refresh(session) {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const json = await call('/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
        const next = adopt(json);
        if (!next.email) { next.email = session.email; save(next); }
        return next;
      } catch (e) {
        // A rejected refresh token means the session is over; a network blip should not sign the user out.
        if (e.status === 400 || e.status === 401 || e.status === 403) clear();
        throw e;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  return {
    isSignedIn: () => !!load(),
    getEmail: () => load()?.email || '',

    /** Returns a valid user JWT, refreshing it when it is close to expiry (or when force=true). Null if signed out. */
    async getAccessToken(force = false) {
      const s = load();
      if (!s) return null;
      const now = Math.floor(Date.now() / 1000);
      if (!force && s.expires_at - now > 60) return s.access_token;
      try { return (await refresh(s)).access_token; }
      catch (e) {
        // Offline / transient: fall back to the current token if it has not actually expired yet.
        if (e.status === 0 && s.expires_at - now > 0) return s.access_token;
        return null;
      }
    },

    async signInWithPassword(email, password) {
      const json = await call('/token?grant_type=password', { email: String(email).trim(), password: String(password) });
      return adopt(json).email;
    },

    /** Passwordless: emails a one-time code to an EXISTING account (no new accounts are created). */
    async sendCode(email) {
      await call('/otp', { email: String(email).trim(), create_user: false });
    },
    async verifyCode(email, code) {
      const json = await call('/verify', { type: 'email', email: String(email).trim(), token: String(code).replace(/\s+/g, '') });
      return adopt(json).email;
    },

    async signOut() {
      const s = load();
      clear();
      if (s?.access_token) {
        try { await doFetch(base + '/logout', { method: 'POST', headers: { apikey: publishableKey, Authorization: `Bearer ${s.access_token}` } }); }
        catch { /* local sign-out already done */ }
      }
    },
  };
}
