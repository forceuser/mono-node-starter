import {createFileReaderWithCache} from "#common/node/file.js";
const defaultReader = createFileReaderWithCache();

export function wrapInjectionsWithScripts (injections, keyList) {
	keyList = keyList || Object.keys(injections);
	return keyList
		.map((key) => {
			if (Object.hasOwn(injections, key)) {
				const value = injections[key];
				return `<script id="script--${key}" type="text/javascript">${value}</script>`;
			}
		})
		.filter($ => $)
		.join("\n");
}

export async function injectCode (injectConfig, fileReader = defaultReader) {
	return Object.entries(injectConfig)
		.reduce(async (prev, [key, settings]) => {
			const acc = await prev;
			if (settings) {
				const {src, replacements = []} = settings;
				let content = await fileReader.readFile(src, "utf8");
				replacements.forEach(([search, replace]) => {
					content = content.replaceAll(search, replace);
				});
				acc[key] = content;
			}
			return acc;
		}, {});
}
