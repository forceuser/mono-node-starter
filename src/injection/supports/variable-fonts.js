(function supportsVariableFonts () {
	try {
		if ("CSS" in window === false || "supports" in CSS === false) {
			return false;
		}
		if (CSS.supports("(font-variation-settings: normal)")) {
			document.documentElement.classList.add("sup--variable-fonts");
		}
	}
	catch (error) {}
})();
