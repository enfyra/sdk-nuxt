import {
  defineEventHandler,
  getQuery,
  setCookie,
  sendRedirect,
} from "h3";
import { useRuntimeConfig } from "#imports";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  EXP_TIME_KEY,
} from "../../../constants/auth";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const { accessToken, refreshToken, expTime, redirect } = query;

  // Validate required tokens
  if (!accessToken || !refreshToken || !expTime) {
    return sendRedirect(event, "/login?error=oauth_callback_failed");
  }

  // Set cookies (same as login.post.ts)
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  };

  setCookie(event, ACCESS_TOKEN_KEY, accessToken as string, cookieOptions);
  setCookie(event, REFRESH_TOKEN_KEY, refreshToken as string, cookieOptions);
  setCookie(event, EXP_TIME_KEY, expTime as string, cookieOptions);

  // Redirect to original page or home
  const redirectUrl = (redirect as string) || "/";
  return sendRedirect(event, redirectUrl);
});
