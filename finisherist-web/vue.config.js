// Using svg-loader, extra config to handle both inline svg and dynamically loaded svg
// Reference: https://www.fabiofranchino.com/blog/inject-svg-in-dom-with-vue/
function registerSvgLoader(config) {
  const svgRule = config.module.rule("svg")
  svgRule.uses.clear()

  config.module
    .rule("svg")
    // handle 'inline' svg: "*.svg?inline" --> use the vue-svg-loader to load content of svg
    .oneOf("inline-svg")
    .resourceQuery(/inline/)
    .use("vue-loader")
    .loader("vue-loader") // or `vue-loader-v16` if you are using a preview support of Vue 3 in Vue CLI
    .end()
    .use("vue-svg-loader")
    .loader("vue-svg-loader")
    .end()
    .end()
    // handle normal svg reference as src in image tag
    .oneOf("file")
    .use("file-loader")
    .loader("file-loader")
    .end()
    .end()
}

module.exports = {
  chainWebpack: (config) => {
    registerSvgLoader(config)
  },
}
