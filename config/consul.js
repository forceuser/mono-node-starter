
import nodePath from "node:path";
import {Buffer} from "node:buffer";
import $yaml from "yaml";

export async function readConfig ({host, port, key, token}) {
	const url = new URL(host);
	if (port) {
		url.port = port;
	}
	url.pathname = nodePath.posix.join(`/v1/kv/`, key);

	console.log("url.toString()", url.toString());
	const content = await (await fetch(url.toString(), {
		headers: {
			"x-consul-token": token,
			"accept": "application/json",
		},
	})).text();
	// console.log("CONSUL content", content);
	const jsonBody = JSON.parse(content);
	const value = jsonBody?.[0]?.Value;
	const text = Buffer.from(value, "base64").toString("utf8");
	const result = $yaml.parse(text);

	return result;
}
