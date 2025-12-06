import { ref, unref, toRaw } from "vue";
import type {
  ApiOptions,
  ApiError,
  ExecuteOptions,
  UseEnfyraApiSSRReturn,
  UseEnfyraApiClientReturn,
  BatchProgress,
} from "../types";
import { $fetch } from "../utils/http";
import { getAppUrl, normalizeUrl } from "../utils/url";
import { ENFYRA_API_PREFIX } from "../constants/config";

import { useRuntimeConfig, useFetch, useRequestHeaders, useNuxtApp } from "#imports";

function handleError(
  error: any,
  context?: string,
  customHandler?: (error: ApiError, context?: string) => void
) {
  const apiError: ApiError = {
    message: error?.message || error?.data?.message || "Request failed",
    status: error?.status || error?.response?.status,
    data: error?.data || error?.response?.data,
    response: error?.response || error,
  };

  if (customHandler) {
    customHandler(apiError, context);
  } else {
    console.error(`[Enfyra API Error]`, { error: apiError, context });
  }

  return apiError;
}

export function useEnfyraApi<T = any>(
  path: (() => string) | string,
  opts: ApiOptions<T> & { ssr: true }
): UseEnfyraApiSSRReturn<T>;

export function useEnfyraApi<T = any>(
  path: (() => string) | string,
  opts?: ApiOptions<T> & { ssr?: false | undefined }
): UseEnfyraApiClientReturn<T>;

