const ALLOWED_ORIGINS = new Set([
  "https://oleksieienko.com",
  "https://www.oleksieienko.com",
  "http://localhost:8791",
]);

const COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#ff375f", "#bf5af2", "#64d2ff", "#ffd60a"];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://oleksieienko.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ── Durable Object: one shared room broadcasting live cursor positions ──
export class CursorRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = new Map(); // websocket -> {id, color}
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const id = crypto.randomUUID().slice(0, 8);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.sessions.set(server, { id, color });

    server.send(JSON.stringify({ type: "hello", id, color }));
    this.broadcastCount();

    server.addEventListener("message", (evt) => {
      let data;
      try {
        data = JSON.parse(evt.data);
      } catch (e) {
        return;
      }
      if (data.type !== "move") return;
      const meta = this.sessions.get(server);
      if (!meta) return;
      const x = Math.max(0, Math.min(1, Number(data.x)));
      const y = Math.max(0, Math.min(1, Number(data.y)));
      const payload = JSON.stringify({ type: "move", id: meta.id, color: meta.color, x, y });
      for (const s of this.sessions.keys()) {
        if (s !== server && s.readyState === 1) {
          try {
            s.send(payload);
          } catch (e) {}
        }
      }
    });

    const onClose = () => {
      const meta = this.sessions.get(server);
      this.sessions.delete(server);
      this.broadcastCount();
      if (meta) {
        const payload = JSON.stringify({ type: "leave", id: meta.id });
        for (const s of this.sessions.keys()) {
          try {
            s.send(payload);
          } catch (e) {}
        }
      }
    };
    server.addEventListener("close", onClose);
    server.addEventListener("error", onClose);

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcastCount() {
    const payload = JSON.stringify({ type: "count", count: this.sessions.size });
    for (const s of this.sessions.keys()) {
      try {
        s.send(payload);
      } catch (e) {}
    }
  }
}

// ── Analytics: lightweight event tracking + a private stats page ──
function countryFlag(cc) {
  if (!cc || cc.length !== 2) return "";
  const A = 127397;
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => c.charCodeAt(0) + A));
}

async function handleTrack(request, env, origin) {
  const headers = corsHeaders(origin);
  if (request.method !== "POST") return new Response("method not allowed", { status: 405, headers });
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
  }
  const event = String(body.event || "").slice(0, 40);
  if (!event) return new Response(JSON.stringify({ error: "missing event" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const key = meta.key ? String(meta.key).slice(0, 60) : "";
  const lang = String(body.lang || "").slice(0, 5);
  const country = request.cf?.country || "";
  const ref = String(body.ref || "").slice(0, 120);
  const device = /Mobi|Android|iPhone|iPad/i.test(request.headers.get("User-Agent") || "") ? "mobile" : "desktop";

  const raw = (await env.GUESTBOOK.get("stats:counts")) || "{}";
  const counts = JSON.parse(raw);
  counts.events = counts.events || {};
  counts.events[event] = (counts.events[event] || 0) + 1;
  if (key) {
    counts.byKey = counts.byKey || {};
    counts.byKey[event] = counts.byKey[event] || {};
    counts.byKey[event][key] = (counts.byKey[event][key] || 0) + 1;
  }
  if (lang) { counts.langs = counts.langs || {}; counts.langs[lang] = (counts.langs[lang] || 0) + 1; }
  if (country) { counts.countries = counts.countries || {}; counts.countries[country] = (counts.countries[country] || 0) + 1; }
  if (ref) { counts.referrers = counts.referrers || {}; counts.referrers[ref] = (counts.referrers[ref] || 0) + 1; }
  counts.devices = counts.devices || {};
  counts.devices[device] = (counts.devices[device] || 0) + 1;
  await env.GUESTBOOK.put("stats:counts", JSON.stringify(counts));

  const recentRaw = (await env.GUESTBOOK.get("stats:recent")) || "[]";
  const recent = JSON.parse(recentRaw);
  recent.push({ event, key, lang, country, device, ref, ts: Date.now() });
  while (recent.length > 300) recent.shift();
  await env.GUESTBOOK.put("stats:recent", JSON.stringify(recent));

  return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, "Content-Type": "application/json" } });
}

function statsRow(label, count, max) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return `<div class="row"><span class="label">${label}</span><div class="bar"><div class="fill" style="width:${pct}%"></div></div><span class="count">${count}</span></div>`;
}

async function handleStats(request, env) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== env.STATS_KEY) {
    return new Response("Forbidden — add ?key=... to the URL", { status: 403 });
  }
  const counts = JSON.parse((await env.GUESTBOOK.get("stats:counts")) || "{}");
  const recent = JSON.parse((await env.GUESTBOOK.get("stats:recent")) || "[]").slice().reverse().slice(0, 60);

  const projectOpens = counts.byKey?.project_open || {};
  const windowOpens = counts.byKey?.window_open || {};
  const maxProj = Math.max(1, ...Object.values(projectOpens));
  const maxWin = Math.max(1, ...Object.values(windowOpens));
  const maxCountry = Math.max(1, ...Object.values(counts.countries || {}));
  const maxLang = Math.max(1, ...Object.values(counts.langs || {}));
  const maxDevice = Math.max(1, ...Object.values(counts.devices || {}));
  const maxRef = Math.max(1, ...Object.values(counts.referrers || {}));

  const sortEntries = (obj) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portfolio Stats</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b0d12;color:#e8ecf3;margin:0;padding:32px 20px 80px;max-width:880px;margin-left:auto;margin-right:auto}
