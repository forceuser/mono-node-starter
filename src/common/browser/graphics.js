export function rgbToHsv (r, g, b) {
	r = Math.max(0, Math.min(r / 255, 1));
	g = Math.max(0, Math.min(g / 255, 1));
	b = Math.max(0, Math.min(b / 255, 1));

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h;
	const v = max;

	const d = max - min;
	const s = max === 0 ? 0 : d / max;

	if (max == min) {
		h = 0; // achromatic
	}
	else {
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return {h, s, v};
}

export function hsvToRgb (h, s, v) {
	h = Math.max(0, Math.min(h, 360)) * 6;
	s = Math.max(0, Math.min(s, 100));
	v = Math.max(0, Math.min(v, 100));

	const i = Math.floor(h);
	const f = h - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);
	const mod = i % 6;
	const r = [v, q, p, p, t, v][mod];
	const g = [t, v, v, q, p, p][mod];
	const b = [p, p, t, v, v, q][mod];

	return {r: r * 255, g: g * 255, b: b * 255};
}

export function hue (img, _h, _s, _v) {
	const w = img.width;
	const h = img.height;
	_h = _h || 0;
	_s = _s || 0;
	_v = _v || 0;
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	ctx.translate(w / 2, h / 2);
	ctx.drawImage(img, -w / 2, -h / 2, w, h);
	ctx.translate(-w / 2, -h / 2);

	const imageData = ctx.getImageData(0, 0, w, h);
	const pixels = imageData.data;
	let rgb;
	let hsv;
	for (let i = 0, len = pixels.length; i < len; i += 4) {
		hsv = rgbToHsv(pixels[i], pixels[i + 1], pixels[i + 2]);
		rgb = hsvToRgb((hsv.h + _h) % 1, Math.max(Math.min(hsv.s + _s, 1), 0), Math.max(Math.min(hsv.v + _v, 1), 0));
		pixels[i] = rgb.r;
		pixels[i + 1] = rgb.g;
		pixels[i + 2] = rgb.b;
	}

	ctx.putImageData(imageData, 0, 0);
	return {url: canvas.toDataURL(), imageData};
}

export function tint (img, color, opacity) {
	const canvas = document.createElement("canvas");
	const bwcanvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	bwcanvas.width = img.width;
	bwcanvas.height = img.height;
	const ctx = canvas.getContext("2d");
	const bwctx = bwcanvas.getContext("2d");

	ctx.fillStyle = color;
	if (opacity != null) {ctx.globalAlpha = opacity;}
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.globalCompositeOperation = "destination-atop";
	ctx.globalAlpha = 1;


	const {imageData} = hue(img, 0, -1, 0);
	bwctx.putImageData(imageData, 0, 0);
	ctx.drawImage(bwcanvas, 0, 0);

	return canvas.toDataURL();
}

export async function loadImage (url, {width, height, crossOrigin} = {}) {
	const img = document.createElement("img");
	if (crossOrigin) {
		img.crossOrigin = crossOrigin;
	}
	img.src = url;

	return new Promise(resolve => {
		img.onload = () => {
			img.width = img.naturalWidth;
			img.height = img.naturalHeight;
			if (width) {
				img.width = width;
				if (!height) {
					img.height = Math.floor(img.naturalHeight * (width / img.naturalWidth));
				}
			}
			if (height) {
				img.height = height;
				if (!width) {
					img.width = Math.floor(img.naturalWidth * (height / img.naturalHeight));
				}
			}
			resolve(img);
		};
	});
}

export function imageToCanvas (img, dpr = 1) {
	const w = img.width;
	const h = img.height;
	const canvas = createCanvas(w * dpr, h * dpr);
	const ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0, w * dpr, h * dpr);
	return canvas;
}

export async function someToCanvas (value) {
	if (value instanceof HTMLCanvasElement) {
		return value;
	}
	else if (value instanceof HTMLImageElement) {
		return imageToCanvas(value);
	}
	else if (typeof value === "string") {
		return imageToCanvas(await loadImage(value));
	}
	else if (value instanceof CanvasRenderingContext2D) {
		return value.canvas;
	}
}


