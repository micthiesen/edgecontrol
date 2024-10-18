import { NodeSSH } from "node-ssh";
import env from "./env";

export type SNodeSSH = NodeSSH & {
  execSafe: (command: string) => Promise<string>;
  configure: (commands: string[]) => Promise<string>;
};

export async function getSshConnection(): Promise<SNodeSSH> {
  const ssh = new NodeSSH() as SNodeSSH;
  await ssh.connect({
    host: env.ROUTER_HOSTNAME,
    username: env.SSH_USERNAME,
    password: env.SSH_PASSWORD,
    tryKeyboard: false,
  });
  ssh.execSafe = async (command: string) => {
    console.log(`>>> ${command}`);
    const result = await ssh.execCommand(command);
    if (result.stderr) console.warn(prefixBar(result.stderr));
    if (result.stderr) throw new Error(`Error executing command: ${result.stderr}`);
    if (result.stdout) console.log(prefixBar(result.stdout));
    return result.stdout;
  };
  ssh.configure = async (commands: string[]) => {
    for (const command of commands) console.log(`>>> ${command}`);
    const result = await configure(ssh, commands);
    if (result.stderr) console.warn(prefixBar(result.stderr));
    if (result.stderr) throw new Error(`Error executing command: ${result.stderr}`);
    if (result.stdout) console.log(prefixBar(result.stdout));
    return result.stdout;
  };

  return ssh;
}

async function configure(
  ssh: SNodeSSH,
  commands: string[],
): Promise<{ stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";

  await ssh.withShell(async (channel) => {
    return new Promise<void>((resolve, reject) => {
      channel.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      channel.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      channel.on("close", () => {
        resolve();
      });

      channel.on("error", (err: any) => {
        reject(err);
      });

      channel.write(`configure\n${commands.join("\n")}\ncommit\nsave\nexit\nexit\n`);
    });
  });

  return { stdout: extractCommandOutput(stdout), stderr };
}

const shellOutputRegex = /(?<=@ubnt:~\$.+\n)([\s\S]+?)(?=\n.+@ubnt:~\$ exit)/gims;
function extractCommandOutput(fullOutput: string): string {
  const matches = fullOutput.match(shellOutputRegex);
  if (!matches) return "";
  const lines = matches.map(cleanLine);
  return lines.join("\n");
}

function cleanLine(line: string): string {
  return line.replace(/\x1B\[[0-9;]*[a-zA-Z]|\x1B\[[0-9;]*m/g, "").trim();
}

function prefixBar(text: string): string {
  return text.replace(/^/gm, "| ");
}
