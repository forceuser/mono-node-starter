import process from "node:process";
import yargs from "yargs";
import {initLoggerV1, toJson} from "#root/logger/index.js";

export async function starter (createAppFn, {
	$app,
	pkg,
	onCreateLogger,
	onBuildConfig,
	onGetConfigList,
	onStartApp,
} = {}) {
	if (!$app) {
		$app = createAppFn();
		$app.health = $app.health || {};
		$app.name = $app.name || pkg.name;
		$app.version = $app.version || pkg.version;
	}
	const configList = await onGetConfigList?.({$app}) || [];
	console.log("configList", configList);

	const configRaw = Object.assign({}, ...configList);

	await yargs(process.argv.slice(2))
		.parserConfiguration({
			"strip-aliased": true,
			"duplicate-arguments-array": false,
		})
		.command([
			{
				command: "start [port] [host] [backendUrl]",
				aliases: ["s"],
				describe: "start node server",
				handler: async argv => {

					$app.configRaw = configRaw;
					$app.configList = configList;
					$app.config = argv;
					$app.baseUrl = $app.config.baseUrl;

					$app.isProd = process.env.NODE_ENV === "production",
					$app.isDev = process.env.NODE_ENV === "development",
					$app.isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD,

					// eslint-disable-next-line require-atomic-updates
					$app.logger = await (
						(typeof onCreateLogger === "function")
							? onCreateLogger({$app})
							: initLoggerV1({
								graylog: {
									address: $app.config.glAddress,
									port: $app.config.glPort,
									proto: $app.config.glProto,
									level: $app.config.glLevel,
								},
								console: {
									level: $app.config.logLevel,
								},
							})
					);

					$app.logger.log({level: "info", message: `env prefix is: ${$app.envPrefix}`});
					$app.logger.log({level: "info", message: "starting app..."});
					$app.logger.log({level: "info", message: `app settings is: ${toJson(argv)}`});

					if (typeof onStartApp === "function") {
						await onStartApp($app);
					}
				},
				builder: yargs => {
					console.log("configRaw", configRaw);
					const configArgv = yargs
						.config(configRaw)
						.positional("http2", {
							describe: "use http2",
							type: "boolean",
							default: false,
						})
						.positional("https", {
							describe: "use https",
							type: "boolean",
							default: false,
						})
						.positional("secure-key", {
							describe: "ssl key for https",
							type: "string",
						})
						.positional("secure-cert", {
							describe: "ssl cert for https",
							type: "string",
						})
						.positional("secure-ca", {
							describe: "ssl ca for https",
							type: "string",
						})
						.positional("backend-url", {
							alias: ["b"],
							describe: "backend server origin url",
							type: "string",
						})
						.positional("trust-proxy", {
							alias: ["t"],
							describe: "use behind reverse proxy",
							type: "boolean",
							default: true,
						})
						.positional("port", {
							alias: ["p", "http-port"],
							describe: "server port",
							type: "number",
							default: 80,
						})
						.positional("https-port", {
							describe: "server port",
							type: "number",
							default: 443,
						})
						.positional("host", {
							alias: ["h"],
							describe: "server host or ip",
							type: "string",
							default: "0.0.0.0",
						})
						.positional("consul-host", {
							describe: "consul host",
							type: "string",
						})
						.positional("consul-port", {
							describe: "consul port",
							type: "number",
						})
						.positional("consul-token", {
							describe: "consul token",
							type: "string",
						})
						.positional("consul-kv", {
							describe: "consul kv key",
							type: "string",
						})
						.positional("gl-address", {
							describe: "graylog host",
							type: "string",
						})
						.positional("gl-port", {
							describe: "graylog port",
							type: "number",
							// default: undefined,
						})
						.positional("gl-start", {
							describe: "graylog enabled",
							type: "boolean",
						})
						.positional("gl-proto", {
							describe: "graylog protocol",
							type: "string",
							default: "udp",
						})
						.positional("gl-level", {
							describe: "graylog log level",
							type: "string",
							default: "info",
						})
						.positional("log-level", {
							describe: "log level",
							type: "string",
							default: "info",
						})
						.positional("letsencrypt-dir", {
							describe: "letsencrypt directory",
							type: "string",
						})
						.positional("multiprocess", {
							alias: ["multi"],
							describe: "use nodejs cluster",
							type: "number",
							default: 0,
						})
						.positional("mode", {
							alias: ["appMode"],
							describe: "dev server environment mode",
							type: "string",
							default: process.env.VITE_APP_MODE,
						})
						.positional("ssr", {
							alias: [],
							describe: "is server side rendering enabled",
							type: "boolean",
							default: false,
						})
						.positional("csp", {
							alias: [],
							describe: "is csp headers enabled",
							type: "boolean",
							default: false,
						})
						.positional("csrf", {
							alias: [],
							describe: "is csrf protection enabled",
							type: "boolean",
							default: false,
						})
						.positional("baseUrl", {
							alias: [],
							describe: "baseUrl to run the app",
							type: "string",
							default: "/",
						})
						.positional("vhost", {
							alias: [],
							describe: "use vhost settings to start server",
							type: "boolean",
						});

					return typeof onBuildConfig === "function" ? onBuildConfig(configArgv) : configArgv;
				},
			},
		])
		.help("help")
		.demandCommand()
		.showHelpOnFail(true)
		.argv;
}


export default starter;