export function getImageData (img) {
	const canvas = imageToCanvas(img);
	const ctx = canvas.getContext("2d");
	return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function getCanvasData (canvas) {
	const ctx = canvas.getContext("2d");
	return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function createCanvas (width, height) {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

export function copyCanvas (canvas) {
	const c = createCanvas(canvas.width, canvas.height);
	c.getContext("2d").drawImage(canvas, 0, 0);
	return c;
}

export const getPoint = (x, y, imageData, alpha = true) => {
	const data = imageData.data;
	const i = (y * imageData.width * 4) + (x * 4);
	if (alpha) {
		return [
			data[i + 0],
			data[i + 1],
			data[i + 2],
			data[i + 3],
		];
	}
	else {
		return [
			data[i + 0],
			data[i + 1],
			data[i + 2],
		];
	}
};

export const setPoint = (x, y, imageData, rgba) => {
	const data = imageData.data;
	const i = (y * imageData.width * 4) + (x * 4);
	data[i + 0] = rgba[0];
	data[i + 1] = rgba[1];
	data[i + 2] = rgba[2];
	data[i + 3] = rgba[3];
};


export function getContrast (color, threshold = 130) {
	const hexVal = colorToArray(color);
	const [r, g, b] = hexVal;
	const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
	return brightness > threshold ? "#000000" : "#ffffff";
}

export function toDPR (canvas, srcDpr = 1, destDpr = 1) {
	const w = (canvas.width / srcDpr) * destDpr;
	const h = (canvas.height / srcDpr) * destDpr;
	const dst = createCanvas(w, h);
	const ctx = dst.getContext("2d");
	ctx.drawImage(canvas, 0, 0, w, h);
	return dst;
}

export function colorDistance (v1, v2) {
	let i;
	let d = 0;
	for (i = 0; i < v1.length; i++) {
		d += Math.pow(v1[i] - v2[i], 2);
	}

	const result = Math.sqrt(d);
	return result;
}

export function colorAvg (colors) {
	const acc = colors.reduce((acc, i) => {
		for (let n = 0; n < 4; n++) {
			acc[n] += i[n];
		}
		return acc;
	}, [0, 0, 0, 0]);
	for (let n = 0; n < 4; n++) {
		acc[n] = Math.round(acc[n] / colors.length);
	}
	return acc;
}

function mixColor (color1, color2, weight = 0.5) {
	weight = Math.min(1, Math.max(0, weight));
	color1 = colorToArray(color1);
	color2 = colorToArray(color2);
	const color = [0, 1, 2, 3].map(ch => Math.floor(color2[ch] + (color1[ch] - color2[ch]) * weight));
	return color;
}

export async function replaceColor (canvasOrImage, from, to, distance = 0, mix = 1) {
	const canvas = await someToCanvas(canvasOrImage);
	const ctx = canvas.getContext("2d");
	const data = await getCanvasData(canvas);
	const colorFrom = colorToArray(from);
	const coloTo = colorToArray(to);
	for (let x = 0; x < data.width; x++) {
		for (let y = 0; y < data.height; y++) {
			const pointColor = getPoint(x, y, data);
			if (colorDistance(colorFrom, pointColor) <= distance) {
				setPoint(x, y, data, mixColor(pointColor, coloTo, mix));
			}
		}
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.putImageData(data, 0, 0);
	return canvas;
}


export const colorToArray = (color) => {
	if (Array.isArray(color)) {
		return color;
	}
	colorToArray.canvas = colorToArray.canvas || createCanvas(1, 1);
	colorToArray.ctx = colorToArray.ctx || colorToArray.canvas.getContext("2d");
	colorToArray.ctx.fillStyle = color;
	colorToArray.ctx.fillRect(0, 0, 1, 1);
	return [...getImageData(colorToArray.canvas).data];
};
