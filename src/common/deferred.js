export default class Deferred {
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
