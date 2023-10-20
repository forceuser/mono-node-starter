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

export function getPackageInfo () {
	return JSON.parse(fs.readFileSync(packagePath, "utf8"));
}

export function reloadPackageInfo () {
	pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
	return pkg;
}

export const getAliasesFromSubpathImports = (format = "vite") => {
	if (format === "vite") {
		return {
			"@/": `${nodePath.resolve(packageDir, "front")}/`,
			...Object.fromEntries(
				Object.entries(pkg?.imports || {})
					.map(([key, value]) => {
						return [key.replace("*", ""), nodePath.join(nodePath.resolve(packageDir, value.default.replace("*", "")), "/")];
					})
			),
		};
	}
	else if (format === "tsconfig") {
		return {
			"@/*": [`front/*`],
			...Object.fromEntries(
				Object.entries(pkg?.imports || {})
					.map(([key, value]) => {
						return [key, [nodePath.relative("./", value.default)]];
					})
			),
		};
	}
};
