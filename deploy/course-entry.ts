// The course portal provisions one Cloud Run service for each team. Pockit has
// separate API and SSR web processes, so this process exposes one public port
// and forwards requests to the two private listeners in the same container.
const apiPort = 3002;
const webPort = 3001;
const publicPort = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(publicPort) || publicPort < 1 || publicPort > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

const spawnApp = (directory: string, entry: string, port: number) =>
  Bun.spawn([process.execPath, entry], {
    cwd: `/app/apps/${directory}`,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
    },
    stdout: "inherit",
    stderr: "inherit",
  });

const api = spawnApp("server", "dist/index.mjs", apiPort);
const web = spawnApp("web", ".output/server/index.mjs", webPort);

const gateway = Bun.serve({
  hostname: "0.0.0.0",
  port: publicPort,
  async fetch(request) {
    const target = new URL(request.url);
    const isApi =
      target.pathname === "/api" ||
      target.pathname.startsWith("/api/") ||
      target.pathname === "/trpc" ||
      target.pathname.startsWith("/trpc/");
    target.protocol = "http:";
    target.hostname = "127.0.0.1";
    target.port = String(isApi ? apiPort : webPort);

    try {
      return await fetch(new Request(target, request), { redirect: "manual" });
    } catch (error) {
      console.error("Private application listener unavailable", error);
      return new Response("Service unavailable", { status: 503 });
    }
  },
});

let stopping = false;
function stop(exitCode: number) {
  if (stopping) return;
  stopping = true;
  gateway.stop(true);
  api.kill();
  web.kill();
  process.exitCode = exitCode;
}

process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));

void api.exited.then((code) => {
  if (!stopping) {
    console.error(`API process exited with status ${code}`);
    stop(1);
  }
});
void web.exited.then((code) => {
  if (!stopping) {
    console.error(`Web process exited with status ${code}`);
    stop(1);
  }
});
