import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import { NodeSSH } from "node-ssh";
import { z } from "zod";

type SNodeSSH = NodeSSH & {
  execSafe: (command: string) => Promise<string>;
};

const ALT_DNS_SERVERS: [string, string] = ["1.1.1.1", "1.0.0.1"];

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
const RESTORE_DELAY = 1000 * 5;

app.get("/toggle-dns", async (c) => {
  if (timeoutId) clearTimeout(timeoutId);
  console.log(`${c.env.incoming.method} ${c.env.incoming.url}`);

  let ssh: SNodeSSH | undefined;
  try {
    ssh = await getSshConnection();
    const result = await ssh.execSafe("show");
    return c.text(`Resp: ${result}`);
    if (result.stderr) return c.text(`Error: ${result.stderr}`);

    const originalDnsServers = extractDnsServers(result.stdout);
    console.log(`Found existing DNS servers: ${originalDnsServers}`);

    console.log("Setting alternative DNS servers...");
    await setDnsServers(ssh, ALT_DNS_SERVERS);

    timeoutId = setTimeout(genRestoreDnsServers(originalDnsServers), RESTORE_DELAY);
    console.log(`Scheduled restore in ${RESTORE_DELAY}ms`);

    const resp = c.text("Hono meets Node.js");
    return resp;
  } catch (err: any) {
    return c.text(`Error: ${err.message}`);
  } finally {
    if (ssh) ssh.dispose();
  }
});

serve({ fetch: app.fetch, port: 5888 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});

function genRestoreDnsServers(originalDnsServers: [string, string]) {
  return async () => {
    console.log("Restoring original DNS servers...");
    let ssh: SNodeSSH | undefined;
    try {
      ssh = await getSshConnection();
      await setDnsServers(ssh, originalDnsServers);
    } finally {
      if (ssh) ssh.dispose();
    }
  };
}

async function setDnsServers(ssh: SNodeSSH, dns: [string, string]) {
  console.log(`Setting DNS servers to ${dns}`);
  // ssh.execCommand(`configure set service dns forwarding name-server ${dns[0]}`);
  // ssh.execCommand(`configure set service dns forwarding name-server ${dns[1]}`);
}

async function getSshConnection(): Promise<SNodeSSH> {
  const ssh = new NodeSSH() as SNodeSSH;
  await ssh.connect({
    host: env.ROUTER_HOSTNAME,
    username: env.SSH_USERNAME,
    password: env.SSH_PASSWORD,
    tryKeyboard: false,
  });
  ssh.execSafe = async (command: string) => {
    console.log(command);
    const result = await ssh.execCommand(command);
    if (result.stderr) console.warn(result.stderr);
    if (result.stderr) throw new Error(`Error executing command: ${result.stderr}`);
    if (result.stdout) console.log(result.stdout);
    return result.stdout;
  };

  await ssh.execSafe("export PS1=true​");
  await ssh.execSafe("export _OFR_CONFIGURE=ok​");
  await ssh.execSafe("source ~/.bashrc");
  await ssh.execSafe("alias");

  return ssh;
}

function extractDnsServers(text: string): [string, string] {
  const dnsRegex = /dns-server\s+([\d.]+)/g;
  const matches = Array.from(text.matchAll(dnsRegex)).map((match) => match[1]);

  if (matches.length === 2) return [matches[0], matches[1]];

  throw new Error(`Could not extract DNS servers: ${text}`);
}

async function execSafe(ssh: NodeSSH, command: string) {
  const result = ssh.execCommand(command);
  if (result.stderr) throw new Error(`Error executing command: ${result.stderr}`);
  return result.stdout;
}
