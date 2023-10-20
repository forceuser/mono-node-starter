import {merge} from "#common/utils.js";
import micromatch from "micromatch";
import {verifyCaptcha} from "#svc/captcha.js";
import {escapeSensitive} from "#svc/iam.js";


export async function preRequestIsAllowed (path, {allowedAPIList = ["*"]} = {}) {
	if (!micromatch.some(path, allowedAPIList)) {
		throw new Error("no such api", {cause: {statusCode: 404}});
	}
}

export async function preRequestVerifyCaptcha (path, {originalRequest, recaptchaServerKey, captchaAPIList = []} = {}) {
	if (recaptchaServerKey && micromatch.some(path, captchaAPIList)) {
		const xcaptcha = originalRequest.headers?.["x-captcha"];
		if (xcaptcha) {
			await verifyCaptcha({
				secret: recaptchaServerKey,
				xcaptcha,
				remoteip: originalRequest?.ip,
			});
		}
	}
}

export async function makeApiRequest ({
	path,
	method,
	query,
	headers,
	body,
}, {
	originalRequest,
	traceId,
	apiBaseUrl,
	logger,
	iamSession,
	allowedAPIList = ["*"],
	iamAuthAPIList = [],
	captchaAPIList = [],
	recaptchaServerKey,
	testSessionError,
}) {
	let response;

	preRequestIsAllowed(path, {allowedAPIList});

	if (!apiBaseUrl) {
		throw new Error("apiBaseUrl is not specified!");
	}
	const targetUrl = new URL(path, apiBaseUrl);
	targetUrl.search = new URLSearchParams(query);

	await preRequestVerifyCaptcha(path, {originalRequest, recaptchaServerKey, captchaAPIList});

	if (originalRequest) {
		headers = merge(headers || {}, {
			"user-ip": originalRequest?.ip,
			"src-user-agent": originalRequest?.headers?.["user-agent"],
			"src-origin": originalRequest?.headers?.origin,
		});
	}

	const makeRequest = async (sid) => {
		const request = {
			method,
			...(["GET", "HEAD"].includes(method)
				? {}
				: {body}),
			headers: merge(headers, {
				sid,
				"trace-id": traceId,
			}),
		};
		logger?.log?.({level: "info", message: "backApiRequest::request", request, traceId});
		const response = await fetch(targetUrl, request);
		return response;
	};

	logger?.log?.({level: "info", message: `getting sid`, traceId});
	if (iamAuthAPIList?.length && micromatch.some(path, iamAuthAPIList)) {
		let sid;
		try {
			sid = await iamSession.getSid({traceId});
			logger?.log?.({level: "info", message: `sid is: ${escapeSensitive(sid)}`, traceId});
		}
		catch {
			logger?.log?.({level: "error", message: `sid error`, traceId});
			return {
				data: {errText: "service internal auth error", errCode: "auth_error"},
				status: 500,
			};
		}

		response = await makeRequest(sid);
		logger?.log?.({level: "info", message: `sid test for ${escapeSensitive(sid)} status ${response.status}`, traceId});

		let sessionError = false;
		if (typeof testSessionError === "function") {
			sessionError = testSessionError({response, sid});
		}
		else {
			if (response.status === 403 || response.status === 401) {
				sessionError = true;
			}
			else if (response.status >= 500) {
				const respText = await response.clone().text();
				if (/session\s+(expired|not found|invalid)/igm.test(respText)) {
					console.log("SESSION ERROR DETECTED");
					sessionError = true;
				}
			}
		}

		if (sessionError) { // check if error caused by iam session expiration
			logger?.log?.({level: "info", message: `got bad auth from remote, checking iam session status...`, traceId});
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
				response = await makeRequest(sid);
				logger?.log?.({level: "info", message: `new sid (${escapeSensitive(sid)}) response status is ${response.status}`, traceId});
			}
		}
	}
	else {
		response = await makeRequest();
	}
	return response;
}
