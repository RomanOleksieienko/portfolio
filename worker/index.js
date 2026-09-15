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

    return new Response("not found", { status: 404, headers: corsHeaders(origin) });
  },
};
