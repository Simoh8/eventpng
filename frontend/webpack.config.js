const webpack = require('webpack');

module.exports = {
  // Your existing webpack config goes here
  resolve: {
    fallback: {
      url: require.resolve('url/'),
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      buffer: false,
      util: false,
      assert: false,
      process: false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};
