import { NodeSSH } from "node-ssh";
import env from "./env";

export type SNodeSSH = NodeSSH & {
  execSafe: (command: string) => Promise<string>;
  shellSafe: (command: string) => Promise<string>;
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
  ssh.shellSafe = async (command: string) => {
    console.log(`>>> ${command}`);
    const result = await withShell(ssh, command);
    if (result.stderr) console.warn(prefixBar(result.stderr));
    if (result.stderr) throw new Error(`Error executing command: ${result.stderr}`);
    if (result.stdout) console.log(prefixBar(result.stdout));
    return result.stdout;
  };

  await ssh.execSafe("export PS1=true​");
  await ssh.execSafe("export _OFR_CONFIGURE=ok​");
  await ssh.execSafe("source ~/.bashrc");
  await ssh.execSafe("alias");

  return ssh;
}

async function withShell(
  ssh: SNodeSSH,
  command: string,
): Promise<{ stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";

  await ssh.withShell(
    async (channel) => {
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

        channel.write(`${command}\nexit\n`);
      });
    },
    {
      modes: {
        ECHO: 1, // Enable echoing
        ICANON: 1, // Enable canonical input
        ISIG: 1, // Enable signals like INTR, QUIT, SUSP
        IEXTEN: 1, // Enable extensions
        OPOST: 1, // Enable output processing
        ONLCR: 1, // Translate newline to CR-NL
        TTY_OP_ISPEED: 9600, // Input baud rate
        TTY_OP_OSPEED: 9600, // Output baud rate
      },
    },
  );

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
