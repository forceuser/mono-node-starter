(function supportsWebp () {
	try {
		let img = new Image();
		img.onload = img.onerror = function () {
			if (img.height === 2) {
				document.documentElement.classList.add("sup--webp");
			}
		};
		img.src = "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
	}
	catch (error) {}
})();
