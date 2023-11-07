import Callable from "./callable.js";
import Deferred from "./deferred.js";

function cacheableFactory ({makeReactive, patchCacheable, patchCacheableRecord} = {}) {

	const defaultKey = Symbol("defaultKey");

	class CacheableRecord {
		#persist = null;
		#state = {
			persist: {
				value: undefined,
				error: undefined,
				state: "pending",
				data: {},
			},
			value: undefined,
			error: undefined,
			state: "pending",
			data: {},
			valid: true,
		};
		initState (call, options, {update = true, hard = false} = {}) {
			if (call !== undefined) {
				this.#state.call = call;
			}
			if (options !== undefined) {
				this.#state.options = options;
			}
			const deferred = new Deferred();
			const promise = deferred.promise;
			this.#state.called = update;
			this.#state.valid = true;
			this.#state.promise = promise;

			if (hard) {
				this.#state.persist.value = undefined;
				this.#state.persist.error = undefined;
				this.#state.persist.state = "pending";
				this.#state.persist.data = {};
			}
			// this.#state.then = promise.then.bind(promise);
			// this.#state.catch = promise.catch.bind(promise);
			console.log("XX: CacheableRecord update", update);
			const val = update ? this.#state.call.call(null, this.#state) : undefined;
			this.#state.originalPromise = Promise.resolve(val);
			this.#state.value = undefined;
			this.#state.error = undefined;
			this.#state.state = "pending";
			this.#state.data = {};
			this.#state.originalPromise
				.then(value => {
					this.#state.state = "ready";
					this.#state.persist.state = "ready";
					this.#state.value = value;
					this.#state.persist.value = value;
					deferred.resolve(value);
				})
				.catch(error => {
					this.#state.state = "error";
					this.#state.persist.state = "error";
					this.#state.error = error;
					this.#state.persist.error = error;
					deferred.reject(error);
				});

			if (patchCacheableRecord) {
				return patchCacheableRecord(this, this.#state, val);
			}
		}
		constructor (call, options, {update = true, hard = false} = {}) {

			if (typeof makeReactive === "function") {
				this.#state = makeReactive(this.#state);
				this.#state.persist = makeReactive(this.#state.persist);
			}
			const state = this.#state;
			this.#persist = {
				get value () {
					return state.persist.value;
				},
				get state () {
					return state.persist.state;
				},
				get data () {
					return state.persist.data;
				},
				get error () {
					return state.persist.error;
				},
			};

			this.initState(call, options, {update, hard});
		}
		get called () {
			return this.#state.called;
		}
		get valid () {
			return this.#state.valid;
		}
		set valid (value) {
			this.#state.valid = value;
		}
		get data () {
			return this.#state.data;
		}
		get persist () {
			return this.#persist;
		}
		get error () {
			return this.#state.error;
		}
		get value () {
			return this.#state.value ?? this.#state.options?.defaultValue;
		}
		get state () {
			return this.#state.state;
		}
		get promise () {
			return this.#state.promise;
		}
		get then () {
			return this.#state.promise.then.bind(this.#state.promise);
		}
		get catch () {
			return this.#state.promise.catch.bind(this.#state.promise);
		}
		[Symbol.toPrimitive] (hint) {
			const value = this.#state.value ?? this.#state.options?.defaultValue;
			if (hint === "string") {
				return value != null ? this.#state.value.toString() : "";
			}
			else if (hint === "number") {
				return +value;
			}
			return value;
		}
		// toString () {
		// 	return this.#state.value != null ? this.#state.value.toString() : "";
		// }
		// valueOf () {
		// 	return this.#state.value;
		// }
		toJSON () {
			return this.#state.value ?? this.#state.options?.defaultValue;
		}
	}

	function evalFn (fn, ...args) {
		if (typeof fn === "function") {
			return fn(...args);
		}
		return fn;
	}

	class Cacheable extends Callable {
		#state = {};
		static getKey (updateParam) {
			return updateParam !== undefined ? JSON.stringify(updateParam) : defaultKey;
		}
		constructor (...args) {
			super(...args);
			return Callable.chain(
				// eslint-disable-next-line constructor-super
				this,
				() => {
					if (typeof makeReactive === "function") {
						this.#state = makeReactive({});
					}
					this.reset();
					const updateFn = args[0];
					let commonParamsFn;
					let options;
					if (typeof args[1] === "function") {
						commonParamsFn = args[1];
						options = args[2] || {};
					}
					else {
						options = args[1] || {};
					}

					this.#state.updateFn = updateFn;
					this.#state.commonParamsFn = commonParamsFn;
					this.#state.options = options;
					this.#state.createRecord = (updateParam, key, {update = true, hard = false} = {}) => {
						return new CacheableRecord(($state) => evalFn(this.#state.updateFn, updateParam, this.#state.commonParams, $state), options, {update, hard});
					};
					if (typeof patchCacheable === "function") {
						return patchCacheable(this, this.#state, args);
					}
					this.toString = () => this.#state.updateFn.toString();
					return this;
				}
			);
		}
		get [Symbol.toStringTag] () {
			return `Cacheable: ${this.#state.updateFn.toString()}`;
		}
		onCall (context, updateParam) {
			return this.get(updateParam);
		}
		reset () {
			this.#state.cache = {};
		}
		validate () {
			const commonParamsFn = this.#state.commonParamsFn;
			const commonParams = commonParamsFn ? commonParamsFn() : commonParamsFn;
			const commonParamsId = JSON.stringify(commonParams);
			// console.log("validate", commonParamsId, this.#state.commonParamsId);
			if (commonParamsId !== this.#state.commonParamsId) {
				this.#state.commonParams = commonParams;
				this.#state.commonParamsId = commonParamsId;
				this.reset();
				return false;
			}
			return true;
		}
		invalidate (updateParam, {hard = false} = {}) {
			const key = Cacheable.getKey(updateParam);
			if (key in this.#state.cache) {
				if (hard) {
					delete this.#state.cache[key];
				}
				else {
					this.#state.cache[key].valid = false;
				}
			}
			return this;
		}
		get value () {
			return this.get(undefined, {update: false})?.value;
		}
		get data () {
			return this.get(undefined, {update: false})?.data;
		}
		get persist () {
			return this.get(undefined, {update: false})?.persist;
		}
		get error () {
			return this.get(undefined, {update: false})?.error;
		}
		get state () {
			return this.get(undefined, {update: false})?.state;
		}
		peek (updateParam, {hard = false} = {}) {
			return this.get(updateParam, {update: false, hard});
		}
		get (updateParam, {update = true, hard = false} = {}) {
			// console.log("cacheable get", JSON.stringify(updateParam));
			this.validate();
			const key = Cacheable.getKey(updateParam);
			if (key in this.#state.cache && this.#state.cache[key].valid && (!update || this.#state.cache[key].called)) {
				return this.#state.cache[key];
			}
			return this.updateCommon(updateParam, key, {update, hard});
		}
		update (updateParam, {update = true, hard = false} = {}) {
			this.validate();
			const key = Cacheable.getKey(updateParam);
			return this.updateCommon(updateParam, key, {update, hard});
		}
		updateCommon (updateParam, key, {update = true, hard = false} = {}) {
			console.log("XX: cacheable update common", updateParam, update);
			let record = this.#state.cache[key];
			if (!record) {
				record = this.#state.createRecord(updateParam, key, {update, hard});
				this.#state.cache[key] = record;
			}
			else {
				record.initState(undefined, undefined, {update, hard});
			}
			return record;
		}
	}

	return {Cacheable, CacheableRecord};
}


export default cacheableFactory;

