import env from "./env";
import { parseDnsServers } from "./parsing";
import { getSshConnection, type SNodeSSH } from "./ssh";

let timeoutId: NodeJS.Timeout | null = null;
const RESTORE_DELAY = 1000 * 5;

export async function toggleDns(ssh: SNodeSSH) {
  if (timeoutId) clearTimeout(timeoutId);

  const originalDnsServers = parseDnsServers(
    await ssh.execSafe("cat /config/config.boot | grep 'dns-server'"),
  );
  console.log(`Found existing DNS servers: ${originalDnsServers}`);

  console.log("Setting alternative DNS servers...");
  await setDnsServers(ssh, env.SECONDARY_DNS_SERVERS);

  timeoutId = setTimeout(restoreDnsServers, RESTORE_DELAY);
  console.log(`Scheduled restore in ${RESTORE_DELAY}ms`);
}

async function restoreDnsServers() {
  console.log("Restoring original DNS servers...");
  let ssh: SNodeSSH | undefined;
  try {
    ssh = await getSshConnection();
    await setDnsServers(ssh, env.PRIMARY_DNS_SERVERS);
  } finally {
    if (ssh) ssh.dispose();
  }
}

async function setDnsServers(ssh: SNodeSSH, dns: [string, string]) {
  console.log(`Setting DNS servers to ${dns}`);
  await ssh.shellSafe("show service dns forwarding");
  // ssh.execCommand(`configure set service dns forwarding name-server ${dns[0]}`);
  // ssh.execCommand(`configure set service dns forwarding name-server ${dns[1]}`);
}
