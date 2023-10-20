export default h;

function h (tag = "div", data = {}, content) {
	if (typeof data === "string") {
		data = {};
		content = data;
	}
	const single = typeof tag === "string" || tag instanceof Node;
	const result = [].concat(tag).map((el) => {
		if (typeof el === "string") {
			el = document.createElement(tag);
		}
		if (typeof content === "string") {
			el.textContent = content;
		}
		if (data.html) {
			el.innerHTML = data.html;
		}
		else if (typeof content === "object" && Array.isArray(content)) {
			content.forEach((item) => el.append(item));
		}

		if (data.attr) {
			Object.entries(data.attr).forEach(([key, value]) => el.setAttribute(key, value));
		}
		if (data.prop) {
			Object.entries(data.prop).forEach(([key, value]) => {
				el[key] = value;
			});
		}
		if (data.on) {
			Object.entries(data.on).forEach(([key, value]) => el.addEventListener(key, value));
		}
		if (data.style) {
			Object.entries(data.style).forEach(([key, value]) => el.style.setProperty(key, value));
		}
		if (data.class) {
			if (typeof data.class === "string") {
				data.class = data.class.split(/\s/);
			}
			if (!Array.isArray(data.class)) {
				data.class = Object.entries(data.class)
					.filter(([key, value]) => !!value)
					.map(([key, value]) => key);
			}
			data.class.forEach((item) => el.classList.add(item));
		}
		return el;
	});
	return single ? result[0] : result;
}

const func = (f) => (typeof f === "function" ? f() : f);

h.ifelse = (condition, nodes, elseNodes) => {
	condition = func(condition);
	if (condition) {
		nodes = func(nodes);
		return [].concat(nodes === undefined ? [] : nodes);
	}
	else {
		elseNodes = func(elseNodes);
		return [].concat(elseNodes === undefined ? [] : elseNodes);
	}
};

h.join = (items) => {
	return [].concat(items == null ? [] : items).join("");
};

h.ref = () => {
	const map = {};
	return (key, value) => {
		if (value != null) {
			map[key] = value;
		}
		return map[key];
	};
};

h.htmlFirst = (html, data) => h(h("div", {html}).firstElementChild, data);
h.escape = (unsafe) => {
	unsafe = h.join(unsafe);
	if (typeof unsafe === "string") {
		return unsafe
			.replace(/&(?!(#\d+|\w{2,5});)/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
	return "";
};

export function html (strings, ...values) {
	const res = (strings || [])
		.reduce((res, string, i) => res + string + h.join(values[i]), "")
		.trim();
	return res;
}
