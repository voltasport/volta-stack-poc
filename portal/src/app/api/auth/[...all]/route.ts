import {toNextJsHandler} from "better-auth/next-js";
import {getAuth} from "@/lib/auth";

const handler = (request: Request) => {
  const auth = getAuth();
  return auth.handler(request);
};

export {handler as GET, handler as POST};
