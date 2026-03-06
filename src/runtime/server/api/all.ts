import {
  createError,
  defineEventHandler,
  getQuery,
  sendRedirect,
  setResponseHeaders,
} from "h3";
import { useRuntimeConfig } from "#imports";
import { proxyToAPI } from "../../utils/server/proxy";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const OAUTH_PROVIDERS = ["google", "facebook", "github"];
const OAUTH_INIT_PATTERN = new RegExp(`/auth/(${OAUTH_PROVIDERS.join("|")})(?:/|$|\\?)`);

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, CORS_HEADERS);

  if (event.method === 'OPTIONS') {
    return '';
  }

  const path = (event.path || event.node?.req?.url || "").split("?")[0];
  const oauthMatch = path.match(OAUTH_INIT_PATTERN);
  if (event.method === "GET" && oauthMatch) {
    const provider = oauthMatch[1];
    const query = getQuery(event);
    const redirectParam = query.redirect as string;
    if (!redirectParam) {
      throw createError({ statusCode: 400, message: "Redirect URL is required" });
    }
    const config = useRuntimeConfig();
    const apiUrl = config.public?.enfyraSDK?.apiUrl;
    if (!apiUrl) {
      throw createError({ statusCode: 500, message: "API URL not configured" });
    }
    const backendUrl = `${apiUrl.replace(/\/+$/, "")}/auth/${provider}?redirect=${encodeURIComponent(redirectParam)}`;
    const response = await fetch(backendUrl, { redirect: "manual" });
    const location = response.headers.get("location") || response.headers.get("Location");
    if (location && response.status >= 300 && response.status < 400) {
      return sendRedirect(event, location, 302);
    }
    throw createError({ statusCode: 502, message: "Failed to get OAuth URL from backend" });
  }

  return proxyToAPI(event);
});
