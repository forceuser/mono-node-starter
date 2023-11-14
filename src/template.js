
import Handlebars from "handlebars";
import fs from "fs-extra";
import {splitChunks} from "#common/utils.js";

export function initHandlebars (require) {
	const handlebars = Handlebars.create();
	const injectCache = {};

	handlebars.registerHelper("resolve", (path) => {
		if (require) {
			return require.resolve(path);
		}
		else {
			return path;
		}
	});

	handlebars.registerHelper("replace", (content, ...args) => {
		const replacements = splitChunks(args, 2);
		content = String(content || "");
		replacements.forEach(([search, replace]) => {
			content = content.replaceAll(search, handlebars.escapeExpression(replace));
		});
		return new handlebars.SafeString(content);
	});

	handlebars.registerHelper("inject", (path, wrap = false) => {
		if (!injectCache[path]) {
			injectCache[path] = fs.readFileSync(path, "utf8");
		}

		if (wrap === "script") {
			return new handlebars.SafeString(`<script>${injectCache[path]}</script>`);
		}
		else if (wrap === "script-module") {
			return new handlebars.SafeString(`<script type="module">${injectCache[path]}</script>`);
		}
		else if (wrap === "style") {
			return new handlebars.SafeString(`<style>${injectCache[path]}</style>`);
		}
		return new handlebars.SafeString(injectCache[path]);
	});

	return handlebars;
}



