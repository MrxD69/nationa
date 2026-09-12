import { userProcedure } from "../builders";
import { getSession } from "../services/session.service";

export const sessionRouter = {
  get: userProcedure.handler(({ context }) => getSession(context)),
};
