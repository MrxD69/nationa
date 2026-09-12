import { publicProcedure } from "../builders";

export const healthRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
};
