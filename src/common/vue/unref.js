import {isRef, isProxy, toRaw, unref} from "vue";

export function fullyUnref (src) {
	let res = src;
	while (isRef(res) || isProxy(res)) {
		if (isRef(res)) {
			res = unref(res);
		}
		if (isProxy(res)) {
			res = toRaw(res);
		}
	}
	if (typeof res === "object") {
		res = Array.isArray(res) ? [...res] : {...res};
		Object.getOwnPropertyNames(res).forEach(key => {
			res[key] = fullyUnref(res[key]);
		});
	}
	return res;
}
