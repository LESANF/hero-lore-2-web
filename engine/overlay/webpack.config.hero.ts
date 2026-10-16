// Our entry on top of wie's build: same loaders, wasm-pack and copies, but the page is ours.
import webpack from "webpack";
import { merge } from "webpack-merge";
import HtmlBundlerPlugin from "html-bundler-webpack-plugin";

// @ts-ignore: allowImportingTsExtensions
import commonConfig from "./webpack.config.common.ts";

const base = commonConfig("production");
base.plugins = (base.plugins ?? []).filter(p => !(p instanceof HtmlBundlerPlugin));
base.plugins.push(
  new HtmlBundlerPlugin({
    entry: { index: { import: "src/html/hero.html" } },
    js: { filename: "assets/js/[name].[contenthash:8].js" },
    css: { filename: "assets/css/[name].[contenthash:8].css" },
  }),
);

const config: webpack.Configuration = merge(base, { mode: "production", devtool: false });
export default config;
