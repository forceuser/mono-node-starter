(function supportsAvif () {
	try {
		var img = new Image();
		img.onload = img.onerror = function () {
			if (img.naturalHeight === 1) {
				document.documentElement.classList.add("sup--avif");
			}
		};
		img.src = "data:image/avif;base64,AAAAHGZ0eXBtaWYxAAAAAG1pZjFhdmlmbWlhZgAAAOxtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAABEAAAQABAAAAAAEQAAEAAAATAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUltYWdlAAAAAGtpcHJwAAAATGlwY28AAAAUaXNwZQAAAAAAAAABAAAAAQAAABBwYXNwAAAAAQAAAAEAAAASYXYxQ4EAHAAKBBgABpUAAAAOcGl4aQAAAAABCAAAABdpcG1hAAAAAAAAAAEAAQQBAoOEAAAAG21kYXQKBBgABpUyCxZAAAEgAAF1VEKY";
	}
	catch (error) {}
})();
