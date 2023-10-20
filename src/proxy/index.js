import {createProxyMiddleware} from "http-proxy-middleware";
import toJson from "json-stringify-safe";
import {toObject} from "#common/utils.js";

function logProviderFactory (prefix, logger) {
	return (provider) => {
		const myCustomProvider = {
			log (...args) {
				return logger.log({level: "info", "proxy-prefix": prefix, "log-level": "info", message: toJson(args)});
			},
			debug (...args) {
				return logger.log({level: "info", "proxy-prefix": prefix, "log-level": "debug", message: toJson(args)});
			},
			info (...args) {
				return logger.log({level: "info", "proxy-prefix": prefix, "log-level": "info", message: toJson(args)});
			},
			warn (...args) {
				return logger.log({level: "info", "proxy-prefix": prefix, "log-level": "warn", message: toJson(args)});
			},
			error (...args) {
				return logger.log({level: "info", "proxy-prefix": prefix, "log-level": "error", message: toJson(args)});
			},
		};
		return myCustomProvider;
	};
}

export async function initProxy (proxyRules, {logger, fastify, skipPaths = []} = {}) {
	proxyRules = [].concat(proxyRules || []);
	if (!fastify?.use) {
		throw new Error("fastify instance with express-like middleware support is required");
	}

	skipPaths = [].concat(skipPaths || null).filter($ => $);

	proxyRules.forEach(rule => {
		const prefix = rule.split(":")[0];
		const target = rule.split(":").slice(1).join(":");
		// const logProvider = logProviderFactory(prefix, logger);
		fastify.use(createProxyMiddleware(prefix, {
			target,
			secure: false,
			changeOrigin: true,
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

						logger.log({
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
						logger.log({
							level: "http",
							message, traceId:
							req.headers["trace-id"] || req.headers.traceid,
							logId: logId && `${logId}-${Date.now().toString().substr(-7)}`,
							headers: toJson(toObject(req.headers || {})),
						});
					}
				}
				catch {}
			},
			// logLevel: "debug",
			// logProvider,
		}));
	});

}
