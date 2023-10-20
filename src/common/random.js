const webcrypto = globalThis?.crypto;

export const cryptoRandom = () => {
	const randomBuffer = new Uint32Array(1);
	webcrypto.getRandomValues(randomBuffer);
	return (randomBuffer[0] / (0xffffffff + 1));
};

export const uuid = () => webcrypto.randomUUID ? webcrypto.randomUUID() : Array.from(webcrypto.getRandomValues(new Uint32Array(4))).map(n => n.toString(16)).join("-");
export const uniqId = (uniqLength = 16) => Array(uniqLength).fill(0).map(x => Math.random().toString(36).charAt(2)).map(ch => Math.random() > 0.5 ? ch.toUpperCase() : ch.toLowerCase()).join("");
export const randomFloat = (min, max) => Math.random() * (max - min) + min;
export const randomInt = (min, max) => Math.floor(min + Math.random() * (max + 1 - min));
