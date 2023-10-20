class Deferred {
	constructor () {
		this.promise = new Promise((resolve, reject) => {
			this.ctrl = {resolve, reject};
		});
	}
	resolve (...args) {
		return this.ctrl.resolve(...args);
	}
	reject (...args) {
		return this.ctrl.reject(...args);
	}
}

export async function readFile (file, type = "text") {
	const deferred = new Deferred();
	if (type === "blobUrl") {
		deferred.resolve(URL.createObjectURL(file));
	}
	else {
		const reader = new FileReader();
		reader.onload = event => {
			deferred.resolve(event.target.result);
		};
		reader[{
			"arrayBuffer": "readAsArrayBuffer",
			"binaryString": "readAsBinaryString",
			"dataURL": "readAsDataURL",
			"text": "readAsText",
		}[type] || "readAsText"](file);
	}

	return deferred.promise;
}



async function openUrl (url, filename, onDestroy) {
	const a = document.createElement("a");
	document.body.appendChild(a);
	a.textContent = "link";
	a.style.width = 0;
	a.style.height = 0;
	a.style.opacity = 0;
	a.style.position = "absolute";
	a.setAttribute("download", filename || "");
	a.setAttribute("href", url);
	a.click();
	setTimeout(() => {
		a.remove();
		onDestroy && onDestroy();
	}, 200);
}

export async function saveDataToFile (data, {filename, type, lastModified, download = false}) {
	if (!type) {
		if (typeof data === "string") {
			type = "text/plain";
		}
		else {
			type = "application/octet-stream";
		}
	}
	const file = new File(Array.isArray(data) ? data : [data], filename, {type, lastModified: lastModified || Date.now()});
	const url = URL.createObjectURL(file);
	if (download) {
		openUrl(url, filename, () => URL.revokeObjectURL(url));
	}
	return file;
}

export async function uploadFiles ({accept, directory = false, multiple = false}) {
	const input = document.createElement("input");
	input.setAttribute("type", "file");
	if (accept) {
		accept = Array.isArray(accept) ? accept.map(a => `.${a}`).join(",") : accept;
		console.log("accept", accept);
		input.setAttribute("accept", accept);
	}
	if (directory) {
		input.setAttribute("webkitdirectory", "");
		input.setAttribute("mozdirectory", "");
		input.setAttribute("directory", "");
	}
	if (multiple) {
		input.setAttribute("multiple", "");
	}

	return (new Promise(resolve => {
		input.addEventListener("change", () => resolve(input.files));
		input.click();
	}));
}

