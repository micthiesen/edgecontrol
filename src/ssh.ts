import { NodeSSH } from "node-ssh";
import env from "./env";

export type SNodeSSH = NodeSSH & {
  execSafe: (command: string) => Promise<string>;
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
    if (result.stderr) console.warn(prefixCaret(result.stderr));
    if (result.stderr) throw new Error(`Error executing command: ${result.stderr}`);
    if (result.stdout) console.log(prefixCaret(result.stdout));
    return result.stdout;
  };

  await ssh.execSafe("export PS1=true​");
  await ssh.execSafe("export _OFR_CONFIGURE=ok​");
  await ssh.execSafe("source ~/.bashrc");
  await ssh.execSafe("alias");

  return ssh;
}

function prefixCaret(text: string): string {
  return text.replace(/^/gm, "> ");
}
