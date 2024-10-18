import { parseDnsServers } from "./parsing";
import { getSshConnection, type SNodeSSH } from "./ssh";

let timeoutId: NodeJS.Timeout | null = null;
const RESTORE_DELAY = 1000 * 5;

const ALT_DNS_SERVERS: [string, string] = ["1.1.1.1", "1.0.0.1"];

export async function toggleDns(ssh: SNodeSSH) {
  if (timeoutId) clearTimeout(timeoutId);

  const originalDnsServers = parseDnsServers(await ssh.execSafe("show"));
  console.log(`Found existing DNS servers: ${originalDnsServers}`);

  console.log("Setting alternative DNS servers...");
  await setDnsServers(ssh, ALT_DNS_SERVERS);

  timeoutId = setTimeout(genRestoreDnsServers(originalDnsServers), RESTORE_DELAY);
  console.log(`Scheduled restore in ${RESTORE_DELAY}ms`);
}

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
