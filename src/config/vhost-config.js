import nodePath from "node:path";
import fs from "fs-extra";
import {packageDir} from "#common/node/package.js";

export function readVhostFile () {
	const path = nodePath.join(packageDir, ".local/vhost.json");
	if (fs.existsSync(path)) {
		return JSON.parse(fs.readFileSync(path, "utf8"));
	}
}

export function getVhost () {
	return readVhostFile()?.vhosts?.[0];
}

export function getVhostPort () {
	return getVhost()?.proxyPort;
}

export function getVhostDomain () {
	return getVhost()?.domainName;
}
