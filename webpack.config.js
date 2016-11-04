/* eslint no-var:0 */
var webpack = require('webpack');
var yargs = require('yargs');

var options = yargs
  .alias('p', 'optimize-minimize')
  .alias('d', 'debug')
  .argv;

var config = {
  entry: './src/vizceral.js',
  output: {
    path: './dist',
    filename: options.optimizeMinimize ? 'vizceral.min.js' : 'vizceral.js',
    library: 'Vizceral',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/,
      },
      { test: /\.glsl$/, loader: 'raw-loader' },
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

if (!options.optimizeMinimize) {
  config.devtool = 'source-map';
}

module.exports = config;
