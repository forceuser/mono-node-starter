import nodePath from "node:path";
import process from "node:process";
import fs from "fs-extra";
import {fileURLToPath} from "url";
import findPackageRoot from "find-package-json";

const __mainfile = nodePath.resolve(process.argv[1]);
const __maindir = nodePath.dirname(__mainfile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

const packageInfo = findPackageRoot(__maindir).next();

export const packagePath = packageInfo.filename;
export const packageDir = nodePath.dirname(packagePath);
export let pkg = getPackageInfo();

export const envPrefix = `${pkg.name.replace(/-/, "_").toUpperCase()}_APP`;
export const envDir = nodePath.resolve(packageDir, "env");

export function getPackageInfo () {
	return JSON.parse(fs.readFileSync(packagePath, "utf8"));
}

export function reloadPackageInfo () {
	pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
	return pkg;
}

export const getAliasesFromSubpathImports = (format = "vite", atAlias = true) => {
	const findEntry = (atAlias, entries) => (typeof atAlias === "string" ? entries.find($ => $[0] === atAlias || $[0].replace(/\/\*?$/, "") === atAlias) : entries?.[0])?.[1];

	if (format === "vite") {
		const entries = Object.entries(pkg?.imports || {})
			.map(([key, value]) => {
				return [key.replace("*", ""), nodePath.join(nodePath.resolve(packageDir, value.default.replace("*", "")), "/")];
			});

		let atEntry;
		if (atAlias) {
			atEntry = ["@/", findEntry(atAlias, entries)];
		}
		const items = Object.fromEntries([atEntry, ...entries].filter($ => $));

		console.log("ALIASES vite", items);

		return items;
	}
	else if (format === "tsconfig") {
		const entries = Object.entries(pkg?.imports || {})
			.map(([key, value]) => {
				return [key, [nodePath.relative("./", value.default)]];
			});
		console.log("entries", entries);

		let atEntry;
		if (atAlias) {
			atEntry = ["@/*", findEntry(atAlias, entries)];
		}
		const items = Object.fromEntries([atEntry, ...entries].filter($ => $));

		console.log("ALIASES tsconfig", items);

		return items;
	}
};
