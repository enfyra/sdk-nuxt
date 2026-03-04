import {
  defineEventHandler,
  getQuery,
  sendRedirect,
} from "h3";
import { useRuntimeConfig } from "#imports";
import { normalizeUrl } from "../../../../utils/url";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.enfyraSDK?.apiUrl;
  const provider = event.context.params?.provider;

  const query = getQuery(event);
  const queryString = new URLSearchParams(query as Record<string, string>).toString();

  // Redirect to backend OAuth callback
  const backendUrl = normalizeUrl(apiUrl, `/auth/${provider}/callback?${queryString}`);

  return sendRedirect(event, backendUrl, 302);
});
