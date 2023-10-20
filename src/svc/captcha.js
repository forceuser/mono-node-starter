import {dataToUrlParams} from "#common/utils/common.js";

export async function verifyCaptcha ({secret, xcaptcha, remoteip, signal}) {
	const body = {
		secret,
		response: xcaptcha,
		remoteip,
	};
	console.log("verify captcha body", body);

	const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
		method: "POST",
		body: dataToUrlParams(body).toString(),
		headers: {
			"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
		},
		signal,
	});
	if (!response.ok) {
		throw {
			status: response.stats,
			statusText: response.statusText,
		};
	}

	const result = await response.json();

	console.log("captcha verification result", result);

	if (!result?.success) {
		throw {errText: "captcha verification failed", errCode: 501, statusCode: 501};
		// throw new Error("captcha verification failed");
	}

	return result;
}
