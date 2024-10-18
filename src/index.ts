import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono<{ Bindings: HttpBindings }>();

app.get("/", (c) => {
  const resp = c.text("Hono meets Node.js");
  console.log(`${c.env.incoming.method} ${c.env.incoming.url}`);
  return resp;
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