h1{font-size:22px;margin:0 0 4px}
.sub{color:rgba(255,255,255,.4);font-size:13px;margin-bottom:28px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.45);margin:32px 0 10px;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:8px}
.big{display:flex;gap:14px;flex-wrap:wrap}
.card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 20px;min-width:120px}
.card .n{font-size:26px;font-weight:700}
.card .l{font-size:11px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.row{display:flex;align-items:center;gap:10px;margin-bottom:7px;font-size:13px}
.row .label{width:130px;flex-shrink:0;color:rgba(255,255,255,.85);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar{flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden}
.bar .fill{height:100%;background:#0a84ff;border-radius:4px}
.row .count{width:34px;text-align:right;color:rgba(255,255,255,.5);font-variant-numeric:tabular-nums}
.feed{font-size:12px;color:rgba(255,255,255,.55);border-bottom:1px solid rgba(255,255,255,.06);padding:6px 0;display:flex;justify-content:space-between;gap:10px}
.feed b{color:#e8ecf3;font-weight:500}
.empty{color:rgba(255,255,255,.35);font-size:13px}
</style></head><body>
<h1>Portfolio Stats</h1>
<div class="sub">roman-portfolio-live · updated on every page load</div>

<div class="big">
  <div class="card"><div class="n">${counts.events?.view || 0}</div><div class="l">Page views</div></div>
  <div class="card"><div class="n">${Object.values(projectOpens).reduce((a, b) => a + b, 0)}</div><div class="l">Case opens</div></div>
  <div class="card"><div class="n">${counts.events?.cv_download || 0}</div><div class="l">CV downloads</div></div>
  <div class="card"><div class="n">${counts.events?.guestbook_post || 0}</div><div class="l">Guestbook posts</div></div>
</div>

<h2>Cases opened</h2>
${sortEntries(projectOpens).map(([k, c]) => statsRow(k, c, maxProj)).join("") || '<div class="empty">No data yet.</div>'}

<h2>Windows / apps opened</h2>
${sortEntries(windowOpens).map(([k, c]) => statsRow(k, c, maxWin)).join("") || '<div class="empty">No data yet.</div>'}

<h2>Countries</h2>
${sortEntries(counts.countries).slice(0, 12).map(([k, c]) => statsRow(countryFlag(k) + " " + k, c, maxCountry)).join("") || '<div class="empty">No data yet.</div>'}

<h2>Language</h2>
${sortEntries(counts.langs).map(([k, c]) => statsRow(k.toUpperCase(), c, maxLang)).join("") || '<div class="empty">No data yet.</div>'}

<h2>Device</h2>
${sortEntries(counts.devices).map(([k, c]) => statsRow(k, c, maxDevice)).join("") || '<div class="empty">No data yet.</div>'}

<h2>Top referrers</h2>
${sortEntries(counts.referrers).slice(0, 10).map(([k, c]) => statsRow(k || "(direct)", c, maxRef)).join("") || '<div class="empty">No data yet.</div>'}

<h2>Recent activity</h2>
${recent.map((e) => `<div class="feed"><span><b>${e.event}</b>${e.key ? " · " + e.key : ""} ${countryFlag(e.country)} ${e.device}</span><span>${new Date(e.ts).toLocaleString()}</span></div>`).join("") || '<div class="empty">No data yet.</div>'}

</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ── Guestbook: simple append-only list in KV ──
async function handleGuestbook(request, env, origin) {
  const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };

  if (request.method === "GET") {
    const raw = await env.GUESTBOOK.get("entries");
    const entries = raw ? JSON.parse(raw) : [];
    return new Response(JSON.stringify(entries.slice(-200).reverse()), { headers });
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers });
    }
    if (body.hp) {
      // honeypot field a real visitor never fills in — pretend success, drop silently
      return new Response(JSON.stringify({ ok: true }), { headers });
    }
    const name = String(body.name || "").trim().slice(0, 40);
    const message = String(body.message || "").trim().slice(0, 300);
    if (!name || !message) {
      return new Response(JSON.stringify({ error: "name and message required" }), { status: 400, headers });
    }
    const raw = await env.GUESTBOOK.get("entries");
    const entries = raw ? JSON.parse(raw) : [];
    entries.push({ name, message, ts: Date.now() });
    while (entries.length > 500) entries.shift();
    await env.GUESTBOOK.put("entries", JSON.stringify(entries));
    const countsRaw = (await env.GUESTBOOK.get("stats:counts")) || "{}";
    const counts = JSON.parse(countsRaw);
    counts.events = counts.events || {};
    counts.events.guestbook_post = (counts.events.guestbook_post || 0) + 1;
    await env.GUESTBOOK.put("stats:counts", JSON.stringify(counts));
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  return new Response("method not allowed", { status: 405, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === "/ws") {
      const id = env.CURSOR_ROOM.idFromName("global");
      const stub = env.CURSOR_ROOM.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === "/guestbook") {
      return handleGuestbook(request, env, origin);
    }

    if (url.pathname === "/track") {
      return handleTrack(request, env, origin);
    }

    if (url.pathname === "/stats") {
      return handleStats(request, env);
    }

    return new Response("not found", { status: 404, headers: corsHeaders(origin) });
  },
};
