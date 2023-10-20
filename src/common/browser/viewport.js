
export const findAndScroll = (query) => {
	if (typeof document !== "undefined") {
		const el = document.querySelector(query);
		if (el) {
			el.scrollIntoView({behavior: "smooth", block: "start"});
			const input = el.querySelector("input, textarea, select");
			if (input) {
				input.focus({preventScroll: true});
			}
		}
	}
};


export function cloneRect (rect) {
	return {
		top: rect.top,
		right: rect.right,
		bottom: rect.bottom,
		left: rect.left,
		width: rect.width,
		height: rect.height,
		x: rect.x,
		y: rect.y,
	};
}

export function rectToOffsetParent (r, rect) {
	return Object.assign(r, {
		left: r.left - rect.left,
		right: rect.right - r.right,
		top: r.top - rect.top,
		bottom: rect.bottom - r.bottom,
		width: r.width,
		height: r.height,
	});
}


export function intersect (rect1, rect2) {
	return !(
		rect1.right < rect2.left ||
		rect1.left > rect2.right ||
		rect1.bottom < rect2.top ||
		rect1.top > rect2.bottom
	);
}

export function intersectionRect (rect1, rect2) {
	return intersect(rect1, rect2) && {
		left: Math.max(rect1.left, rect2.left),
		top: Math.max(rect1.top, rect2.top),
		right: Math.min(rect1.right, rect2.right),
		bottom: Math.min(rect1.bottom, rect2.bottom),
	};
}

export const getViewportRect = () => {
	return {
		left: 0,
		right: window.innerWidth || document.documentElement.clientWidth,
		top: 0,
		bottom: window.innerHeight || document.documentElement.clientHeight,
		width: window.innerWidth || document.documentElement.clientWidth,
		height: window.innerHeight || document.documentElement.clientHeight,
	};
};

export function initResponsiveViewport () {
	let fallbackSafeArea = "";
	const m = navigator.userAgent.match(/iPhone OS ([^\s]+)/);
	const p = m?.[1]?.split?.("_") || [];
	let prev = 0;
	if (window.visualViewport) {
		const updateViewport = () => {
			const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
			const space = vh - window.visualViewport.height;
			if (prev === space) {
				return true;
			}
			if (space > 0) {
				[
					document.activeElement.closest("[data-fixinput]"),
					// document.querySelector(".app-root"),
				].forEach(main => {
					main.style.transition = "height 0.1s ease";
					main.style.height = `${main.getBoundingClientRect().height}px`;
					setTimeout(() => {
						main.style.flex = "0 0 auto";

						if (+(p[0] || 0) === 15) {
							if (+(p[1] || 0) < 2) {
								fallbackSafeArea = ", 1.8rem";
							}
							main.style.height = `calc(${window.visualViewport.height}px - max(env(safe-area-inset-bottom)${fallbackSafeArea}))`;
						}
						else {
							main.style.height = `${window.visualViewport.height}px`;
						}
					});
				});
				document.activeElement.scrollIntoView({block: "center"});
				window.scrollBy({top: -space / 2, behavior: "instant"});
			}
			else {
				[
					...document.querySelectorAll("[data-fixinput]"),
				].forEach(main => {
					main.style.height = `${window.visualViewport.height}px`;
					setTimeout(() => {
						main.style = null;
					}, 50);
				});
			}
			prev = space;
		};

		const updOnce = () => {
			if (updateViewport()) {
				window.visualViewport.removeEventListener("resize", updOnce);
			}
		};

		document.addEventListener("focusin", event => {
			if (event.target.matches("[data-fixinput] *")) {
				window.visualViewport.addEventListener("resize", updOnce);
			}
		});
		document.addEventListener("focusout", event => {
			if (event.target.matches("[data-fixinput] *")) {
				window.visualViewport.addEventListener("resize", updOnce);
			}
		});
	}
}
