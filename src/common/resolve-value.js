export async function resolveValue (fn, timeout = 30_000) {
	const start = +new Date();
	const end = timeout > 0 ? start + timeout : timeout;
	return new Promise((resolve, reject) => {
		const checkState = () => {
			const now = +new Date();
			const value = fn();
			if (typeof value !== "undefined") {
				clearInterval(interval);
				resolve(value);
			}
			else if (end > 0 && now >= end) {
				clearInterval(interval);
				reject();
			}
		};
		const interval = setInterval(checkState, 50);
		checkState();
	});
}
