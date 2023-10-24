import process from "node:process";
import nodePath from "node:path";
import os from "node:os";

import yargs from "yargs";

import {readConfig as readConfigYaml} from "./config/yaml.js";
import {readConfig as readConfigProps} from "./config/properties.js";
import {readDotenv, readEnv, envToConfig} from "./config/env.js";
import {pkg as _pkg, packageDir as _packageDir, envPrefix as _envPrefix, envDir as _envDir} from "#common/node/package.js";

export async function parseAppArgs () {
	const {argv} = await yargs(process.argv.slice(2))
		.parserConfiguration({
			"strip-aliased": true,
			"duplicate-arguments-array": false,
		});
	console.log("argv", argv);
	return argv;
}

export async function initConfigListV1 ({
	pkg = _pkg,
	packageDir = _packageDir,
	envPrefix = _envPrefix,
	envDir = _envDir,
} = {}) {
	const argv = await parseAppArgs();
	const configList = [];

	const config_dotEnv = envToConfig(readDotenv(envDir, false), ["VITE", envPrefix, ["gl", "gl_"]]);
	const config_processEnv = envToConfig(readEnv(), ["VITE", envPrefix, ["gl", "gl_"]]);
	const config_package = readConfigYaml(packageDir);
	const config_userHome = readConfigYaml(nodePath.join(...[os.homedir(), "./app-config", pkg.appGroup, pkg.name].filter($ => $)), {configType: argv.configType});

	configList.push(config_dotEnv);
	configList.push(config_package);
	configList.push(config_userHome);
	configList.push(config_processEnv);

	if (argv.properties) {
		const config_properties = await readConfigProps(argv.properties);
		configList.push(config_properties);
	}

	return configList;
}


export async function initConfigV2 (envPrefix, envDir) {

}
