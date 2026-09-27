export function connect({ onHello, onJoin, onLeave, onState, onStatus, onRooms, onMatch, onHit, onDown, onRespawn }) {
  let ws = null;
  let alive = false;
  let timer = 0;
  let lastJoin = { room: "hangar", name: "pilot", drone: "whoop" };
  let pending = null;

  function status(s) {
    onStatus?.(s);
  }

  function flushJoin() {
    if (!alive || !ws || ws.readyState !== 1) return;
    const j = pending || lastJoin;
    pending = null;
    ws.send(JSON.stringify({ t: "join", ...j }));
  }

  function open() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      alive = true;
      status("bağlandı");
      flushJoin();
    };
    ws.onclose = () => {
      alive = false;
      status("koptu — tekrar denenecek");
      clearTimeout(timer);
      timer = setTimeout(open, 1500);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.t === "hello") onHello?.(msg);
      if (msg.t === "join") onJoin?.(msg);
      if (msg.t === "leave") onLeave?.(msg);
      if (msg.t === "state") onState?.(msg);
      if (msg.t === "full") status("oda dolu");
      if (msg.t === "rooms") onRooms?.(msg.list || []);
      // Team deathmatch: the server owns HP, deaths, scores and the clock.
      if (msg.t === "match") onMatch?.(msg);
      if (msg.t === "hit") onHit?.(msg);
      if (msg.t === "down") onDown?.(msg);
      if (msg.t === "respawn") onRespawn?.(msg);
    };
  }

  open();

  return {
    join(room, name, drone) {
      lastJoin = {
        room: room || "hangar",
        name: name || "pilot",
        drone: drone || "whoop",
      };
      if (!alive || !ws || ws.readyState !== 1) {
        pending = lastJoin;
        return;
      }
      ws.send(JSON.stringify({ t: "join", ...lastJoin }));
    },
    sendStart(opId, opName) {
      if (!alive || !ws || ws.readyState !== 1) return;
      ws.send(JSON.stringify({ t: "start", opId, opName }));
    },
    sendResult(opId, opName, won, seconds, laps, { ranked = true } = {}) {
      if (!alive || !ws || ws.readyState !== 1) return;
      const msg = { t: "result", opId, opName, won: !!won, seconds, ranked: ranked !== false };
      if (Array.isArray(laps) && laps.length) msg.laps = laps.map((v) => Math.round(v * 100) / 100);
      ws.send(JSON.stringify(msg));
    },
    sendState(s, fire = 0) {
      if (!alive || ws.readyState !== 1) return;
      ws.send(
        JSON.stringify({
          t: "state",
          x: s.x,
          y: s.y,
          z: s.z,
          qw: s.qw,
          qx: s.qx,
          qy: s.qy,
          qz: s.qz,
          thr: s.throttleOut,
          fire: fire ? 1 : 0,
        }),
      );
    },
    /** My shot reached that pilot — the server decides whether it counts. */
    sendHit(to) {
      if (!alive || !ws || ws.readyState !== 1 || !to) return;
      ws.send(JSON.stringify({ t: "hit", to }));
    },
    close() {
      clearTimeout(timer);
      ws?.close();
    },
  };
}
