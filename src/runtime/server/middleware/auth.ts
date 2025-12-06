import { defineEventHandler, getCookie } from "h3";
import { useRuntimeConfig } from "#imports";
import {
  validateTokens,
  refreshAccessToken,
} from "../../utils/server/refreshToken";
import { REFRESH_TOKEN_KEY } from "../../constants/auth";

export default defineEventHandler(async (event) => {
  if (
    event.node.req.url === "/api/login" ||
    event.node.req.url === "/api/logout"
  ) {
    return;
  }

  const { accessToken, needsRefresh } = validateTokens(event);

  let currentAccessToken: string | null = accessToken;

  if (needsRefresh) {
    const refreshToken = getCookie(event, REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        const config = useRuntimeConfig();
        const apiUrl = config.public?.enfyraSDK?.apiUrl;
        if (apiUrl) {
          currentAccessToken = await refreshAccessToken(
            event,
            refreshToken,
            apiUrl
          );
        }
      } catch (error) {
        currentAccessToken = null;
      }
    }
  }

  if (currentAccessToken) {
    event.context.proxyHeaders = event.context.proxyHeaders || {};
    event.context.proxyHeaders.authorization = `Bearer ${currentAccessToken}`;
  }
});
