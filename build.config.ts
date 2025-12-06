import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  failOnWarn: false,
  externals: ["@nuxt/kit", "@nuxt/schema", "vue", "defu"],
  entries: [
    // Module entry point
    "src/module",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
});
