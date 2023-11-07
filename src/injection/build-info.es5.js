(function () {
	if ("console" in window) {
		var locale = document.documentElement.lang || "en";
		var meta = {
			timestamp: document.querySelector("meta[name='build-timestamp']"),
			version: document.querySelector("meta[name='build-version']"),
			commitHash: document.querySelector("meta[name='build-commit-hash']"),
			configHash: document.querySelector("meta[name='build-config-hash']")
		};
		window.buildInfo = {};

		if (meta.timestamp && meta.timestamp.content) {
			if (meta.timestamp.content === "runtime") {
				window.buildInfo.timestamp = meta.timestamp.content;
				console.log("%c\u2B23 Build timestamp: %s", "color: #ae3e1f", "runtime - " + (Date.prototype.toLocaleString ? new Date().toLocaleString(locale) : new Date().toString()));
			}
			else {
				window.buildInfo.timestamp = new Date(meta.timestamp.content);
				console.log("%c\u2B23 Build timestamp: %s", "color: #93af44", Date.prototype.toLocaleString ? window.buildInfo.timestamp.toLocaleString(locale) : window.buildInfo.timestamp.toString());
			}
		}
		if (meta.version && meta.version.content) {
			window.buildInfo.version = meta.version.content;
			console.log("%c\u2B23 Build version: %s", "color: #3ca8b2", window.buildInfo.version);
		}
		if (meta.commitHash && meta.commitHash.content) {
			window.buildInfo.commitHash = meta.commitHash.content;
			console.log("%c\u2B23 Commit hash: %s", "color: #b23caa", window.buildInfo.commitHash);
		}
		if (meta.configHash && meta.configHash.content) {
			window.buildInfo.configHash = meta.configHash.content;
			console.log("%c\u2B23 Config hash: %s", "color: #3c5db2", window.buildInfo.configHash);
		}
	}
})();
