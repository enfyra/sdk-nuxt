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

  if (!accessToken || !refreshToken || !expTime) {
    return sendRedirect(event, "/login?error=oauth_callback_failed");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  };

  setCookie(event, ACCESS_TOKEN_KEY, accessToken as string, cookieOptions);
  setCookie(event, REFRESH_TOKEN_KEY, refreshToken as string, cookieOptions);
  setCookie(event, EXP_TIME_KEY, expTime as string, cookieOptions);

  const redirectUrl = (redirect as string) || "/";
  return sendRedirect(event, redirectUrl);
});
