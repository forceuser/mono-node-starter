import {uniqId} from "#common/random.js";

const LOG_MAX_COUNT_IN_CHUNK = 15;
const LOG_MAX_SIZE_IN_CHUNK = 3000;
const FRONT_LOGER_PATH = "./front/logger";

const instance = {
	frontLoggerReloadIdx: 0,
	appVersion: "0.0.0",
	initialized: false,
	logs: [],
};


export function formatLocalTime (value) {
	try {
		const dt = new Date(value);
		// const tzOffset = new Date().getTimezoneOffset() * 60 * 1000;
		return new Date(+dt).toLocaleTimeString("uk") + "." + dt.getMilliseconds();
	}
	catch (error) {
		return "Invalid date";
	}
}

export function formatGlobalTime (value) {
	try {
		const dt = new Date(value);
		return dt.toISOString();
	}
	catch (error) {
		return "Invalid date";
	}
}


export function formatDuration (delta, showMs = true) {
	try {
		delta = +delta;

		const ms = delta;
		const s = delta / 1000;
		const m = s / 60;
		const h = m / 60;
		const msf = Math.floor(ms % 1000).toString().padStart(3, "0");
		const sf = Math.floor(s % 60);
		const mf = Math.floor(m % 60);
		const hf = Math.floor(h);
		return `${[
			hf ? `${hf.toString().padStart(2, "0")}` : "",
			mf.toString().padStart(2, "0"),
			sf.toString().padStart(2, "0"),
		]
			.filter(i => i).join(":")}${showMs ? `.${msf}` : ""}`;
	}
	catch {
		return "--:--:--";
	}
}

export function initFrontLogs ({vueInstance, appVersion} = {}) {
	if (instance.initialized) {
		return;
	}
	if (appVersion) {
		instance.appVersion = appVersion;
	}
	instance.frontLoggerReloadIdx = +(sessionStorage.frontLoggerReloadIdx || "0");
	instance.frontLoggerReloadIdx++;
	sessionStorage.frontLoggerReloadIdx = instance.frontLoggerReloadIdx;
	try {
		const globalLog = frontLog.group("global");

		window.addEventListener("beforeunload", () => {
			sendFrontLogs();
		});

		window.addEventListener("error", (event) => {
			try {
				globalLog("error", {
					error: event,
					send: true,
				});
				const errText = errorToString(event, false);
			}
			catch (error) {
				console.error(error);
			}
		});

		window.addEventListener("unhandledrejection", (event) => {
			try {
				globalLog("unhandledrejection", {
					error: event,
					send: true,
				});
				const errText = errorToString(event, false);
			}
			catch (error) {
				console.error(error);
			}
		});

		if (vueInstance) {
			vueInstance.config.errorHandler = (error, vm, info) => {
				try {
					globalLog("vue-error", {
						error,
						send: true,
					});
					const errText = errorToString(error, false);
					console.error(error);
				}
				catch (error) {
					console.error(error);
				}
			};
		}

		setInterval(() => {
			sendFrontLogs();
		}, 5000);
		instance.initialized = true;
	}
	catch (error) {
		console.log("FAILED TO INIT FRONT LOG", error);
	}
}


let frontLoggerId;
let logIdx = 0;
export function getLogId (inc = true, parts = false) {
	localStorage.frontLoggerId = localStorage.frontLoggerId || uniqId(8);
	sessionStorage.frontLoggerId = sessionStorage.frontLoggerId || uniqId(8);
	frontLoggerId = frontLoggerId || uniqId(8);
	if (inc) {
		logIdx++;
	}
	const p = [
		localStorage.frontLoggerId, // uniq id for browser
		sessionStorage.frontLoggerId, // uniq id for each tab
		(instance.frontLoggerReloadIdx).toString().padStart(5, "0"), // uniq id for each tab reload
		(logIdx).toString().padStart(8, "0"), // idx of log invocation within each tab reload
	];
	if (parts) {
		return p;
	}
	return p.join("-");
}

const toObject = (src) => {
	try {
		if (typeof src === "object") {
			if (Array.isArray(src)) {
				return src;
			}
			return Object.getOwnPropertyNames(src).reduce((res, key) => (res[key] = src[key], res), {});
		}
	}
	catch {}
	return src;
};


export function errorToString (e, stackTrace = true) {
	try {
		let error;
		if (typeof e === "object") {
			const ev = e;
			e = e.reason || e;
			e = e.error || e;
			const filename = ev.fileName || ev.filename || e.fileName || e.filename || "[unknown file]";
			const lineno = ev.lineNumber || ev.lineno || e.lineNumber || e.lineno || "?";
			const colno = ev.columnNumber || ev.colno || e.columnNumber || e.colno || "??";
			const stack = ev.stack || e.stack || "[no stack trace]";
			if (e.message) {
				error = (e.message || "[nomessage]") + stackTrace ? (" on " + filename + ":" + lineno + ":" + colno + "\n" + stack) : "";
			}
			else {
				try {
					error = JSON.stringify(toObject(e));
				}
				catch {
					error = String(e);
				}
			}
		}
		else {
			error = String(e);
		}
		return error;
	}
	catch (error) {
		console.error(error);
		return "Couldn't convert Error to string";
	}
}

export function sendFrontLogs () {
	try {
		const url = new URL(FRONT_LOGER_PATH, window.location.origin.toString());
		const pageUrl = new URL(window.location.href);
		if (pageUrl.searchParams.get("traceId")) {
			url.searchParams.set("traceId", pageUrl.searchParams.get("traceId"));
		}
		while (instance.logs?.length) {
			let str = "";
			const logsToSend = [];
			while (str.length < LOG_MAX_SIZE_IN_CHUNK && instance.logs?.length) {
				logsToSend.push(instance.logs.shift());
				str = JSON.stringify(logsToSend);
			}
			navigator.sendBeacon(url, JSON.stringify(logsToSend));
		}
	}
	catch (error) {
	}
}


export const logGroup = (group) => {
	const currentGroup = group;
	const fn = (message, ...rest) => frontLog([currentGroup, message].filter($ => $).join("::"), ...rest);
	fn.group = (group) => logGroup([currentGroup, group].join("/"));
	return fn;
};

export function frontLog (message, params) {
	try {
		if (typeof params === "function") {
			try {
				params = params(message);
			}
			catch {
				params = {
					content: "[failed to log content]",
				};
			}
		}

		const {content, error, send = false} = params || {};

		const item = {
			message,
			timestamp: Date.now(),
			pageUrl: window.location.href.toString(),
			logId: getLogId(),
		};
		item.content = content || {};
		item.content.appVersion = instance.appVersion;
		if (error) {
			console.dir(error);
			item.error = errorToString(error);
		}
		instance.logs.push(item);

		console.log("%c%s%c%s%c%s\n%c%s", "color: #24828C; font-size: 1.1em;", "[front log]", "color: initial; font-size: 1.1em;", ":", "color: #8C8724; font-size: 1.1em;", `[${item.logId}]`, "font-weight: bold;", item.message ? `  ${item.message}\n` : "", ...[(item.content ? [" 🟡", item.content] : null), (item.error ? [" 🔴", item.error] : null)].filter($ => $).flatMap(($, idx, arr) => idx < arr.length ? [$, "\n"].flat() : $));
		if (send || instance.logs.length >= LOG_MAX_COUNT_IN_CHUNK) {
			return sendFrontLogs();
		}
	}
	catch (error) {
	}
}

frontLog.group = logGroup;
