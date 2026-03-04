# useEnfyraAuth Composable Guide

This guide explains how to use the `useEnfyraAuth` composable for authentication in Nuxt applications with the Enfyra SDK.

## Overview

The `useEnfyraAuth` composable provides authentication functionality with:

- ✅ **User Management**: Login, logout, and fetch user data
- ✅ **OAuth Support**: Login with Google, Facebook, GitHub
- ✅ **Reactive State**: Reactive user state and loading indicators
- ✅ **Dynamic Fields**: Fetch specific user fields as needed
- ✅ **Authentication Status**: Built-in `isLoggedIn` computed property
- ✅ **TypeScript Support**: Full type safety

## Basic Usage

```typescript
const { me, login, logout, fetchUser, isLoggedIn, oauthLogin } = useEnfyraAuth();
```

## API Reference

### Return Values

```typescript
interface UseEnfyraAuthReturn {
  me: Ref<User | null>                                        // Current user data
  login: (payload: LoginPayload) => Promise<any>              // Login function
  logout: () => Promise<void>                                 // Logout function
  fetchUser: (options?: { fields?: string[] }) => Promise<void> // Fetch user data
  isLoggedIn: Ref<boolean>                                    // Authentication status
  oauthLogin: (provider: OAuthProvider) => void                // OAuth login function
}

type OAuthProvider = 'google' | 'facebook' | 'github'
```

### User Interface

```typescript
interface User {
  id: string
  email: string
  isRootAdmin: boolean
  isSystem: boolean
  role?: {
    id: string
    name: string
    routePermissions: RoutePermission[]
  }
  allowedRoutePermissions?: RoutePermission[]
}
```

### Login Payload

```typescript
interface LoginPayload {
  email: string
  password: string
  remember?: boolean
}
```

## Authentication Flow

### 1. Login

```typescript
const { login, me, isLoggedIn } = useEnfyraAuth();

async function handleLogin() {
  const result = await login({
    email: 'user@example.com',
    password: 'password123',
    remember: true
  });

  if (result) {
    console.log('Login successful');
    console.log('User logged in:', isLoggedIn.value); // true
  }
}
```

### 2. Fetch User Data

```typescript
const { fetchUser, me } = useEnfyraAuth();

// Basic usage - fetch all available fields
await fetchUser();

// Or specify specific fields to fetch
await fetchUser({
  fields: [
    'id',
    'email', 
    'isRootAdmin',
    'role.id',
    'role.name'
  ]
});

console.log('User data:', me.value);
```

### 3. Using Specific Fields

For better performance, you can specify only the fields you need:

```typescript
// In your app constants file (optional)
export const DEFAULT_ME_FIELDS = [
  'id',
  'email',
  'isRootAdmin',
  'isSystem',
  'role.id',
  'role.name',
  'role.routePermissions.id',
  'role.routePermissions.isEnabled',
  'role.routePermissions.allowedUsers',
  'role.routePermissions.methods.id',
  'role.routePermissions.methods.method',
  'role.routePermissions.route.id',
  'role.routePermissions.route.path',
  'allowedRoutePermissions.id',
  'allowedRoutePermissions.isEnabled',
  'allowedRoutePermissions.allowedUsers.id',
  'allowedRoutePermissions.methods.id',
  'allowedRoutePermissions.methods.method',
  'allowedRoutePermissions.route.id',
  'allowedRoutePermissions.route.path',
];

// Usage
const { fetchUser } = useEnfyraAuth();
await fetchUser({ fields: DEFAULT_ME_FIELDS });
```

### 4. Logout

```typescript
const { logout, me, isLoggedIn } = useEnfyraAuth();

async function handleLogout() {
  await logout();
  
  console.log('User logged out:', me.value === null); // true
  console.log('Is logged in:', isLoggedIn.value);     // false
}
```

## Common Patterns

### Authentication Middleware

```typescript
// middleware/auth.global.ts
import { DEFAULT_ME_FIELDS } from '~/utils/common/constants';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { me, fetchUser } = useEnfyraAuth();

  // Fetch user if not already loaded
  if (!me.value) {
    await fetchUser({ fields: DEFAULT_ME_FIELDS });
  }

  // Redirect to login if not authenticated
  if (to.path !== '/login' && !me.value) {
    return navigateTo('/login');
  }

  // Redirect to home if already logged in
  if (to.path === '/login' && me.value) {
    return navigateTo('/');
  }
});
```

### Login Page

