import {toObject} from "#root/common/utils.js";
import toJson from "json-stringify-safe";

export function initFrontLogServer ({url = "/front/logger", fastify, $app, logger} = {}) {
	fastify.route({
		url,
		method: ["POST", "GET"],
		handler: async (request, reply) => {
			const traceId = request?.query?.traceId || $app?.createTraceId?.();
			const sessionId = request.cookies?.sessionId;

			try {
				if (request.body) {

					let requestBody = await request.body;

					if (typeof requestBody === "string") {
						try {
							requestBody = JSON.parse(requestBody);
						}
						catch {}
					}
					const logs = [].concat(requestBody).filter($ => $);

					logs.forEach((logItem, idx) => {
						try {
							let {message, content, error, timestamp, pageUrl, logId} = ((typeof logItem === "string") ? {message: logItem} : (logItem || {}));
							const logObject = {
								idx,
							};

							if (content) {
								logObject.content = toJson(content);
							}
							if (error) {
								logObject.error = toJson(error);
							}
							if (timestamp) {
								logObject.logTime = (new Date(timestamp)).toLocaleString("uk");
							}
							if (pageUrl) {
								logObject.pageUrl = pageUrl;
							}

							$app.logger.log({
								level: "info",
								message: `[front log] ${message || "no-message"}`,
								logId: logId && `${logId}-${Date.now().toString().substr(-7)}`,
								...logObject,
								sessionId,
								traceId,
							});

						}
						catch (error) {
							logger?.log?.({level: "error", message: "[front log pre] item error", error: error.message});
						}
					});
				}
				else {
					const logObject = {
						level: "info",
						message: `[front log] no-body`,
						sessionId,
						traceId,
					};
					logger?.log?.(logObject);
				}
			}
			catch (error) {
				logger?.log?.({
					level: "error",
					message: `[front log error] ${error?.message}`,
					error,
				});
			}

			reply
				.status(200)
				.headers({
					"trace-id": traceId,
					"cache-control": "no-store, max-age=0, must-revalidate",
				})
				.send(JSON.stringify({
					result: "ok",
				}));
		},
	});
}
