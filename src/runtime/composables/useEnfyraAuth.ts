import { ref, computed } from "vue";
import type { LoginPayload, User, UseEnfyraAuthReturn } from "../../types/auth";
import { $fetch } from "../utils/http";
import { useEnfyra } from "./useEnfyra";

const me = ref<User | null>(null);
const isLoading = ref<boolean>(false);

export function useEnfyraAuth(): UseEnfyraAuthReturn {
  const { baseUrl } = useEnfyra();

  const login = async (payload: LoginPayload) => {
    isLoading.value = true;

    try {
      const response = await $fetch(`${baseUrl}/login`, {
        method: "POST",
        body: payload,
      });

      me.value = (response as any)?.data?.[0] || null;
      return response;
    } catch (error) {
      console.error("[Enfyra Auth] Login error:", error);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    isLoading.value = true;

    try {
      await $fetch(`${baseUrl}/logout`, {
        method: "POST",
      });
      me.value = null;

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      console.error("[Enfyra Auth] Logout error:", error);
      me.value = null;
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } finally {
      isLoading.value = false;
    }
  };

  const fetchUser = async (options?: { fields?: string[] }) => {
    isLoading.value = true;

    try {
      const queryParams: any = {};

      if (options?.fields && options.fields.length > 0) {
        queryParams.fields = options.fields.join(",");
      }

      const response = await $fetch(`${baseUrl}/me`, {
        method: "GET",
        query: queryParams,
      });

      me.value = (response as any)?.data?.[0] || null;
    } catch (error) {
      console.error("[Enfyra Auth] Fetch user error:", error);
      me.value = null;
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
