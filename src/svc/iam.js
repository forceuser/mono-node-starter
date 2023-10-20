export async function handleResponse (response) {
	response = await Promise.resolve(response);
	let data = await response.text();
	// console.log("data resp", data);
	try {
		data = JSON.parse(data);
	}
	catch {
		data = {errCode: "WRONG_RESPONSE_TYPE", errText: data};
	}

	if (!response.ok || data.errText) {
		throw data.errText ? new Error(data.errText) : data;
	}

	return data;
}

export async function getRoles ({sid, logins = [], baseUrl, traceId} = {}) {
	const url = new URL(`/api/v1/roles/users/active/session`, baseUrl);
	url.searchParams.set("sid", sid);
	const response = await fetch(url, {
		method: "POST",
		body: JSON.stringify({list: [logins.map(id => ({id}))]}),
		headers: {
			"accept": "application/json",
			"content-type": "application/json",
			...(traceId ? {"trace-id": traceId} : {}),
		},
	});
	return handleResponse(response);
}

export async function sessionOpen ({user, baseUrl, traceId} = {}) {
	const url = new URL(`/api/v1/sessions/open`, baseUrl);
	// console.log("session open url", url.toString());
	const response = await fetch(url, {
		method: "POST",
		body: JSON.stringify({user}),
		headers: {
			"accept": "application/json",
			"content-type": "application/json",
			...(traceId ? {"trace-id": traceId} : {}),
		},
	});
	return handleResponse(response);
}

export async function sessionClose ({sid, baseUrl, traceId} = {}) {
	const url = new URL(`/api/v1/sessions/close/${sid}`, baseUrl);
	const response = await fetch(url, {
		method: "GET",
		headers: {
			"accept": "application/json",
			...(traceId ? {"trace-id": traceId} : {}),
		},
	});
	return handleResponse(response);
}

export async function sessionInfo ({sid, baseUrl, traceId} = {}) {
	const url = new URL(`/api/v1/sessions/get/${sid}`, baseUrl);
	// console.log("sessionInfo", url.toString());
	const response = await fetch(url, {
		method: "GET",
		headers: {
			"accept": "application/json",
			...(traceId ? {"trace-id": traceId} : {}),
		},
	});
	return handleResponse(response);
}

export class IAMSessionGen {
	#private = {};
	constructor ({user, baseUrl}) {
		this.#private.user = user;
		this.#private.baseUrl = baseUrl;
	}
	set user (user) {
		this.#private.user = user;
	}
	get user () {
		return this.#private.user;
	}
	internal (user) {
		const {user: defaultUser, baseUrl} = this.#private;
		return new IAMSession({user: user || defaultUser, baseUrl});
	}
	external (sid) {
		const {baseUrl} = this.#private;
		return new IAMSession({sid, baseUrl});
	}
}

const minute_ms = 60 * 1000;

export function escapeSensitive (str) {
	return typeof str === "string" ? str.substr(0, 4).padEnd(12, "*") + str.substr(-4) : "";
}
export class IAMSession {
	#private = {
		user: null,
		sid: null,
		info: null,
		session: null,
		refreshInfo: false,
		defaultTTL: 30,
	};
	setSession ({sid, timestamp = Date.now()} = {}) {
		if (sid) {
			this.#private.sid = sid;
			this.#private.timestamp = timestamp;
		}
	}
	constructor ({user, sid, timestamp = Date.now(), baseUrl, refreshInfo = false} = {}) {
		this.#private.baseUrl = baseUrl;
		this.#private.refreshInfo = refreshInfo;
		if (user) {
			this.#private.user = JSON.parse(JSON.stringify(user));
		}
		if (sid) {
			this.#private.sid = sid;
			this.#private.timestamp = timestamp;
		}
	}
	async getSid ({create = false, traceId} = {}) {
		const now = new Date();
		const ttl = (this.#private.info?.ttl || this.#private.defaultTTL) - 1;

		if (create || !this.#private.timestamp || (now - this.#private.timestamp > ttl * minute_ms)) {
			await this.open();
			return this.#private.sid;
		}
		else if (this.#private.refreshInfo) {
			try {
				await this.getInfo({traceId});
			}
			catch {}
		}

		return Promise.resolve(this.#private.sid);
	}
	get user () {
		return {login: this.#private.user.login, auth: this.#private.user.auth};
	}
	async open ({traceId} = {}) {
		const {user, baseUrl} = this.#private;
		if (!user) {
			throw new Error("Failed to open! External session without user!");
		}
		if (this.#private.sid) {
			try {
				await this.close({traceId});
			}
			catch {}
		}
		else {
			this.clear();
		}
		const result = await sessionOpen({user, baseUrl, traceId});
		this.#private.timestamp = Date.now();
		this.#private.sid = result.value;
		await this.getInfo({traceId});

		return this;
	}
	async clear () {
		this.#private.timestamp = null;
		this.#private.sid = null;
		this.#private.info = null;
	}
	async close ({traceId} = {}) {
		const {sid, baseUrl} = this.#private;
		this.clear();
		await sessionClose({sid, baseUrl, traceId});
		return this;
	}
	async getInfo ({traceId} = {}) {
		const {sid, baseUrl} = this.#private;
		const info = await sessionInfo({sid, baseUrl, traceId});
		this.#private.info = info;
		return info;
	}
	async getRoles ({traceId} = {}) {
		const {sid, baseUrl} = this.#private;
		return getRoles({sid, baseUrl, traceId});
	}
}
