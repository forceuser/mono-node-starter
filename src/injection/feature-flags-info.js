(function () {
	if (typeof window.localStorage !== "undefined") {
		for (var i = 0, len = localStorage.length; i < len; ++i) {
			if (localStorage.key(i).indexOf("feat-") === 0) {
				console.log(
					"%c\u2B23 %s %c%s",
					"color: #a96dc9;",
					"feature flag \"" + localStorage.key(i).replace(/^feat-/, "") + "\":",
					"font-weight: bold; font-style: italic;",
					localStorage.getItem(localStorage.key(i))
				);
			}
		}
	}
})();
