module.exports = {
    entry: ['babel-polyfill', './src/js/index.js'],
    node: {
      fs: "empty",
      net: "empty"
    },
    module: {
      loaders: [
          {
              loader: 'babel-loader',
              exclude: /node_modules/,
              query: {
                  presets: ['env']
              }
          }
      ]
    },
    output: {
        path: __dirname,
        filename: "bundle.js"
    }
}
