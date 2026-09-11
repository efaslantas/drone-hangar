import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { attachRooms } from "./rooms.mjs";
import { handleApi } from "./api.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT || 8780);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".gltf": "model/gltf+json",
  ".glb": "model/gltf-binary",
  ".bin": "application/octet-stream",
};

const wss = new WebSocketServer({ noServer: true });
attachRooms(wss);

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/") && handleApi(req, res, wss)) return;
  const urlPath = decodeURIComponent(req.url?.split("?")[0] || "/");
  let file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, "index.html");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const isHtml = path.extname(file) === ".html";
    // index/admin/leaderboard.html reference content-hashed asset filenames, so a
    // stale cached HTML (mobile browsers can hold onto this for a long time) keeps
    // pointing at bundles this deploy already replaced. Force a revalidate on the
    // shell; the hashed /assets/* files below are safe to cache forever since a
    // content change always gets a new filename.
    const cacheControl = isHtml
      ? "no-cache"
      : path.dirname(file).endsWith(`${path.sep}assets`)
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
    res.writeHead(200, {
      "content-type": types[path.extname(file)] || "application/octet-stream",
      "cache-control": cacheControl,
    });
    res.end(data);
  });
});

server.on("upgrade", (req, socket, head) => {
  if (req.url?.split("?")[0] !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`drone-hangar http://0.0.0.0:${port}`);
});
