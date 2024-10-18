import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import { toggleDns } from "./dns";
import { getSshConnection, type SNodeSSH } from "./ssh";

const app = new Hono<{ Bindings: HttpBindings }>();

app.get("/toggle-dns", async (c) => {
  console.log(`${c.env.incoming.method} ${c.env.incoming.url}`);

  let ssh: SNodeSSH | undefined;
  try {
    ssh = await getSshConnection();
    await toggleDns(ssh);
    return c.text("DNS servers toggled");
  } catch (err: any) {
    return c.text(`Error: ${err.message}`);
  } finally {
    if (ssh) ssh.dispose();
  }
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`\nListening on http://localhost:${info.port}`);
});
