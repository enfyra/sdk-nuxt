import { H3Event, proxyRequest } from "h3";
import { useRuntimeConfig } from "#imports";
import { ENFYRA_API_PREFIX } from "../../constants/config";
import { normalizeUrl } from "../url";

export function proxyToAPI(event: H3Event, customPath?: string) {
  const config = useRuntimeConfig();
  const apiPrefix = config.public?.enfyraSDK?.apiPrefix || ENFYRA_API_PREFIX;
  const rawPath =
    customPath || event.path.replace(new RegExp(`^${apiPrefix}`), "");
  const targetUrl = normalizeUrl(config.public?.enfyraSDK?.apiUrl, rawPath);

  const headers = event.context.proxyHeaders || {};

  return proxyRequest(event, targetUrl, {
    headers,
  });
}
