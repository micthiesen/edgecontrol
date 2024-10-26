import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { timeout } from "hono/timeout";
import { RESTORE_DELAY_MINUTES, toggleDns, validateDns } from "./dns.js";
import env from "./env.js";
import { sendNotification } from "./notify.js";
import { withSshConnection } from "./ssh.js";

const app = new Hono<{ Bindings: HttpBindings }>();
app.use(logger(), timeout(15000));
app.use(async (ctx, next) => {
  const token = ctx.req.query("token");
  if (token !== env.AUTH_TOKEN) return ctx.text("Unauthorized", 401);
  return next();
});
app.onError(async (err, ctx) => {
  return ctx.text(`Error: ${err.message}`);
});

app.get("/dns/toggle", async (ctx) => {
  return withSshConnection(async (ssh) => {
    await toggleDns(ssh);
    await sendNotification({
      title: "NextDNS temporarily disabled",
      message: `It will be restored in ${RESTORE_DELAY_MINUTES} minutes`,
    });
    return ctx.text("DNS servers toggled");
  });
});

app.get("/dns/validate", async (ctx) => {
  return withSshConnection(async (ssh) => {
    const message = await validateDns(ssh);
    await sendNotification(message);
    return ctx.text(message.title);
  });
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
