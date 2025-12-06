import { ref, computed } from "vue";
import type { LoginPayload, User, UseEnfyraAuthReturn } from "../types/auth";
import { useEnfyraApi } from "./useEnfyraApi";

const me = ref<User | null>(null);
const isLoading = ref<boolean>(false);

export function useEnfyraAuth() {
  const {
    data: loginData,
    execute: executeLogin,
    error: loginError,
  } = useEnfyraApi("/login", {
    method: "post",
    errorContext: "Login",
  });

  const { execute: executeLogout } = useEnfyraApi("/logout", {
    method: "post",
    errorContext: "Logout",
  });

  const {
    data: meData,
    execute: executeFetchUser,
    error: fetchUserError,
  } = useEnfyraApi("/me", {
    errorContext: "Fetch User Profile",
  });

  const fetchUser = async (options?: { fields?: string[] }) => {
    isLoading.value = true;

    try {
      const queryParams: any = {};
      
      if (options?.fields && options.fields.length > 0) {
        queryParams.fields = options.fields.join(",");
      }

      await executeFetchUser({
        query: queryParams,
      });

      if (fetchUserError.value) {
        me.value = null;
        return;
      }

      me.value = (meData.value as any)?.data?.[0];
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (payload: LoginPayload) => {
    isLoading.value = true;

    try {
      await executeLogin({ body: payload });

      if (loginError.value) {
        return null;
      }

      return loginData.value;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    isLoading.value = true;

    try {
      await executeLogout();
      me.value = null;

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      me.value = null;
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } finally {
      isLoading.value = false;
    }
  };

  const isLoggedIn = computed(() => !!me.value);
  return {
    me,
    login,
    logout,
    fetchUser,
    isLoggedIn,
  } as const;
}
