export default class Callable extends Function {
	static with (context, ...callbacks) {
		callbacks.forEach(callback => callback.call(context, context));
		return context;
	}
	static chain (context, ...callbacks) {
		return callbacks.reduce((context, callback) => callback.call(context, context), context);
	}
	constructor (...args) {
		super();
		const self = this;
		const bound = function (...args) {
			const context = this;
			return typeof self.onCall === "function" ? self.onCall.call(bound, context, ...args) : self.onCall;
		};
		bound.__proto__ = self.__proto__;
		bound.toString = () => self.onCall ? self.onCall.toString() : self.toString();
		return bound;
	}
}


