import process from "node:process";
import fs from "fs-extra";
import dotenvFlow from "dotenv-flow";
import modifyCase from "#common/modify-case.js";

export function readDotenv (envDir, extendProcessEnv = true) {
	const filenames = dotenvFlow.listFiles(envDir, {node_env: process.env.VITE_APP_MODE || process.env.NODE_ENV || "development"});
	const result = dotenvFlow.parse(filenames.filter(fn => fs.pathExistsSync(fn)));
	if (extendProcessEnv) {
		Object.assign(process.env, result);
	}
	return result;
}


export function envToConfig (env, prefixes) {
	const result = {};
	prefixes.forEach(prefix => {
		let replaceTo = "";
		if (Array.isArray(prefix)) {
			replaceTo = prefix[1];
			prefix = prefix[0];
		}
		prefix = prefix.toLowerCase();
		Object.entries(env).reduce((result, [key, value]) => {
			const pref = `${prefix}_`;
			if (key.toLowerCase().startsWith(pref)) {
				key = replaceTo + key.substr(pref.length);
				key = modifyCase(key, {format: "camel", breakByCase: true});

				result[key] = value;
			}

			return result;
		}, result);
	});
	return result;
}

export function readEnv () {
	return Object.assign({}, process.env);
}
