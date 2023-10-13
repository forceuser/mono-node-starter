import process from "node:process";
import nodePath from "node:path";
import fs from "fs-extra";


const get = (src, path) => {
	if (src == null) {
		return undefined;
	}
	let p = path.replace(/["']/g, "").replace(/\[/g, ".").replace(/\]/g, "");
	let c = src;
	if (p && typeof c !== "object") {
		return undefined;
	}
	while (p) {
		if (c == null || typeof c !== "object") {
			return undefined;
		}
		if (p in c) {
			return c[p];
		}
		else {
			const $p = p.split(/\.(.+)/);
			if ($p[0] in c) {
				c = c[$p[0]];
				p = $p[1];
			}
			else {
				return undefined;
			}
		}
	}
	return c;
};

const set = (src, path, value) => {
	const p = path.replace(/["']/g, "").replace(/\[/g, ".").replace(/\]/g, "").split(".");
	let c = src;
	if (p[0] && c) {
		for (let i = 0; i < p.length; i++) {
			if (!c) {
				return;
			}
			if (i !== p.length - 1 && typeof c[p[i]] !== "object") {
				c[p[i]] = {};
			}
			else if (i === p.length - 1) {
				c[p[i]] = value;
			}
			if (c && typeof c[p[i]] === "object") {
				c = c[p[i]];
			}
		}
	}
	return src;
};


export function readConfig (file) {
	let result = {};
	if (fs.pathExistsSync(file)) {
		const fp = nodePath.resolve(process.cwd(), file);
		console.log("config properties file path", fp);
		const content = fs.readFileSync(fp, "utf-8");
		console.log("config properties content", content);
		result = content.split("\n")
			.map($ => $.trim())
			.filter($ => !$.startsWith("#"))
			.reduce((src, line) => {
				let [path, value] = line.split(/=(.*)/s).map($ => $.trim());
				set(src, path, value);
				return src;
			}, result);
		console.log("config properties parsed result", result);
	}

	return result;
}