```vue
<script setup>
const { login, isLoggedIn } = useEnfyraAuth();

const form = reactive({
  email: '',
  password: '',
  remember: false
});

const isLoading = ref(false);
const error = ref('');

async function handleSubmit() {
  isLoading.value = true;
  error.value = '';

  try {
    const result = await login({
      email: form.email,
      password: form.password,
      remember: form.remember
    });

    if (result) {
      await navigateTo('/dashboard');
    } else {
      error.value = 'Invalid credentials';
    }
  } catch (err) {
    error.value = 'Login failed';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div>
      <label>Email:</label>
      <input v-model="form.email" type="email" required />
    </div>
    
    <div>
      <label>Password:</label>
      <input v-model="form.password" type="password" required />
    </div>
    
    <div>
      <label>
        <input v-model="form.remember" type="checkbox" />
        Remember me
      </label>
    </div>
    
    <button type="submit" :disabled="isLoading">
      {{ isLoading ? 'Logging in...' : 'Login' }}
    </button>
    
    <div v-if="error" class="error">{{ error }}</div>
  </form>
</template>
```

### User Profile Component

```vue
<script setup>
const { me, logout, fetchUser } = useEnfyraAuth();

const isRefreshing = ref(false);

async function refreshProfile() {
  isRefreshing.value = true;
  
  await fetchUser({
    fields: [
      'id',
      'email',
      'firstName',
      'lastName', 
      'avatar',
      'role.name'
    ]
  });
  
  isRefreshing.value = false;
}

async function handleLogout() {
  await logout();
  // Logout automatically reloads the page
}
</script>

<template>
  <div v-if="me" class="profile">
    <h2>User Profile</h2>
    
    <div>
      <strong>Email:</strong> {{ me.email }}
    </div>
    
    <div v-if="me.role">
      <strong>Role:</strong> {{ me.role.name }}
    </div>
    
    <div>
      <strong>Admin:</strong> {{ me.isRootAdmin ? 'Yes' : 'No' }}
    </div>
    
    <div class="actions">
      <button @click="refreshProfile" :disabled="isRefreshing">
        {{ isRefreshing ? 'Refreshing...' : 'Refresh Profile' }}
      </button>
      
      <button @click="handleLogout">
        Logout
      </button>
    </div>
  </div>
</template>
```

## Error Handling

The composable automatically handles errors through the underlying `useEnfyraApi`. Errors are logged to console and you can check for authentication failures:

```typescript
const { login, logout, fetchUser } = useEnfyraAuth();

// Login errors are handled automatically
const result = await login({ email, password });
if (!result) {
  // Handle login failure (credentials invalid, network error, etc.)
  showError('Login failed');
}

// Fetch user errors are handled automatically  
await fetchUser({ fields: DEFAULT_ME_FIELDS });
if (!me.value) {
  // Handle fetch failure (unauthorized, network error, etc.)
  showError('Failed to load user profile');
}
```

## Important Notes

### Optional Fields Parameter

The `fetchUser` function accepts an optional `fields` parameter to specify which user fields to retrieve:

```typescript
// ✅ Fetch all available fields
await fetchUser();

// ✅ Fetch specific fields for better performance
await fetchUser({
  fields: ['id', 'email', 'role.name']
});
```

### Authentication State

- The `me` ref is shared globally across all composable instances
- User data persists until logout or page refresh
- `isLoggedIn` is a computed property that automatically updates when `me` changes

### Logout Behavior

The logout function automatically:
1. Calls the logout API endpoint
2. Clears the user data (`me.value = null`)
3. Reloads the page to clear any cached state

## Best Practices

1. **Use Constants for Fields**: Create reusable field arrays instead of hardcoding them

2. **Handle Loading States**: The composable doesn't expose loading states, manage them in your components

3. **Error Boundaries**: Wrap authentication logic in try-catch blocks when needed

4. **Middleware Integration**: Use in global middleware for automatic authentication checks

5. **Type Safety**: Leverage TypeScript interfaces for better development experience

## Troubleshooting

### Fields Parameter Usage

```typescript
// ✅ Fetch all fields (default behavior)
await fetchUser();

// ✅ Fetch specific fields (recommended for performance)
await fetchUser({ fields: ['id', 'email', 'role.name'] });
```

### User Data Not Updating

- Ensure you're calling `fetchUser` with appropriate fields
- Check network requests in browser dev tools
- Verify API endpoints are accessible

### Authentication Not Persisting

- Check if cookies/tokens are being set properly
- Verify API server is handling authentication headers
- Ensure logout isn't being called unexpectedly