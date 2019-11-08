var path = require('path')
var webpack = require('webpack')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const nodeEnv = process.env.NODE_ENV
const isMini = process.env.PACKAGE_MINI === 'true'
const version = JSON.stringify(require('./package.json').version)
module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
    filename: 'qc-image-lrz.js',
    library: {
      root: 'QcImageLrz',
      amd: 'qc-image-lrz',
      commonjs: 'qc-image-lrz'
    }, // 指定的就是你使用require时的模块名
    libraryTarget: 'umd', // 指定输出格式
    umdNamedDefine: true // 会对 UMD 的构建过程中的 AMD 模块进行命名。否则就使用匿名的 define
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.vue', '.json']
  },
  devServer: {
    host: 'localhost',
    historyApiFallback: true,
    noInfo: true,
    overlay: true
  },
  performance: {
    hints: false
  },
  devtool: '#eval-source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        VERSION: version
      }
    })
  ]
}
console.log({
  nodeEnv: nodeEnv,
  isMini: isMini,
  version: version
})
if (nodeEnv === 'production') {
  module.exports.optimization = {
    namedModules: true,
    namedChunks: true,
    minimizer: [
      new UglifyJSPlugin({
        sourceMap: false,
        uglifyOptions: {
          extractComments: true,
          output: {
            comments: false
          },
          cache: true,
          parallel: true
        }
      })
    ]
  }
  module.exports.devtool = '#source-map'
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"' + process.env.NODE_ENV + '"',
        VERSION: version
      }
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ])
}
