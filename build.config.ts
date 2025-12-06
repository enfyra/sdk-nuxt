import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  failOnWarn: false,
  externals: ["@nuxt/kit"],
  entries: [
    "src/module",
    {
      input: "src/runtime/",
      outDir: "dist/runtime",
      format: "esm",
    },
    {
      input: "src/composables/",
      outDir: "dist/composables",
      format: "esm",
      declaration: true,
    },
    {
      input: "src/constants/",
      outDir: "dist/constants",
      format: "esm",
    },
    {
      input: "src/utils/",
      outDir: "dist/utils",
      format: "esm",
    },
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
});
