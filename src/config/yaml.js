import process from "node:process";
import nodePath from "node:path";

import fs from "fs-extra";
import {globbySync} from "globby";
import $yaml from "yaml";

export function readConfig (dir, {configType} = {}) {
	const result = {};
	console.log("config cwd", dir, fs.pathExistsSync(dir));
	if (fs.pathExistsSync(dir)) {
		const files = globbySync(["config*"], {cwd: dir, absolute: true});
		console.log("config files", files);
		const configs = files.reduce((res, fileAbs) => {
			const file = nodePath.basename(fileAbs, ".yaml");
			const parts = file.split(".");
			const data = $yaml.parse(fs.readFileSync(fileAbs, "utf8"));

			res[parts?.[1] || "default"] = data;
			return res;
		}, {});

		const order = (configType ? [configType] : ["default", process.env.VITE_APP_MODE || process.env.NODE_ENV, "local"]).filter($ => $);

		order.forEach(key => {
			if (configs[key]) {
				Object.assign(result, configs[key]);
			}
		});
	}

	return result;
}
