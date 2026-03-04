import {
  defineEventHandler,
  getQuery,
  createError,
  sendError,
  sendRedirect,
} from "h3";
import { useRuntimeConfig } from "#imports";
import { normalizeUrl } from "../../../utils/url";

const VALID_PROVIDERS = ["google", "facebook", "github"];

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.enfyraSDK?.apiUrl;
  const provider = event.context.params?.provider;

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        statusMessage: `Invalid OAuth provider: ${provider}`,
      })
    );
  }

  const query = getQuery(event);
  const redirectUrl = query.redirect as string | undefined;

  // Build backend OAuth URL
  let oauthUrl = normalizeUrl(apiUrl, `/auth/${provider}`);
  if (redirectUrl) {
    oauthUrl += `?redirect=${encodeURIComponent(redirectUrl)}`;
  }

  return sendRedirect(event, oauthUrl, 302);
});
