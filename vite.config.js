import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
        leaderboard: fileURLToPath(new URL("./leaderboard.html", import.meta.url)),
      },
      output: {
        // three.module.js (WebGL path, in the main chunk) and three.webgpu.js
        // (lazy gfx-webgpu chunk) both import three.core.js. Left to Rollup the
        // core lands in the main entry chunk, the WebGPU chunk then imports main,
        // and main's top-level `await import()` of that chunk deadlocks (module
        // cycle with TLA — the page never boots). Give the shared core its own
        // chunk so the lazy chunk never depends on the entry.
        manualChunks(id) {
          if (id.includes("/three/build/three.core.js")) return "three-core";
          if (id.includes("/three/build/three.webgpu.js") || id.includes("/three/build/three.tsl.js")) return "three-webgpu";
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 5173,
  },
  plugins: [
    {
      name: "drone-hangar-rooms",
      async configureServer(server) {
        // Keep server state and credentials out of production builds.
        const [{ WebSocketServer }, { attachRooms }, { handleApi }] = await Promise.all([
          import("ws"),
          import("./server/rooms.mjs"),
          import("./server/api.mjs"),
        ]);
        const wss = new WebSocketServer({ noServer: true });
        attachRooms(wss);
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/api/") && handleApi(req, res, wss)) return;
          next();
        });
        server.httpServer?.on("upgrade", (req, socket, head) => {
          const path = req.url?.split("?")[0];
          if (path !== "/ws") return;
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        });
      },
    },
  ],
});
