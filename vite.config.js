import { resolve } from "path";

export default {
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["color-functions", "global-builtin", "import", "if-function"],
      },
    },
  },
  server: {
    allowedHosts: ["gaming.emu-ordinal.ts.net"],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        template: resolve(__dirname, "template.html"),
      },
    },
  },
};
