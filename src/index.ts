import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { timeout } from "hono/timeout";
import { toggleDns, validateDns } from "./dns";
import { withSshConnection } from "./ssh";

const app = new Hono<{ Bindings: HttpBindings }>();
app.use(logger(), timeout(10000));
app.onError(async (err, ctx) => {
  return ctx.text(`Error: ${err.message}`);
});

app.get("/dns/toggle", async (ctx) => {
  return withSshConnection(async (ssh) => {
    await toggleDns(ssh);
    return ctx.text("DNS servers toggled");
  });
});

app.get("/dns/validate", async (ctx) => {
  return withSshConnection(async (ssh) => {
    const dnsServers = await validateDns(ssh);
    return ctx.text(dnsServers.toString());
  });
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
