const { ProvidePlugin } = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallback for process/browser
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        'process/browser': require.resolve('process/browser'),
        process: require.resolve('process/browser'),
        url: require.resolve('url/'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        fs: false,
        path: false,
        os: false,
        crypto: false,
        http: false,
        https: false,
      };

      // Add plugins
      webpackConfig.plugins = (webpackConfig.plugins || []).concat([
        new ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        }),
      ]);

      // Add rule for source maps
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      return webpackConfig;
    },
  },
};
