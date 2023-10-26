import {createProxyMiddleware} from "http-proxy-middleware";
import toJson from "json-stringify-safe";
import {toObject} from "#common/utils.js";
import {stream2buffer} from "#common/node/data.js";
import {escapeSensitive} from "#svc/iam.js";

function logProviderFactory (prefix, logger) {
	return (provider) => {
		const myCustomProvider = {
			log (...args) {
				return logger?.log?.({level: "info", "proxy-prefix": prefix, "log-level": "info", message: toJson(args)});
			},
			debug (...args) {
				return logger?.log?.({level: "info", "proxy-prefix": prefix, "log-level": "debug", message: toJson(args)});
			},
			info (...args) {
				return logger?.log?.({level: "info", "proxy-prefix": prefix, "log-level": "info", message: toJson(args)});
			},
			warn (...args) {
				return logger?.log?.({level: "info", "proxy-prefix": prefix, "log-level": "warn", message: toJson(args)});
			},
			error (...args) {
				return logger?.log?.({level: "info", "proxy-prefix": prefix, "log-level": "error", message: toJson(args)});
			},
		};
		return myCustomProvider;
	};
}

export async function initProxy (proxyRules, {$app, logger, fastify, skipPaths = []} = {}) {
	proxyRules = [].concat(proxyRules || []);
	if (!fastify?.use) {
		throw new Error("fastify instance with express-like middleware support is required");
	}

	skipPaths = [].concat(skipPaths || null).filter($ => $);
	const proxy = {};
	proxyRules.forEach(rule => {
		const prefix = rule.split(":")[0];
		const target = rule.split(":").slice(1).join(":");
		// const logProvider = logProviderFactory(prefix, logger);
		proxy[prefix] = createProxyMiddleware(prefix, {
			target,
			secure: false,
			changeOrigin: true,
			pathFilter: prefix,
			pathRewrite: {[`^${prefix}`]: ""},
			ws: true,
			onProxyRes (proxyRes, req, res) {
				try {
					const prev = (proxyRes?.headers["Access-Control-Allow-Headers"] || "")
						.split(",")
						.filter(i => i)
						.map(i => i.trim());

					if (!skipPaths.some(p => req.path.startsWith(p))) {
						const logId = req.headers["x-log-id"];
						prev.push("trace-id");
						prev.push("traceid");
						prev.push("x-log-id");
						proxyRes.headers["Access-Control-Allow-Headers"] = prev.join(",");
						if (req.headers["x-log-id"]) {
							proxyRes.headers["x-log-id"] = logId;
						}

						const message = `[front log] PROXYRES [${req.method}] [${proxyRes.statusCode}] ${req.path} -> ${proxyRes.req.protocol}//${proxyRes.req.host}${proxyRes.req.path} [${proxyRes?.headers?.["content-length"]}]`;

						logger?.log?.({
							level: "http",
							message,
							traceId: req.headers["trace-id"] ||
								req.headers.traceid,
							resTraceId: proxyRes.headers["trace-id"] ||
								proxyRes.headers.traceid, logId: logId && `${logId}-${Date.now().toString().substr(-7)}`,
							headers: toJson(toObject(req.headers || {})),
							resHeaders: toJson(toObject(proxyRes.headers || {})),
						});
					}
				}
				catch {}
			},
			onProxyReq (proxyReq, req, res) {
				try {
					if (!skipPaths.some(p => req.path.startsWith(p))) {
						const message = `[front log] PROXYREQ [${req.method}] [pending] ${req.path} -> ${req.protocol}//${req.hostname}${req.path}`;
						const logId = req.headers["x-log-id"];
						logger?.log?.({
							level: "http",
							message,
							traceId: req.headers["trace-id"] || req.headers.traceid,
							logId: logId && `${logId}-${Date.now().toString().substr(-7)}`,
							headers: toJson(toObject(req.headers || {})),
						});
					}
				}
				catch {}
			},
			// logLevel: "debug",
			// logProvider,
		});

		fastify.use(proxy[prefix]);
		fastify.server.on("upgrade", (...args) => {
			const [req, socket, head] = args;
			const message = `[front log] PROXYUPGRADE [${req.method}] [pending] ${req.path} -> ${req.protocol}//${req.hostname}${req.path}`;
			const logId = req.headers["x-log-id"];
			logger?.log?.({
				level: "http",
				message,
				traceId: req.headers["trace-id"] || req.headers.traceid,
				logId: logId && `${logId}-${Date.now().toString().substr(-7)}`,
				headers: toJson(toObject(req.headers || {})),
			});
			if (req.url.startsWith(prefix)) {
				return proxy[prefix].upgrade(...args);
			}
		});

		return proxy;
	});

}



