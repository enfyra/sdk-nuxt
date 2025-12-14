# @enfyra/sdk-nuxt

Nuxt SDK for Enfyra CMS - A lightweight composable-based API client with full TypeScript integration.

## Features

✅ **Simple & Flexible** - Get base URL and build your own composables  
✅ **Authentication Integration** - Built-in auth composables with automatic header forwarding  
✅ **Asset Proxy** - Automatic `/assets/**` proxy to backend with no configuration needed  
✅ **TypeScript Support** - Full type safety with auto-generated declarations  
✅ **SSR Ready** - Works seamlessly with Nuxt's `useFetch` and `$fetch`

## Installation

```bash
npm install @enfyra/sdk-nuxt
```

## Setup

Add the module to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ["@enfyra/sdk-nuxt"],
  enfyraSDK: {
    apiUrl: "http://localhost:1105", // Only apiUrl is required
  },
})
```

### Automatic App URL Detection

The SDK automatically detects your application URL:

- **Client-side**: Uses `window.location.origin`
- **Server-side**: Detects from request headers (supports proxies with `X-Forwarded-*` headers)
- **No configuration needed**: Works out of the box with any deployment

## Quick Start

### Get Base URL

```typescript
// Get the base URL for your API requests
const { baseUrl, apiPrefix } = useEnfyra();

// baseUrl: "http://localhost:3001/enfyra/api"
// apiPrefix: "/enfyra/api"
```

### Using with `useFetch` (SSR)

```typescript
// pages/users.vue
<script setup>
const { baseUrl } = useEnfyra();

// Use with Nuxt's useFetch for SSR support
const { data: users, pending, error, refresh } = await useFetch(`${baseUrl}/users`, {
  key: 'users-list' // Optional cache key
});
</script>

<template>
  <div>
    <div v-if="pending">Loading users...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <h1>Users ({{ users?.meta?.totalCount }})</h1>
      <UserCard v-for="user in users?.data" :key="user.id" :user="user" />
      <button @click="refresh">Refresh</button>
    </div>
  </div>
</template>
```

### Using with `$fetch` (Client)

```typescript
// components/CreateUserForm.vue  
<script setup>
const { baseUrl } = useEnfyra();
const pending = ref(false);
const error = ref(null);

const formData = reactive({
  name: '',
  email: ''
});

async function handleSubmit() {
  pending.value = true;
  error.value = null;
  
  try {
    const response = await $fetch(`${baseUrl}/users`, {
      method: 'POST',
      body: formData
    });
    
    toast.success('User created successfully!');
    await navigateTo('/users');
  } catch (err) {
    error.value = err;
    toast.error('Failed to create user');
  } finally {
    pending.value = false;
  }
}
</script>
```

### Authentication

```typescript
<script setup>
const { me, login, logout, fetchUser, isLoggedIn } = useEnfyraAuth();

// Login
await login({
  email: 'user@example.com',
  password: 'password123'
});

// Check auth status
console.log('Logged in:', isLoggedIn.value);
console.log('Current user:', me.value);

// Fetch user with optional fields
await fetchUser({ fields: ['id', 'email', 'role'] });

