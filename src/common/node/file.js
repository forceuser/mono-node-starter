import fs from "fs-extra";

export function createFileReaderWithCache () {
	const ctrl = {
		cache: {},
		async readFile (filePath, ...args) {
			if (ctrl.cache[filePath]) {
				return ctrl.cache[filePath];
			}
			const promise = fs.readFile(filePath, ...args);
			ctrl.cache[filePath] = promise;
			return promise;
		},
	};
	return ctrl;
}
