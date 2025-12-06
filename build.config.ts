import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  failOnWarn: false,
  externals: ["@nuxt/kit", "h3", "ofetch"],
  entries: [
    {
      input: "src/runtime/",
      outDir: "dist/runtime",
      format: "esm",
    },
  ],
  declaration: false,
  clean: false,
  rollup: {
    emitCJS: false,
  },
});

