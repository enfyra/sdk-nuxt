import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    'src/module',
    {
      input: 'src/runtime/',
      outDir: 'dist/runtime',
    },
  ],
  clean: true,
  declaration: true,
  externals: [
    '#app',
    '#imports',
    'vue',
    '@enfyra/sdk-core',
    '@nuxt/kit',
    '@nuxt/schema',
  ],
  rollup: {
    emitCJS: false,
  },
  failOnWarn: false,
});
