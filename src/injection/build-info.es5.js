(function () {
	if ("console" in window) {
		let locale = document.documentElement.lang || "en";
		let meta = {timestamp: document.querySelector("meta[name='build-timestamp']"), version: document.querySelector("meta[name='build-version']")};
		window.buildInfo = {};

		if (meta.timestamp) {
			if (meta.timestamp.content === "runtime") {
				window.buildInfo.timestamp = meta.timestamp.content;
				console.log("%cBuild timestamp: %s", "color: #ad5a43", "runtime - " + (Date.prototype.toLocaleString ? new Date().toLocaleString(locale) : new Date().toString()));
			}
			else {
				window.buildInfo.timestamp = new Date(meta.timestamp.content);
				console.log("%cBuild timestamp: %s", "color: #93af44", Date.prototype.toLocaleString ? window.buildInfo.timestamp.toLocaleString(locale) : window.buildInfo.timestamp.toString());
			}
		}
		if (meta.version) {
			window.buildInfo.version = meta.version.content;
			console.log("%cBuild version: %s", "color: #3ca8b2", window.buildInfo.version);
		}
	}
})();
