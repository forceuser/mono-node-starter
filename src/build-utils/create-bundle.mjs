import nodePath from "node:path";
import fs from "fs-extra";
import exec from "#common/node/exec.js";

export async function createBundle (rootDir, bundleDir, toCopy = [], pruneDevDeps = false) {
	try {
		await fs.remove(bundleDir);
	}
	catch {}
	await fs.ensureDir(bundleDir);
	const errors = [];
	await toCopy.reduce(async (prev, path) => {
		await prev;
		try {
			const srcPath = nodePath.resolve(rootDir, path);
			const targetPath = nodePath.resolve(bundleDir, path);
			if (fs.existsSync(srcPath)) {
				await fs.copy(srcPath, targetPath);
			}
		}
		catch (error) {
			errors.push(error);
		}
	}, null);
	if (pruneDevDeps) {
		await exec("npm prune --omit=dev", {cwd: bundleDir});
	}
	try {
		await fs.remove(nodePath.resolve(bundleDir, "node_modules/.cache"));
	}
	catch {}
	if (errors.length) {
		console.log("There are some errors while copying files", errors);
	}
}