export async function initProxySid (proxyRules, {$app, iamSession, logger, fastify, skipPaths = []} = {}) {

	proxyRules.forEach(rule => {
		const prefix = rule.split(":")[0];
		const target = rule.split(":").slice(1).join(":");

		// const logProvider = logProviderFactory(prefix);
		const url = "/" + [...prefix.split("/"), "*"].filter($ => $).join("/");
		logger?.log?.({level: "info", prefix, target, message: `setting up proxy with sid for ${url}`});
		fastify.route({
			url: "/" + [...prefix.split("/")].filter($ => $).join("/") + "*",
			handler: (request, reply) => {},
			method: ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"],
			// handler: (request, reply) => {},
			async onRequest (request, reply, done) {
				try {

					const apiPath = request.params["*"];
					const traceId = request?.query?.traceId || request?.headers?.["trace-id"] || $app?.createTraceId?.();

					const headers = Object.assign(
						Object.entries(request.headers).reduce((headers, [key, value]) => {
							key = key.toLowerCase();
							// if (["x-", "accept", "content-"].some($ => key.toLowerCase().startsWith($))) {
							// }
							if (!["host"].some($ => key === $)) {headers[key] = value;}
							return headers;
						}, {}),
						{},
					);

					const url = new URL(target);
					url.pathname = [...url.pathname.split("/"), apiPath].filter($ => $).join("/");
					url.search = new URLSearchParams(request.query);
					// const url = new URL(`http://127.0.0.1:3000/echo/${request.params["*"]}`);

					const requestBody = await stream2buffer(request.raw);
					const makeRequest = async (url, sid) => {
						// const headers = Object.fromEntries(Object.entries(request.headers).filter(([key]) => ["accept", "content"].some(x => key.toLowerCase().startsWith(x))));
						headers["accept-encoding"] = "identity";
						headers["user-ip"] = request.ip;
						headers["trace-id"] = traceId;
						headers.sid = sid;
						return fetch(url, {
							method: request.method,
							...(["GET", "HEAD"].includes(request.method)
								? {}
								: {body: requestBody}),
							headers,
						});
					};

					logger?.log?.({level: "info", message: `check sid url: ${url}`, traceId});

					let sid = await iamSession.getSid({traceId});
					logger?.log?.({level: "info", message: `sid is: ${escapeSensitive(sid)}`, traceId});
					let response = await makeRequest(url, sid);
					logger?.log?.({level: "info", message: `sid test for ${escapeSensitive(sid)} status ${response.status}`, traceId});
					if (response.status >= 400) {
						let sessionInfo;
						try {
							sessionInfo = await iamSession.getInfo({traceId});
							logger?.log?.({level: "info", message: `sessionInfo.state = ${sessionInfo?.state}`, traceId});
						}
						catch (error) {
							logger?.log?.({level: "info", message: `failed to get session info for sid ${sid}`, traceId});
						}
						if (sessionInfo?.state !== "ACTIVE") { // check if session is active
							sid = await iamSession.getSid({create: true, traceId});
							logger?.log?.({level: "info", message: `new sid is ${escapeSensitive(sid)}`, traceId});
							response = await makeRequest(url, sid);
							logger?.log?.({level: "info", message: `new sid (${escapeSensitive(sid)}) response status is ${response.status}`, traceId});
						}
					}

					const responseHeaders = [...response.headers.entries()].reduce((headers, [key, value]) => {
						if (![
							// "content-type", "content-length",
							"transfer-encoding", "connection", "date", "server",
							"x-content-type-options", "x-xss-protection", "cache-control",
						].some($ => key.toLowerCase().startsWith($))) {
							headers[key] = value;
						}
						return headers;
					}, {});

					let replyData = await response.body;
					// console.log("response text", );
					console.log("responseHeaders", responseHeaders);

					const replyHeaders = Object.assign(
						responseHeaders,
						// {"content-type": "application/json"},
						{
							"trace-id": traceId,
							"cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
						},
					);

					reply
						.status(response.status)
						.headers(replyHeaders)
						.send(replyData);
				}
				catch (error) {
					console.log("error", error);
					reply
						.status(500)
						.send({errCode: "PROXY_FAILED", errText: "failed to proxy reuquest"});
				}


				done();
			},
		});
	});


}
