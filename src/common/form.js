
export function dataToUrlParams (data, filter = true) {
	if (typeof HTMLFormElement !== "undefined" && data instanceof HTMLFormElement) {
		data = new FormData(data);
	}
	if (typeof FormData !== "undefined" && data instanceof FormData) {
		data = data.entries();
	}
	else {
		data = Object.entries(data);
	}
	if (filter) {
		data = [...data].filter(([, value]) => value != null);
	}
	return new URLSearchParams(data);
}
