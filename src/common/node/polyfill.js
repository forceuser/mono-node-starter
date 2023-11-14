import Blob from "cross-blob";
import "cross-fetch/dist/node-polyfill.js";
import matchAll from "string.prototype.matchall";
import replaceAll from "string.prototype.replaceall";

if (!global.Blob) {
	global.Blob = Blob;
}
if (!String.prototype.matchAll) {
	matchAll.shim();
}
if (!String.prototype.replaceAll) {
	replaceAll.shim();
}
