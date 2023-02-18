const path = require('path');

module.exports = {
    mode: "development",
    devtool: "eval-cheap-source-map",
    output: {
        path: path.resolve(__dirname, "../src/pylingdocs_gui/static"), 
    },
    resolve: {
        alias: {
            vue: 'vue/dist/vue.js'
        },
    },
    module: {
           rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      }
    ]
    }
}