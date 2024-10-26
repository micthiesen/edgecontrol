import { z } from "zod";

const dnsRegex = /(?:dns|name)-server\s+([\d.]+)/g;
const dnsSchema = z
  .string()
  .transform((text) => Array.from(text.matchAll(dnsRegex)).map((match) => match[1]))
  .pipe(z.tuple([z.string().ip({ version: "v4" }), z.string().ip({ version: "v4" })]));

export function parseDnsServers(text: string): [string, string] {
  return dnsSchema.parse(text);
}
