import toJson from "json-stringify-safe";
import {merge} from "#common/utils.js";
import {uniqId} from "#common/random.js";

export const apis = new Map();

let globalContext = {};

const createTraceId = () => uniqId(26);

export function registerApi (name, handler, settings = {}) {
	const apiHandler = function (params, callContext) {
		return handler(params, callContext);
	};
	const createApiCall = (context) => {
		context = merge({}, globalContext, context);
		const apiCall = async (params = {}, callContext = {}) => {
			const traceId = params.traceId || createTraceId();
			// console.log("API CALL", params, name, "context", !!context?.request);
			let result;
			let resultSet = false;
			let setCache;
			callContext = merge({}, context, callContext);
			if (typeof settings?.cache === "function") {
				const done = (value) => (result = value, resultSet = true);
				setCache = settings.cache({params, context: callContext, done});
				if (resultSet) {
					return result;
				}
			}
			result = await (async () => {
				if (import.meta.env.SSR) {
					return apiHandler(params, callContext);
				}
				else {
					const prettyName = settings?.getName?.(params) ?? params?.path;
					console.log("pre fetch", name);
					const body = params.body;
					params.body = toJson(body);
					return fetch(
						`/api-call/${name}${name ? `?name=${prettyName}` : ""}`,
						merge({
							method: "POST",
							headers: {
								"accept": "application/json",
								"content-type": "application/json",
								"trace-id": traceId,
							},
							body: toJson({params}),
						}, callContext?.fetchParams)
					)
						.then(response => {
							return response.json();
						});
				}
			})();
			if (typeof setCache === "function") {
				setCache(result);
			}
			return result;
		};

		apiCall.setContext = (value) => {
			context = merge({}, globalContext, value);
			return apiCall;
		};

		apiCall.useContext = createApiCall;

		apiCall.simple = async (params, useSsrCache = true) => {
			const reqKey = JSON.stringify(params);
			if (useSsrCache && context?.clientContext?.ssrCache?.[reqKey] != null) {
				return context.clientContext.ssrCache[reqKey];
			}
			const result = await apiCall(params);
			// console.log("simple api call");
			if (import.meta.env.SSR && useSsrCache && context?.clientContext?.ssrCache != null) {
				context.clientContext.ssrCache[reqKey] = result;
			}
			return result;
		};

		return apiCall;
	};

	const apiCall = createApiCall();

	apis.set(name, apiCall);

	return apiCall;
}
