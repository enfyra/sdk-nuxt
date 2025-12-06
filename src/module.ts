import {
  defineNuxtModule,
  createResolver,
  addServerHandler,
  addImportsDir,
  addPlugin,
} from "@nuxt/kit";
import { ENFYRA_API_PREFIX } from "./constants/config";

export interface ModuleOptions {
  apiUrl: string;
  apiPrefix?: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@enfyra/sdk-nuxt",
    configKey: "enfyraSDK",
  },
  defaults: {
    apiUrl: "",
    apiPrefix: ENFYRA_API_PREFIX,
  },
  setup(options, nuxt) {
    const normalizedOptions = {
      ...options,
      apiUrl:
        typeof options.apiUrl === "string"
          ? options.apiUrl.replace(/\/+$/, "")
          : options.apiUrl,
      apiPrefix:
        typeof options.apiPrefix === "string"
          ? (options.apiPrefix.trim() 
              ? "/" + options.apiPrefix.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/")
              : ENFYRA_API_PREFIX)
          : ENFYRA_API_PREFIX,
    };

    const apiPrefix = normalizedOptions.apiPrefix;
    const { resolve } = createResolver(import.meta.url);

    if (!normalizedOptions.apiUrl) {
      console.warn(
        `[Enfyra SDK Nuxt] Missing required configuration:\n` +
          `- apiUrl is required\n` +
          `Please configure it in your nuxt.config.ts:\n` +
          `enfyraSDK: {\n` +
          `  apiUrl: 'https://your-api-url'\n` +
          `}`
      );
      
      nuxt.options.runtimeConfig.public.enfyraSDK = {
        ...normalizedOptions,
        apiPrefix: apiPrefix,
        configError: true,
        configErrorMessage: 'Enfyra SDK: apiUrl is required. Please configure it in nuxt.config.ts'
      };
    } else {
      nuxt.options.runtimeConfig.public.enfyraSDK = {
        ...normalizedOptions,
        apiPrefix: apiPrefix,
      };
    }


    if (!normalizedOptions.apiUrl) {
      addPlugin({
        src: resolve("./runtime/plugin/config-error.client"),
        mode: 'client'
      });
    }
    
    addImportsDir(resolve("./composables"));

    nuxt.hook('prepare:types', ({ declarations, references }: any) => {
      references.push({
        path: resolve('./types/nuxt-imports.d.ts'),
      })
    })

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
