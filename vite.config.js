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
};
