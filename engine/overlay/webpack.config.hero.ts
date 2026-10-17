// Our entry on top of wie's build: same loaders, wasm-pack and copies, but the page is ours.
import webpack from "webpack";
import { merge } from "webpack-merge";
import HtmlBundlerPlugin from "html-bundler-webpack-plugin";

// @ts-ignore: allowImportingTsExtensions
import commonConfig from "./webpack.config.common.ts";

const base = commonConfig("production");
base.plugins = (base.plugins ?? []).filter(p => !(p instanceof HtmlBundlerPlugin));
// wie names images assets/img/[name][ext]; ours change in place (pad art), so hash them or a browser keeps the old ones
for (const rule of base.module?.rules ?? []) {
  const r = rule as webpack.RuleSetRule;
  if (r.type === "asset/resource" && String(r.test).includes("png")) r.generator = { ...r.generator, filename: "assets/img/[name].[contenthash:8][ext]" };
}
base.plugins.push(
  new webpack.DefinePlugin({ __APP_VERSION__: JSON.stringify(process.env.HERO_VERSION ?? "dev") }),
  new HtmlBundlerPlugin({
    entry: { index: { import: "src/html/hero.html" } },
    js: { filename: "assets/js/[name].[contenthash:8].js" },
    css: { filename: "assets/css/[name].[contenthash:8].css" },
  }),
);

const config: webpack.Configuration = merge(base, { mode: "production", devtool: false });
export default config;
