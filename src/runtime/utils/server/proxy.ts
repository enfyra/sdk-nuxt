import { H3Event, proxyRequest } from "h3";
import { createProxy } from "http-proxy";
import { useRuntimeConfig } from "#imports";
import { ENFYRA_API_PREFIX } from "../../constants/config";
import { normalizeUrl } from "../url";

// Create WebSocket proxy instance (reuse for performance)
const wsProxy = createProxy({
  target: process.env.API_URL || 'http://localhost:1105',
  ws: true,
  changeOrigin: true,
});

export function proxyToAPI(event: H3Event, customPath?: string) {
  const config = useRuntimeConfig();
  const apiPrefix = config.public?.enfyraSDK?.apiPrefix || ENFYRA_API_PREFIX;
  const rawPath =
    customPath || event.path.replace(new RegExp(`^${apiPrefix}`), "");
  const targetUrl = normalizeUrl(config.public?.enfyraSDK?.apiUrl, rawPath);

  // Detect WebSocket upgrade request
  const isWebSocket = event.headers.get('upgrade')?.toLowerCase() === 'websocket';

  if (isWebSocket) {
    // Use http-proxy for WebSocket
    return new Promise((resolve, reject) => {
      wsProxy.web(event.node.req, event.node.res, (err, _socket) => {
        if (err) {
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    }) as any;
  }

  const headers = event.context.proxyHeaders || {};

  return proxyRequest(event, targetUrl, {
    headers,
  });
}
