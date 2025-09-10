const { override, addWebpackPlugin, addWebpackResolve } = require('customize-cra');
const webpack = require('webpack');

module.exports = override(
  // Add fallbacks for Node.js core modules
  config => ({
    ...config,
    resolve: {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        'process/browser': require.resolve('process/browser'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        url: require.resolve('url/'),
        fs: false,
        path: false,
        os: false,
        crypto: false,
        http: false,
        https: false,
      },
    },
    ignoreWarnings: [/Failed to parse source map/],
  }),
  
  // Add webpack plugins
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  ),
  
  // Add resolve aliases if needed
  addWebpackResolve({
    alias: {
      'react-facebook': false, // Disable react-facebook as we're using @greatsumini/react-facebook-login
    },
  })
);