export function useEnfyraApi<T = any>(
  path: (() => string) | string,
  opts: ApiOptions<T> = {}
): UseEnfyraApiSSRReturn<T> | UseEnfyraApiClientReturn<T> {
  const { method = "get", body, query, errorContext, onError, ssr, key } = opts;
  const batchOptions = opts as any;
  const { batchSize, concurrent, onProgress } = batchOptions;

  if (ssr) {
    const config = useRuntimeConfig().public.enfyraSDK;
    const basePath = (typeof path === "function" ? path() : path)
      .replace(/^\/?api\/?/, "")
      .replace(/^\/+/, "");

    const appUrl = getAppUrl();
    const finalUrl = normalizeUrl(
      appUrl,
      config?.apiPrefix || ENFYRA_API_PREFIX,
      basePath
    );

    const clientHeaders = process.client
      ? {}
      : useRequestHeaders([
          "authorization",
          "cookie",
          "user-agent",
          "accept",
          "accept-language",
          "referer",
        ]);

    const serverHeaders = { ...clientHeaders };
    delete serverHeaders.connection;
    delete serverHeaders["keep-alive"];
    delete serverHeaders.host;
    delete serverHeaders["content-length"];

    const nuxtApp = useNuxtApp()
    
    const fetchOptions: any = {
      method: method as any,
      body: body,
      query: query,
      headers: {
        ...serverHeaders,
        ...opts.headers,
      },
    };

    // Pass all useFetch-specific options
    if (key !== undefined) {
      fetchOptions.key = key;
    }
    if (opts.default !== undefined) {
      fetchOptions.default = opts.default;
    }
    if (opts.server !== undefined) {
      fetchOptions.server = opts.server;
    }
    if (opts.lazy !== undefined) {
      fetchOptions.lazy = opts.lazy;
    }
    if (opts.immediate !== undefined) {
      fetchOptions.immediate = opts.immediate;
    }
    if (opts.transform !== undefined) {
      fetchOptions.transform = opts.transform;
    }
    if (opts.pick !== undefined) {
      fetchOptions.pick = opts.pick;
    }
    if (opts.watch !== undefined) {
      fetchOptions.watch = opts.watch;
    }
    if (opts.deep !== undefined) {
      fetchOptions.deep = opts.deep;
    }
    if (opts.getCachedData !== undefined) {
      fetchOptions.getCachedData = opts.getCachedData;
    } else {
      // Auto-add getCachedData to ensure cache is used in SPA navigation
      fetchOptions.getCachedData = (cacheKey: string) => {
        return nuxtApp.payload.data[cacheKey] || nuxtApp.static.data[cacheKey]
      }
    }
    if (opts.refresh !== undefined) {
      fetchOptions.refresh = opts.refresh;
    }
    if (opts.refreshInterval !== undefined) {
      fetchOptions.refreshInterval = opts.refreshInterval;
    }
    if (opts.dedupe !== undefined) {
      fetchOptions.dedupe = opts.dedupe;
    }

    const result = useFetch<T>(finalUrl, fetchOptions);
    
    // Map pending to loading for better naming
    // useFetch returns AsyncData with 'pending', but UseEnfyraApiSSRReturn uses 'loading'
    return {
      ...result,
      loading: result.pending,
      pending: result.pending, // Keep for backward compatibility
    } as UseEnfyraApiSSRReturn<T>;
  }
  const data = ref<T | null>(null);
  const error = ref<ApiError | null>(null);
  const pending = ref(false);

  const execute = async (executeOpts?: ExecuteOptions) => {
    pending.value = true;
    error.value = null;

    try {
      const config: any = useRuntimeConfig().public.enfyraSDK;
      const apiUrl = getAppUrl();
      const apiPrefix = config?.apiPrefix;
      const basePath = (typeof path === "function" ? path() : path)
        .replace(/^\/?api\/?/, "")
        .replace(/^\/+/, "");
      const finalBody = executeOpts?.body || unref(body);
      const finalQuery = executeOpts?.query || unref(query);

      const isBatchOperation =
        !opts.disableBatch &&
        ((executeOpts?.ids &&
          executeOpts.ids.length > 0 &&
          (method.toLowerCase() === "patch" ||
            method.toLowerCase() === "delete")) ||
          (method.toLowerCase() === "post" &&
            executeOpts?.files &&
            Array.isArray(executeOpts.files) &&
            executeOpts.files.length > 0));

      const effectiveBatchSize = isBatchOperation
        ? executeOpts?.batchSize ?? batchSize
        : undefined;
      const effectiveConcurrent = isBatchOperation
        ? executeOpts?.concurrent ?? concurrent
        : undefined;
      const effectiveOnProgress = isBatchOperation
        ? executeOpts?.onProgress ?? onProgress
        : undefined;

      const buildPath = (...segments: (string | number)[]): string => {
        return segments.filter(Boolean).join("/");
      };

      const fullBaseURL = normalizeUrl(apiUrl, apiPrefix || ENFYRA_API_PREFIX);

      async function processBatch<T>(
        items: any[],
        processor: (item: any, index: number) => Promise<T>
      ): Promise<T[]> {
        const results: T[] = [];
        const progressResults: BatchProgress["results"] = [];
        const startTime = Date.now();
        let completed = 0;
        let failed = 0;

        const chunks = effectiveBatchSize
          ? Array.from(
              { length: Math.ceil(items.length / effectiveBatchSize) },
              (_, i) =>
                items.slice(
                  i * effectiveBatchSize,
                  i * effectiveBatchSize + effectiveBatchSize
                )
            )
          : [items];

        const totalBatches = chunks.length;
        let currentBatch = 0;

        const updateProgress = (inProgress: number = 0) => {
          if (effectiveOnProgress) {
            const elapsed = Date.now() - startTime;
            const progress =
              items.length > 0
                ? Math.round((completed / items.length) * 100)
                : 0;
            const averageTime = completed > 0 ? elapsed / completed : undefined;
            const operationsPerSecond =
              completed > 0 ? (completed / elapsed) * 1000 : undefined;
            const estimatedTimeRemaining =
              averageTime && items.length > completed
                ? Math.round(averageTime * (items.length - completed))
                : undefined;

            const progressData: BatchProgress = {
              progress,
              completed,
              total: items.length,
              failed,
              inProgress,
              estimatedTimeRemaining,
              averageTime,
              currentBatch: currentBatch + 1,
              totalBatches,
              operationsPerSecond,
              results: [...progressResults],
            };

            effectiveOnProgress(progressData);
          }
        };

        updateProgress(0);

        if (!effectiveBatchSize && !effectiveConcurrent) {
          updateProgress(items.length);

          const promises = items.map(async (item, index) => {
            const itemStartTime = Date.now();
            try {
              const result = await processor(item, index);
              const duration = Date.now() - itemStartTime;

              completed++;
              progressResults.push({
                index,
                status: "completed",
                result,
                duration,
              });
              updateProgress(items.length - completed);

              return result;
            } catch (error) {
              const duration = Date.now() - itemStartTime;
              failed++;
              completed++;

              progressResults.push({
                index,
                status: "failed",
                error: error as ApiError,
                duration,
              });
              updateProgress(items.length - completed);

              throw error;
            }
          });

          const results = await Promise.all(promises);
          updateProgress(0);
          return results;
        }

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          currentBatch = chunkIndex;
          const chunk = chunks[chunkIndex];

          if (effectiveConcurrent && chunk.length > effectiveConcurrent) {
            for (let i = 0; i < chunk.length; i += effectiveConcurrent) {
              const batch = chunk.slice(i, i + effectiveConcurrent);
              const baseIndex =
                chunkIndex * (effectiveBatchSize || items.length) + i;

              updateProgress(batch.length);

              const batchPromises = batch.map(async (item, batchItemIndex) => {
                const globalIndex = baseIndex + batchItemIndex;
                const itemStartTime = Date.now();

                try {
                  const result = await processor(item, globalIndex);
                  const duration = Date.now() - itemStartTime;

                  completed++;
                  progressResults.push({
                    index: globalIndex,
                    status: "completed",
                    result,
                    duration,
                  });
                  updateProgress(
                    Math.max(0, batch.length - (batchItemIndex + 1))
                  );

                  return result;
                } catch (error) {
                  const duration = Date.now() - itemStartTime;
                  failed++;
                  completed++;

                  progressResults.push({
                    index: globalIndex,
                    status: "failed",
                    error: error as ApiError,
                    duration,
                  });
                  updateProgress(
                    Math.max(0, batch.length - (batchItemIndex + 1))
                  );

                  throw error;
                }
              });

              const batchResults = await Promise.all(batchPromises);
              results.push(...batchResults);
            }
          } else {
            const baseIndex = chunkIndex * (effectiveBatchSize || items.length);

            updateProgress(chunk.length);

            const chunkPromises = chunk.map(async (item, chunkItemIndex) => {
              const globalIndex = baseIndex + chunkItemIndex;
              const itemStartTime = Date.now();

              try {
                const result = await processor(item, globalIndex);
                const duration = Date.now() - itemStartTime;

                completed++;
                progressResults.push({
                  index: globalIndex,
                  status: "completed",
                  result,
                  duration,
                });
                updateProgress(
                  Math.max(0, chunk.length - (chunkItemIndex + 1))
                );

                return result;
              } catch (error) {
                const duration = Date.now() - itemStartTime;
                failed++;
                completed++;

                progressResults.push({
                  index: globalIndex,
                  status: "failed",
                  error: error as ApiError,
                  duration,
                });
                updateProgress(
                  Math.max(0, chunk.length - (chunkItemIndex + 1))
                );

                throw error;
              }
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
          }
        }

        updateProgress(0);
        return results;
      }

      if (isBatchOperation && executeOpts?.ids && executeOpts.ids.length > 0) {
        const responses = await processBatch(
          executeOpts.ids,
          async (id) => {
            const finalPath = buildPath(basePath, id);
            return $fetch<T>(finalPath, {
              baseURL: fullBaseURL,
              method: method as any,
              body: finalBody ? toRaw(finalBody) : undefined,
              headers: opts.headers,
              query: finalQuery,
            });
          }
        );

        data.value = responses as T;
        return responses;
      }

      if (
        isBatchOperation &&
        executeOpts?.files &&
        Array.isArray(executeOpts.files) &&
        executeOpts.files.length > 0
      ) {
        const responses = await processBatch(
          executeOpts.files,
          async (fileObj: any) => {
            return $fetch<T>(basePath, {
              baseURL: fullBaseURL,
              method: method as any,
              body: fileObj,
              headers: opts.headers,
              query: finalQuery,
            });
          }
        );

        data.value = responses as T;
        return responses;
      }

      const finalPath = executeOpts?.id
        ? buildPath(basePath, executeOpts.id)
        : basePath;

      const response = await $fetch<T>(finalPath, {
        baseURL: fullBaseURL,
        method: method as any,
        body: finalBody ? toRaw(finalBody) : undefined,
        headers: opts.headers,
        query: finalQuery,
      });

      data.value = response;
      return response;
    } catch (err) {
      const apiError = handleError(err, errorContext, onError);
      error.value = apiError;
      return null;
    } finally {
      pending.value = false;
    }
  };

  return {
    data,
    error,
    pending,
    execute,
  } as UseEnfyraApiClientReturn<T>;
}
