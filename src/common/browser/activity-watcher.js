import {createLogger} from "./app-logger";
import EventEmitter from "eventemitter3";

const log = createLogger(`color: #22a59a; font-weight: bold;`);

let activityWatcher;

export default class ActivityWatcher extends EventEmitter {
	static get (...args) {
		return activityWatcher || new ActivityWatcher(...args);
	}
	#private = {
		uninit: [],
	};
	constructor (settings = {}) {
		super();
		this.#private.events = settings.events ?? [
			"mousedown", "mousemove", "mouseup",
			"click", "auxclick", "dblclick", "wheel", "contextmenu",
			"touchstart", "touchmove", "touchend", "touchcancel",
			"pointerdown", "pointermove", "pointerup", "pointercancel",
			"keydown", "keyup", "keypress",
			"gesturestart", "gesturechange", "gestureend",
			"input", "focusin", "focusout",
			"scroll", "resize",
			"select", "selectionchange", "visibilitychange",
			"cut", "copy", "paste",
		];
		this.#private.document = settings.document ?? window?.document;
		this.#private.timeInactive = settings.timeInactive != null ? settings.timeInactive : 10 * 60 * 1000;
		this.#private.timeInactiveStart = settings.timeInactiveStart != null ? settings.timeInactiveStart : 7000;
		this.#private.settings = settings;
		this.#private.handler = event => {
			this.markActivity(event);
		};
		this.#private.logActivityState = () => {
			log("Activity state", `window: ${this.isWindowActive}, document: ${this.isTabActive}, user: ${this.lastActivity?.timestamp}`);
		};

		// this.private = this.#private;
		if (!activityWatcher) {
			activityWatcher = this;
		}
	}
	get isWindowActive () {
		return this.#private.isWindowActive != null ? this.#private.isWindowActive : this.isTabActive;
	}
	get isTabActive () {
		if ("hidden" in window.document) {
			return !window.document.hidden;
		}
		if ("visibilityState" in window.document) {
			return window.document.visibilityState !== "hidden";
		}

		return this.isUserActive;
	}
	get isUserActive () {
		if (this.#private.startTime) {
			const now = performance.now();
			if (this.lastActivity) {
				return this.#private.timeInactive <= 0 ? undefined : (now - this.lastActivity.relTime) < this.#private.timeInactive;
			}
			else {
				return (now) - this.#private.startRelTime < this.#private.timeInactiveStart;
			}
		}
		return false;
	}
	markActivity (event) {
		this.emit("activity", event);
		this.#private.lastActivity = {
			event,
			timestamp: new Date(),
			relTime: performance.now(),
		};
		this.updateState();
	}
	get lastActivity () {
		return this.#private.lastActivity;
	}
	updateState () {
		const active = this.isUserActive;
		if (active !== this.#private.lastUserActive) {
			this.#private.lastUserActive = active;
			if (active) {
				this.emit("user-active");
			}
			else {
				this.emit("user-inactive");
			}
		}
	}
	start () {
		if (this.#private.startTime) {
			return this;
		}
		this.#private.startTime = new Date();
		this.#private.startRelTime = performance.now();
		const setWindowActive = () => {
			this.#private.isWindowActive = true;
			this.#private.logActivityState();
			this.emit("window-active");
		};
		const setWindowInactive = () => {
			this.#private.isWindowActive = false;
			this.#private.logActivityState();
			this.emit("window-inactive");
		};
		const visibilityChange = () => {
			if (this.isTabActive) {
				this.emit("tab-active");
			}
			else {
				this.emit("tab-inactive");
			}
		};

		const logInterval = setInterval(() => {
			this.#private.logActivityState();
		}, 5000);

		const updateInterval = setInterval(() => {
			this.updateState();
		}, 1000);



		window.addEventListener("focus", setWindowActive);
		window.addEventListener("blur", setWindowInactive);
		window.addEventListener("visibilitychange", visibilityChange);

		this.#private.uninit.push(() => {
			clearInterval(logInterval);
			clearInterval(updateInterval);
			window.removeEventListener("focus", setWindowActive);
			window.removeEventListener("blur", setWindowInactive);
			window.removeEventListener("visibilitychange", visibilityChange);
		});

		this.#private.events.forEach((eventType) => {
			this.#private.document.addEventListener(eventType, this.#private.handler, {
				capture: true,
				passive: true,
			});
		});

		this.#private.lastUserActive = this.isUserActive;
		return this;
	}
	stop () {
		this.#private.startTime = null;
		this.#private.startRelTime = null;
		this.#private.events.forEach((eventType) => {
			this.#private.document.removeEventListener(eventType, this.#private.handler, {
				capture: true,
				passive: true,
			});
		});
		while (this.#private.uninit.length) {
			this.#private.uninit.pop()();
		}
		return this;
	}
}
