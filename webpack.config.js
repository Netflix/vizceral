/* eslint no-var:0 */
var webpack = require('webpack');

module.exports = {
  entry: './src/vizceral.js',
  output: {
    path: './dist',
    filename: 'vizceral.js',
    library: 'Vizceral',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel'
      },
      { test: /\.woff2?$/, loader: 'url?limit=10000&mimetype=application/font-woff' },
      { test: /\.otf$/, loader: 'file' },
      { test: /\.ttf$/, loader: 'file' },
      { test: /\.eot$/, loader: 'file' },
      { test: /\.svg$/, loader: 'url' },
      { test: /\.html$/, loader: 'html' },
      { test: /\.css$/, loader: 'style!css' }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEBUG__: process.env.NODE_ENV !== 'production',
      __HIDE_DATA__: !!process.env.HIDE_DATA
    }),
  ]
};
