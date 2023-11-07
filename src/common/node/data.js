import {Readable, Writable} from "node:stream";
import {ReadableStream, WritableStream} from "node:stream/web";
import {Buffer} from "node:buffer";

export async function stream2buffer (stream) {
	return new Promise((resolve, reject) => {
		if (stream instanceof ReadableStream) {
			stream = Readable.fromWeb(stream);
		}
		if (stream instanceof WritableStream) {
			stream = Writable.fromWeb(stream);
		}
		const _buf = [];

		stream.on("data", (chunk) => _buf.push(chunk));
		stream.on("end", () => resolve(Buffer.concat(_buf)));
		stream.on("error", (error) => reject(error));
	});
}
