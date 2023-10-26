function onready (callback) {
	function callbackHandler () {
		if (document.readyState === "complete") {
			callback();
		}
	}
	document.addEventListener("readystatechange", callbackHandler);
	callbackHandler();
}
