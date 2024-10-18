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

let timeoutId: NodeJS.Timeout | null = null;
const DEFERRED_TIMEOUT_MS = 1000 * 5;

app.get("/toggle-dns", async (c) => {
  if (timeoutId) clearTimeout(timeoutId);

  console.log(`${c.env.incoming.method} ${c.env.incoming.url}`);

  const ssh = new NodeSSH();
  await ssh.connect({
    host: env.ROUTER_HOSTNAME,
    username: env.SSH_USERNAME,
    password: env.SSH_PASSWORD,
    tryKeyboard: false,
  });

  const result = await ssh.execCommand("cat /config/config.boot | grep 'dns-server'");
  if (result.stderr) return c.text(`Error: ${result.stderr}`);

  timeoutId = setTimeout(async () => {
    console.log("Restoring original DNS servers...");
  }, DEFERRED_TIMEOUT_MS);

  const originalDnsServers = extractDnsServers(result.stdout);
  console.log(`Found existing DNS servers: ${originalDnsServers}`);

  const resp = c.text("Hono meets Node.js");
  return resp;
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});

function extractDnsServers(text: string): [string, string] {
  const dnsRegex = /dns-server\s+([\d.]+)/g;
  const matches = Array.from(text.matchAll(dnsRegex)).map((match) => match[1]);

  if (matches.length === 2) return [matches[0], matches[1]];

  throw new Error(`Could not extract DNS servers: ${text}`);
}