// Logout  
await logout();
</script>
```

### Asset URLs - Automatic Proxy

The SDK automatically proxies all asset requests to your backend. Simply use `/assets/**` paths directly:

```vue
<template>
  <!-- ✅ Assets are automatically proxied to your backend -->
  <img src="/assets/images/logo.svg" alt="Logo" />
  <img :src="`/assets/images/users/${user.id}/avatar.jpg`" alt="Avatar" />
  
  <!-- Works with any asset type -->
  <video src="/assets/videos/intro.mp4" controls />
  <a :href="`/assets/documents/${doc.filename}`" download>Download PDF</a>
</template>
```

**How it works:**
- All requests to `/assets/**` are automatically proxied to `{apiUrl}/enfyra/api/assets/**`
- No configuration needed - works out of the box
- Supports all asset types: images, videos, documents, etc.
- Maintains proper authentication headers

## Core Composables

### `useEnfyra()`

Get the base URL and API prefix for building your own API requests.

```typescript
const { baseUrl, apiPrefix } = useEnfyra();

// baseUrl: "http://localhost:3001/enfyra/api"
// apiPrefix: "/enfyra/api"
```

**Returns:**
- `baseUrl: string` - Full base URL including app URL and API prefix
- `apiPrefix: string` - API prefix path (e.g., "/enfyra/api")

### `useEnfyraAuth()`

Authentication composable with reactive state management.

```typescript
const { me, login, logout, fetchUser, isLoggedIn } = useEnfyraAuth();

// Properties
me.value          // Current user data (reactive)
isLoggedIn.value  // Auth status (computed)

// Methods  
await login({ email, password })                    // Login user
await logout()                                      // Logout user  
await fetchUser({ fields?: string[] })             // Refresh user data with optional fields
```

**Login:**
```typescript
const response = await login({
  email: 'user@example.com',
  password: 'password123',
  remember: true // Optional
});
```

**Fetch User:**
```typescript
// Fetch all user fields
await fetchUser();

// Fetch specific fields only
await fetchUser({ 
  fields: ['id', 'email', 'role', 'allowedRoutePermissions'] 
});
```

## Advanced Usage

### Building Custom Composables

Since you have access to `baseUrl`, you can build your own composables using Nuxt's built-in utilities:

```typescript
// composables/useUsers.ts
export const useUsers = () => {
  const { baseUrl } = useEnfyra();
  
  // SSR mode with useFetch
  const getUsers = (options?: { page?: number; limit?: number }) => {
    return useFetch(`${baseUrl}/users`, {
      key: `users-${options?.page || 1}`,
      query: options
    });
  };
  
  // Client mode with $fetch
  const createUser = async (userData: any) => {
    return await $fetch(`${baseUrl}/users`, {
      method: 'POST',
      body: userData
    });
  };
  
  const updateUser = async (id: string, userData: any) => {
    return await $fetch(`${baseUrl}/users/${id}`, {
      method: 'PATCH',
      body: userData
    });
  };
  
  const deleteUser = async (id: string) => {
    return await $fetch(`${baseUrl}/users/${id}`, {
      method: 'DELETE'
    });
  };
  
  return {
    getUsers,
    createUser,
    updateUser,
    deleteUser
  };
};
```

### TypeScript Integration

```typescript
// Define your API response types
interface User {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  data: T[];
  meta: { totalCount: number };
}

// Use with full type safety
const { baseUrl } = useEnfyra();
const { data } = await useFetch<ApiResponse<User>>(`${baseUrl}/users`);

// TypeScript knows data.value is ApiResponse<User> | null
const users = computed(() => data.value?.data || []);
```

### Reactive Parameters with `useFetch`

```typescript
const { baseUrl } = useEnfyra();
const searchQuery = ref('');
const page = ref(1);

// SSR mode with reactive query
const { data, refresh } = await useFetch(`${baseUrl}/users`, {
  key: () => `users-${page.value}-${searchQuery.value}`,
  query: computed(() => ({
    search: searchQuery.value,
    page: page.value,
    limit: 10
  }))
});

// Watch for changes and refresh
watch([searchQuery, page], () => refresh());
```

## Configuration

### Module Options

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@enfyra/sdk-nuxt"],
  enfyraSDK: {
    // Required: Main API URL
    apiUrl: process.env.ENFYRA_API_URL || "http://localhost:1105",
    
    // Optional: API prefix (defaults to "/enfyra/api")
    apiPrefix: "/enfyra/api",
  },
})
```

### Environment Variables

```bash
# .env
ENFYRA_API_URL=https://api.enfyra.com
```

## Best Practices

### 1. Use `useFetch` for SSR Data

```typescript
// ✅ Use useFetch for initial page data (runs immediately, SSR support)
const { baseUrl } = useEnfyra();
const { data } = await useFetch(`${baseUrl}/dashboard`, {
  key: 'dashboard'
});
```

### 2. Use `$fetch` for Client Actions

```typescript
// ✅ Use $fetch for user interactions (manual execution)
const { baseUrl } = useEnfyra();

async function saveSettings(settings: any) {
  try {
    await $fetch(`${baseUrl}/settings`, {
      method: 'PATCH',
      body: settings
    });
    toast.success('Saved successfully');
  } catch (error) {
    toast.error('Failed to save');
  }
}
```

### 3. Build Reusable Composables

```typescript
// ✅ Create reusable composables for your API endpoints
export const useProducts = () => {
  const { baseUrl } = useEnfyra();
  
  return {
    list: (query?: any) => useFetch(`${baseUrl}/products`, { query }),
    get: (id: string) => useFetch(`${baseUrl}/products/${id}`),
    create: (data: any) => $fetch(`${baseUrl}/products`, { method: 'POST', body: data }),
    update: (id: string, data: any) => $fetch(`${baseUrl}/products/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) => $fetch(`${baseUrl}/products/${id}`, { method: 'DELETE' }),
  };
};
```

## Troubleshooting

### Common Issues

1. **Base URL is empty** - Ensure `apiUrl` is configured in `nuxt.config.ts`
2. **Assets not loading** - Check that `/assets/**` routes are accessible
3. **Authentication not working** - Verify cookies are being set and forwarded

### Performance Tips

- Use `useFetch` with cache keys for SSR data (better SEO, faster page loads)
- Use `$fetch` for user interactions (better UX)
- Build reusable composables to avoid code duplication
- Leverage Nuxt's built-in caching with `useFetch` keys

## Development

### Building

```bash
# Build the module
npm run build

# Development mode
npm run dev
```

## License

MIT

## Contributing

Pull requests are welcome! Please read our contributing guidelines and ensure tests pass before submitting.

## Support

For issues and questions:
- 🐛 [Report bugs](https://github.com/enfyra/sdk-nuxt/issues)
- 💬 [GitHub Discussions](https://github.com/enfyra/sdk-nuxt/discussions)
