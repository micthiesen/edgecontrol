import { z } from "zod";

const dnsSchema = z
  .string()
  .transform((v) => v.split(","))
  .pipe(z.tuple([z.string().ip({ version: "v4" }), z.string().ip({ version: "v4" })]));

const env = z
  .object({
    AUTH_TOKEN: z.string(),
    PUSHOVER_USER: z.string(),
    PUSHOVER_TOKEN: z.string(),
    SSH_USERNAME: z.string(),
    SSH_PASSWORD: z.string(),
    ROUTER_HOSTNAME: z.string().ip({ version: "v4" }),
    PRIMARY_DNS_SERVERS: dnsSchema,
    SECONDARY_DNS_SERVERS: dnsSchema,
  })
  .parse(process.env);
export default env;
