import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import { NodeSSH } from "node-ssh";
import { z } from "zod";

const env = z
  .object({
    PUSHOVER_USER: z.string(),
    PUSHOVER_TOKEN: z.string(),
    SSH_USERNAME: z.string(),
    SSH_PASSWORD: z.string(),
    ROUTER_HOSTNAME: z.string().ip({ version: "v4" }),
  })
  .parse(process.env);

const app = new Hono<{ Bindings: HttpBindings }>();

app.get("/toggle-dns", async (c) => {
  const ssh = new NodeSSH();
  await ssh.connect({
    hostname: env.ROUTER_HOSTNAME,
    username: env.SSH_USERNAME,
    password: env.SSH_PASSWORD,
  });

  const resp = c.text("Hono meets Node.js");
  console.log(`${c.env.incoming.method} ${c.env.incoming.url}`);
  return resp;
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
