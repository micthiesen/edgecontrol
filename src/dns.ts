import env from "./env";
import { sendNotification, type PushoverMessage } from "./notify";
import { parseDnsServers } from "./parsing";
import { withSshConnection, type SNodeSSH } from "./ssh";
import { arrayItemsEqual } from "./utils";

let timeoutId: NodeJS.Timeout | null = null;
export const RESTORE_DELAY_MINUTES = 2;
const RESTORE_DELAY = 1000 * 60 * RESTORE_DELAY_MINUTES;

export async function toggleDns(ssh: SNodeSSH) {
  if (timeoutId) clearTimeout(timeoutId);

  console.log("Setting alternative DNS servers...");
  await setDnsServers(ssh, env.SECONDARY_DNS_SERVERS);

  timeoutId = setTimeout(restoreDnsServers, RESTORE_DELAY);
  console.log(`Scheduled restore in ${RESTORE_DELAY}ms`);
}

export async function validateDns(ssh: SNodeSSH): Promise<PushoverMessage> {
  console.log("Validating DNS servers...");
  const currentDnsServers = await getDnsServers(ssh);
  console.log(`DNS servers are set to ${currentDnsServers}`);

  if (arrayItemsEqual(currentDnsServers, env.PRIMARY_DNS_SERVERS)) {
    return {
      title: "DNS servers are valid",
      message: `Servers: ${currentDnsServers.join(", ")}`,
    };
  } else {
    await setDnsServers(ssh, env.PRIMARY_DNS_SERVERS);
    console.log(`DNS servers restored to ${env.PRIMARY_DNS_SERVERS}`);
    return {
      title: "DNS servers restored",
      message: `Servers: ${currentDnsServers.join(", ")}`,
    };
  }
}

async function restoreDnsServers() {
  try {
    console.log("Restoring original DNS servers...");
    await withSshConnection(async (ssh) => {
      await setDnsServers(ssh, env.PRIMARY_DNS_SERVERS);
    });
    await sendNotification({
      title: "NextDNS re-enabled",
      message: `Restored after ${RESTORE_DELAY_MINUTES} minutes`,
    });
  } catch (err) {
    console.error(`Failed to restore DNS servers: ${err}`);
  }
}

async function getDnsServers(ssh: SNodeSSH) {
  const dnsServers = await ssh.execSafe("cat /config/config.boot | grep 'name-server'");
  return parseDnsServers(dnsServers);
}

async function setDnsServers(ssh: SNodeSSH, dns: [string, string]) {
  console.log(`Setting DNS servers to ${dns}`);
  await ssh.configure([
    "delete service dns forwarding name-server",
    ...dns.map((d) => `set service dns forwarding name-server ${d}`),
  ]);
}
