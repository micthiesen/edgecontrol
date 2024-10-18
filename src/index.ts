import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import ssh from "ssh2";
import { z } from "zod";

ssh.createAgent(socketPath);

const env = z
  .object({
    PUSHOVER_USER: z.string(),
    PUSHOVER_TOKEN: z.string(),
  })
  .parse(process.env);

const app = new Hono<{ Bindings: HttpBindings }>();

app.get("/toggle-dns", (c) => {
  const resp = c.text("Hono meets Node.js");
  console.log(`${c.env.incoming.method} ${c.env.incoming.url}`);
  return resp;
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
