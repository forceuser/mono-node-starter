const FLAG_PREFIX = "feat-";

export function initFeatureFlags (flagsPrefix = FLAG_PREFIX) {
	if (typeof localStorage === "undefined") {
		return;
	}

	const updateFeatureHash = () => {
		const url = new URL(location.href);
		const hash = url.hash.replace(/^#/, "");
		if (hash.startsWith(flagsPrefix)) {
			const key = hash.split("=")[0];
			const value = hash.split("=")[1] || true;
			localStorage?.setItem?.(key, value);
			window.location.hash = "";
			window.location.reload();
		}
	};

	window.addEventListener("hashchange", () => {
		updateFeatureHash();
	});
	updateFeatureHash();
}

export function getFeatureFlag (key, defaultValue = "false", flagsPrefix = FLAG_PREFIX) {
	return localStorage?.getItem?.(`${flagsPrefix}${key}`) || defaultValue;
}

