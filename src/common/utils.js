

export const line = (x, {x1 = 0, y1 = 0, x2 = 1, y2 = 1, easingFn}) => {
	if (easingFn) {
		return line(easingFn(line(x, {x1, y1: 0, x2, y2: 1})), {x1: 0, y1, x2: 1, y2});
	}
	return x2 === x1 ? y1 : ((x - x1) / (x2 - x1)) * (y2 - y1) + y1;
};
export const lineLimit = (x, {x1 = 0, y1 = 0, x2 = 1, y2 = 1, easingFn}) => line(Math.max(Math.min(x1, x2), Math.min(Math.max(x1, x2), x)), {x1, y1, x2, y2, easingFn});
export const lerp = line;
export const lerpLimit = lineLimit;

export const round = (value, acc = 100000) => Math.round(value * acc) / acc;
export const getMax = (...args) => Math.max(...args.filter(i => i != null));
export const getMin = (...args) => Math.min(...args.filter(i => i != null));
export const clamp = (value, min, max) => Math.max(min > max ? max : min, Math.min(min > max ? min : max, value));
export const cycle = (value, max = 1, min = 0) => (value = value - min, (value < 0 ? ((max + (value % max)) % max) : value % max) + min);


export const toArray = (obj) => Object.keys(obj).map(key => ({key, value: obj[key]}));
export const each = (list, fn) => Object.keys(list).map(key => fn(list[key], key));
export const allEqual = (array) => array.every(val => val === array[0]);
export const splitChunks = (a, n) => a.length ? [...Array(Math.ceil(a.length / n))].map((_, i) => a.slice(n * i, n + n * i)) : [];
export const flattenDeep = (array, parent = []) =>
	array.reduce((parent, item) => (Array.isArray(item) ? flattenDeep(item, parent) : parent.push(item), parent), parent);


export const clone = (obj) => JSON.parse(JSON.stringify(obj));
export const cloneDeep = (source) => {
	if (source && typeof source === "object") {
		if (Array.isArray(source)) {
			return source.map(cloneDeep);
		}
		else if (Object.prototype.toString.call(source) === "[object Date]") {
			return new Date(+source);
		}
		const target = {};
		Object.keys(source).forEach(key => {
			target[key] = cloneDeep(source[key]);
		});
		return target;
	}
	return source;
};

export const merge = (...args) => Object.assign.apply(null, args.flat().map(obj => Object.fromEntries(Object.entries(obj || {}).filter(([_, value]) => typeof value !== "undefined"))));
export const extend = (target, ...sources) =>
	(sources.forEach(source => Object.defineProperties(target, Object.keys(source)
		.reduce((descriptors, key) => (descriptors[key] = Object.getOwnPropertyDescriptor(source, key), descriptors), {}))), target);


export const toBoolean = (val) => {
	if (typeof val === "string") {
		return val === "true";
	}
	return !!val;
};

export const toObject = (src) => {
	try {
		if (typeof src === "object") {
			return Object.getOwnPropertyNames(src).reduce((res, key) => (res[key] = src[key], res), {});
		}
	}
	catch {}
	return src;
};

export const functionValue = (f, ...args) => (typeof f === "function" ? f(...args) : f);
export const ifelse = (condition, nodes, elseNodes) => {
	condition = functionValue(condition);
	if (condition) {
		nodes = functionValue(nodes);
		return [].concat(nodes === undefined ? [] : nodes);
	}
	else {
		elseNodes = functionValue(elseNodes);
		return [].concat(elseNodes === undefined ? [] : elseNodes);
	}
};

export const tryEx = (tryFn, catchFn, finallyFn) => {
	try {
		return functionValue(tryFn);
	}
	catch (error) {
		return functionValue(catchFn);
	}
	finally {
		functionValue(finallyFn);
	}
};

export const tryExAsync = async (tryFn, catchFn, finallyFn) => {
	try {
		return await functionValue(tryFn);
	}
	catch (error) {
		return functionValue(catchFn);
	}
	finally {
		await functionValue(finallyFn);
	}
};
