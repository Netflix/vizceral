const path = require('path');
const webpack = require('webpack');
const yargs = require('yargs');

const options = yargs
  .alias('p', 'optimize-minimize')
  .alias('d', 'debug')
  .argv;

const config = {
  entry: './src/vizceral.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: options.optimizeMinimize ? 'vizceral.min.js' : 'vizceral.js',
    library: 'Vizceral',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      { test: /\.glsl$/, use: 'raw-loader' },
      { test: /\.woff2?$/, use: 'url-loader?limit=10000&mimetype=application/font-woff' },
      { test: /\.otf$/, use: 'file-loader' },
      { test: /\.ttf$/, use: 'file-loader' },
      { test: /\.eot$/, use: 'file-loader' },
      { test: /\.svg$/, use: 'url-loader' },
      { test: /\.html$/, use: 'html-loader' },
      { test: /\.css$/, use: 'style-loader!css-loader' }
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
