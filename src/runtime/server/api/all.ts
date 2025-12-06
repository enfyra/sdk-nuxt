import { defineEventHandler } from "h3";
import { proxyToAPI } from "../../utils/server/proxy";

export default defineEventHandler(async (event) => {
  return proxyToAPI(event);
});
