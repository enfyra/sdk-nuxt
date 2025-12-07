export function normalizeUrl(...segments: (string | undefined | null)[]): string {
  const validSegments = segments.filter((s): s is string => Boolean(s));
  if (validSegments.length === 0) return '';

  let result = validSegments[0].replace(/\/+$/, '');

  for (let i = 1; i < validSegments.length; i++) {
    const segment = validSegments[i]
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\/+/g, '/');
    if (segment) {
      result += '/' + segment;
    }
  }

  return result;
}

export function joinUrlPath(...paths: (string | undefined | null)[]): string {
  const validPaths = paths.filter((p): p is string => Boolean(p));
  if (validPaths.length === 0) return '';

  return validPaths
    .map(path => path.replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter(Boolean)
    .join('/');
}

export function getAppUrl(): string {
  if (process.client && typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  if (process.server) {
    try {
      let useRequestHeaders: any;
      let useRequestURL: any;
      
      try {
        const imports = eval('require("#imports")');
        useRequestHeaders = imports.useRequestHeaders;
        useRequestURL = imports.useRequestURL;
      } catch (e) {
        return '';
      }
      
      try {
        const url = useRequestURL();
        if (url) {
          return `${url.protocol}//${url.host}`;
        }
      } catch (e) {
      }
      
      const headers = useRequestHeaders();
      
      const forwarded = headers['x-forwarded-host'] || headers['x-forwarded-server'];
      const protocol = headers['x-forwarded-proto'] || 'https';
      
      if (forwarded) {
        return `${protocol}://${forwarded}`;
      }
      
      const host = headers.host;
      if (host) {
        const isHttps = protocol === 'https' || headers['x-forwarded-ssl'] === 'on';
        return `${isHttps ? 'https' : 'http'}://${host}`;
      }
    } catch (e) {
      console.warn('[Enfyra SDK] Could not auto-detect app URL on server:', e);
    }
  }
  
  return '';
}