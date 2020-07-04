const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const changeCase = require('change-case');

console.log(chalk.yellow('# Compiling with Webpack configuration'));
console.log(chalk.yellow(`# Compiling Plugin ${path.basename(globalThis.pluginDir)}`));

const isDev = process.env.mode === 'development';
const isProd = process.env.mode !== 'development';

if (isDev) {
    console.log(chalk.yellow('# Development mode is activated \u{1F6E0}'));
    console.log(chalk.yellow(`BaseUrl for proxy is set to "${process.env.APP_URL}"`));
    process.env.NODE_ENV = 'development';
} else {
    console.log(chalk.yellow('# Production mode is activated \u{1F680}'));
    process.env.NODE_ENV = 'production';
}

const pluginEntries = (() => {
    const pluginPath = globalThis.pluginDir;
    const composerFile = path.resolve(pluginPath, 'composer.json');

    const composerJson = JSON.parse(fs.readFileSync(composerFile));
    let pluginClass = composerJson.extra['shopware-plugin-class'].split('\\');
    let technicalPluginName = changeCase.snakeCase(pluginClass[pluginClass.length -1]).replace(/_/g, '-');

    let webpackPath = path.resolve(pluginPath, 'src/Resources/app/administration/build/webpack.config.js');

    return [
        {
            name: technicalPluginName,
            technicalName: technicalPluginName,
            basePath: pluginPath,
            path: pluginPath,
            filePath: path.resolve(pluginPath, 'src/Resources/app/administration/src/main.js'),
            webpackConfig: fs.existsSync(webpackPath) ? webpackPath: null,
        }
    ];
})();

// console log break
console.log();

const webpackConfig = {
    mode: isDev ? 'development' : 'production',

    stats: {
        all: false,
        colors: true,
        modules: true,
        maxModules: 0,
        errors: true,
        warnings: true,
        entrypoints: true,
        timings: true,
        logging: 'warn'
    },

    performance: {
        hints: false
    },

    optimization: {
        moduleIds: 'hashed',
        chunkIds: 'named',
        runtimeChunk: { name: 'runtime' },
        splitChunks: {
            cacheGroups: {
                'runtime-vendor': {
                    chunks: 'all',
                    name: 'vendors-node',
                    test: path.join(__dirname, 'node_modules')
                }
            },
            minSize: 0
        },
        ...(() => {
            if (isProd) {
                return {
                    minimizer: [
                        new TerserPlugin({
                            terserOptions: {
                                warnings: false,
                                output: 6
                            },
                            cache: true,
                            parallel: true,
                            sourceMap: false
                        }),
                        new OptimizeCSSAssetsPlugin()
                    ]
                };
            }
        })()
    },

    entry: {
        ...(() => {
            return pluginEntries.reduce((acc, plugin) => {
                acc[plugin.technicalName] = plugin.filePath;

                return acc;
            }, {});
        })()
    },

    output: {
        path: globalThis.compileDir,
        filename: 'static/js/[name].js',
        chunkFilename: 'static/js/[name].js',
        publicPath: `/bundles/administration/`,
        globalObject: 'this'
    },

    // Sync with .eslintrc.js
    resolve: {
        extensions: ['.js', '.vue', '.json', '.less', '.twig'],
        alias: {
            vue$: 'vue/dist/vue.esm.js',
            src: path.join(__dirname, 'src'),
            module: path.join(__dirname, 'src/module'),
            scss: path.join(__dirname, 'src/app/assets/scss'),
            assets: path.join(__dirname, 'static')
        }
    },

    module: {
        rules: [
            {
                test: /\.(html|twig)$/,
                loader: 'html-loader'
            },
            {
                test: /\.(js|tsx?|vue)$/,
                loader: 'babel-loader',
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'test'),
                    ...pluginEntries.map(plugin => plugin.filePath)
                ],
                options: {
                    compact: true,
                    cacheDirectory: true,
                    presets: [[
                        '@babel/preset-env', {
                            modules: false,
                            targets: {
                                browsers: ['last 2 versions', 'edge >= 17']
                            }
                        }
                    ]]
                }
            },
            {
                test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                exclude: [
                    path.join(__dirname, 'src/app/assets/icons/svg')
                ],
                loader: 'url-loader',
                options: {
                    limit: 10000,
                    name: 'static/img/[name].[ext]'
                }
            },
            {
                test: /\.svg$/,
                include: [
                    path.join(__dirname, 'src/app/assets/icons/svg')
                ],
                loader: 'svg-inline-loader',
                options: {
                    removeSVGTagAttrs: false
                }
            },
            {
                test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                loader: 'url-loader',
                options: {
                    limit: 10000,
                    name: 'static/fonts/[name].[hash:7].[ext]'
                }
            },
            {
                test: /\.worker\.(js|tsx?|vue)$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        inline: true
                    }
                }
            },
            {
                test: /\.css$/,
                use: [
                    'vue-style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: false
                        }
                    }
                ]
            },
            {
                test: /\.postcss$/,
                use: [
                    'vue-style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: false
                        }
                    }
                ]
            },
            {
                test: /\.less$/,
                use: [
                    'vue-style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: false
                        }
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            javascriptEnabled: true,
                            sourceMap: true
                        }
                    }
                ]
            },
            {
                test: /\.sass$/,
                use: [
                    'vue-style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: false
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            indentedSyntax: true,
                            sourceMap: true
                        }
                    }
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'vue-style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: false
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            },
            {
                test: /\.stylus$/,
                use: [
                    'vue-style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: false
                        }
                    },
                    {
                        loader: 'stylus-loader',
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            },
            {
                test: /\.styl$/,
                use: [
                    'vue-style-loader',
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: false
                        }
                    },
                    {
                        loader: 'stylus-loader',
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            }
        ]
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: isDev ? '"development"' : '"production"'
            }
        }),
        new MiniCssExtractPlugin({
            filename: 'static/css/[name].css'
        }),
    ]
};

const pluginWebpackConfigs = [];
pluginEntries.forEach(plugin => {
    if (!plugin.webpackConfig) {
        return;
    }

    const pluginWebpackConfigFn = require(path.resolve(plugin.webpackConfig));
    console.log(chalk.green(`# Plugin "${plugin.name}": Extends the webpack config successfully`));

    pluginWebpackConfigs.push(pluginWebpackConfigFn({
        basePath: plugin.basePath,
        env: process.env.NODE_ENV,
        config: webpackConfig,
        name: plugin.name,
        technicalName: plugin.technicalName,
        plugin
    }));
});

const mergedWebpackConfig = webpackMerge([webpackConfig, ...pluginWebpackConfigs]);

module.exports = mergedWebpackConfig;