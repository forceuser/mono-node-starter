
const loadScripts = new WeakMap();

export const loadScript = (src, exports, {
	doc = document,
	appendTo = "head",
	waitForExports = 10_000,
} = {}) => {
	let script = doc.querySelector(`script[src="${src}"]`);
	let loading;
	exports = exports ? [].concat(exports) : [];
	const isExportsResolved = () => exports.every(key => globalThis[key]);
	const resolveExports = (resolve) => resolve(exports.map(key => globalThis[key]));

	if (!script) {
		script = doc.createElement("script");
		script.setAttribute("data-dynamic-script", "loading");
		loading = new Promise((resolve, reject) => {
			script.addEventListener("load", async () => {
				script.setAttribute("data-dynamic-script", "ready");
				if (exports && waitForExports) {
					let now = Date.now();
					const end = now + (typeof waitForExports === "number" ? waitForExports : 10_000);
					while (!isExportsResolved()) {
						await new Promise(resolve => setTimeout(resolve, 50));
						now = Date.now();
						if (now > end) {
							if (isExportsResolved()) {
								resolveExports(resolve);
								return;
							}
							break;
						}
					}
				}
				setTimeout(() => {
					resolveExports(resolve);
				});
			});
			script.addEventListener("error", () => {
				script.remove();
				reject();
			});
			script.src = src;
			const appendToNode = doc.querySelector(appendTo);
			if (appendToNode) {
				appendToNode.appendChild(script);
			}
		});
		loadScripts.set(script, loading);
		return loading;
	}
	loading = loadScripts.get(script) || new Promise(resolve => resolveExports(resolve));
	return loading;
};

