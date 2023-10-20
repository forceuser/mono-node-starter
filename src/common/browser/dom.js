export function wrapNode (el) {
	const parent = document.createElement("div");
	el.after(parent);
	parent.appendChild(el);
	return parent;
}

export function unwrapNode (parent) {
	const childNodes = [...parent.childNodes];
	childNodes.reduce((prev, child) => (prev.after(child), child), parent);
	parent.remove();
	return childNodes;
}

export function getLang (fallbackLang = "en") {
	const locale = getLocale(fallbackLang);
	return (locale.split("_")[1] || locale.toLowerCase());
}

export function getLocale (fallbackLocale = "en") {
	const locale = document.documentElement.lang;
	if (locale) {
		return locale;
	}
	if (navigator.languages && navigator.languages.length) {
		return navigator.languages[0];
	}
	return navigator.userLanguage || navigator.language || navigator.browserLanguage || fallbackLocale;
}
