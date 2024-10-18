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
export default env;
