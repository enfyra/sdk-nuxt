import {
  defineNuxtModule,
  createResolver,
  addServerHandler,
  addImports,
  addPlugin,
  useLogger,
} from "@nuxt/kit";
import { defu } from "defu";
import { ENFYRA_API_PREFIX } from "./runtime/constants/config";

export interface ModuleOptions {
  apiUrl: string;
  apiPrefix?: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@enfyra/sdk-nuxt",
    configKey: "enfyraSDK",
    compatibility: {
      nuxt: ">=3.0.0",
    },
  },
  defaults: {
    apiUrl: "",
    apiPrefix: ENFYRA_API_PREFIX,
  },
  setup(options, nuxt) {
    const logger = useLogger("enfyra-sdk");
    const { resolve } = createResolver(import.meta.url);

    const normalizedOptions = {
      ...options,
      apiUrl:
        typeof options.apiUrl === "string"
          ? options.apiUrl.replace(/\/+$/, "")
          : options.apiUrl,
      apiPrefix:
        typeof options.apiPrefix === "string"
          ? options.apiPrefix.trim()
            ? "/" +
            options.apiPrefix
              .replace(/^\/+|\/+$/g, "")
              .replace(/\/+/g, "/")
            : ENFYRA_API_PREFIX
          : ENFYRA_API_PREFIX,
    };

    const apiPrefix = normalizedOptions.apiPrefix;

    if (!normalizedOptions.apiUrl) {
      logger.warn(
        `Missing required configuration:\n` +
        `- apiUrl is required\n` +
        `Please configure it in your nuxt.config.ts:\n` +
        `enfyraSDK: {\n` +
        `  apiUrl: 'https://your-api-url'\n` +
        `}`
      );

      nuxt.options.runtimeConfig.public.enfyraSDK = defu(
        nuxt.options.runtimeConfig.public.enfyraSDK || {},
        {
          ...normalizedOptions,
          apiPrefix: apiPrefix,
          configError: true,
          configErrorMessage:
            "Enfyra SDK: apiUrl is required. Please configure it in nuxt.config.ts",
        }
      );
    } else {
      nuxt.options.runtimeConfig.public.enfyraSDK = defu(
        nuxt.options.runtimeConfig.public.enfyraSDK || {},
        {
          ...normalizedOptions,
          apiPrefix: apiPrefix,
        }
      );
    }

    if (!normalizedOptions.apiUrl) {
      addPlugin({
        src: resolve("./runtime/plugin/config-error.client"),
        mode: "client",
      });
    }

    // Register composables for auto-import with explicit declarations
    addImports([
      {
        name: "useEnfyraApi",
        from: resolve("./runtime/composables/useEnfyraApi"),
      },
      {
        name: "useEnfyraAuth",
        from: resolve("./runtime/composables/useEnfyraAuth"),
      },
    ]);

    // Server handlers
    addServerHandler({
      handler: resolve("./runtime/server/middleware/auth"),
      middleware: true,
    });

    addServerHandler({
      route: `${apiPrefix}/login`,
      handler: resolve("./runtime/server/api/login.post"),
      method: "post",
    });

    addServerHandler({
      route: `${apiPrefix}/logout`,
      handler: resolve("./runtime/server/api/logout.post"),
      method: "post",
    });

    addServerHandler({
      route: "/assets/**",
      handler: resolve("./runtime/server/api/all"),
    });

    addServerHandler({
      route: `${apiPrefix}/**`,
      handler: resolve("./runtime/server/api/all"),
    });
  },
});
