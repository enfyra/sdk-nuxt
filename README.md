# @enfyra/sdk-nuxt

Nuxt 3/4 module for Enfyra. Cookie-bridge auth, SSR-safe request-scoped client, and auto-imported composables.

## Install

```bash
yarn add @enfyra/sdk-nuxt @enfyra/sdk-core
```

```dotenv
ENFYRA_APP_URL=https://admin.example.com
```

```ts
export default defineNuxtConfig({
  modules: ['@enfyra/sdk-nuxt'],
})
```

No plugin, server middleware, route rule, or cookie handler needs to be written manually.

## Options

```ts
export default defineNuxtConfig({
  modules: ['@enfyra/sdk-nuxt'],
  enfyra: {
    appUrl: 'https://admin.example.com',
    routePrefix: '/enfyra',
  },
})
```

`appUrl` is private runtime configuration. Only `routePrefix` is exposed to the browser.

## Composables

All composables are auto-imported — no manual imports needed.

### useEnfyra

Returns the `EnfyraClient` instance for direct API access.

```ts
const client = useEnfyra()
const { data } = await client.get('/projects')
```

### useAuth

```ts
const { user, isAuthenticated, pending, login, logout, refresh, oauthLogin } = useAuth()

await login({ email: 'user@example.com', password: '...' })
oauthLogin('google')
```

### useQuery / useMutation

```ts
const { data, error, pending, meta, refresh } = useQuery('articles', {
  select: 'id,title,status',
  filter: { status: { _eq: 'published' } },
  limit: 20,
})

const { execute, pending: saving } = useMutation('articles')
await execute({ data: { title: 'Hello' } })
```

### useStorage

```ts
const { upload, uploading, download, getDownloadUrl, getFolderTree } = useStorage()
const file = await upload(fileInput.files[0], { folder: 1 })
```

### useWebSocket

```ts
const ws = useWebSocket('cloud', { immediate: true })
ws.on('cloud:project-changed', (event) => { ... })
```

## SSR behavior

- One `EnfyraClient` per incoming request; never cached across requests.
- Forwards the request's `Cookie` and `Authorization` headers to the Enfyra App.
- Appends rotated `Set-Cookie` headers back to the SSR response.
- Browser traffic uses the same-origin `/enfyra` proxy with `HttpOnly` cookies.

## What the module does

- Proxies `/${routePrefix}/**` → `${appUrl}/api/**` with manual redirects.
- Creates a request-scoped client (SSR) or singleton (CSR) via a Nuxt plugin.
- Auto-imports all composables.
- Sets `cookieBridgePrefix` for OAuth redirect flows.
