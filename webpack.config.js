const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const webpack = require('webpack');
module.exports = (_, argv) => {
    const hot = argv.hotOnly;

    return {
        entry: path.join(__dirname, "src", "index.js"),
        output: { path: path.join(__dirname, "build"), filename: "index.bundle.js" },
        mode: process.env.NODE_ENV || "development",
        resolve: { modules: [path.resolve(__dirname, "src"), "node_modules"] },
        devServer: {
            static: { directory: path.join(__dirname, "src") },
            historyApiFallback: { index: '/index.html' }
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules\/(?!(@tradingproject19|@t0x1c3500)\/react-stockcharts)/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                [require.resolve("@babel/preset-env"), { targets: "defaults" }],
                                require.resolve("@babel/preset-react")
                            ],
                            plugins: [
                                // this code will evaluate to "false" when
                                // "isDevelopment" is "false"
                                // otherwise it will return the plugin
                                hot && require("react-refresh/babel")
                                // this line removes falsy values from the array
                            ].filter(Boolean),
                        },
                    },
                },
                {
                    test: /\.(css|scss)$/,
                    use: ["style-loader", "css-loader", "sass-loader"],
                },
                {
                    test: /\.(woff(2)?|ttf|eot|jpg|jpeg|png|gif|mp3|svg)$/,
                    use: ["file-loader"]
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: path.join(__dirname, "src", "index.html"),
                inject: 'body'
            }),
            // Firebase SDK_VERSION is now handled in Firebase.js before any firebase modules load
            new webpack.ProvidePlugin({
                process: 'process/browser',
            }),
            hot && new ReactRefreshWebpackPlugin()
        ].filter(Boolean),
    };
}