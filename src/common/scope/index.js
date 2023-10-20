let globalScope = createScope();
let activeScope = null;


/**
 * @typedef
 * @name Scope
 * @type {Object}
 * @description scope to provide and inject
 * @property {Object} context context to provide and inject
 * @property {Scope} parentScope parent scope to inherit from
*/

/**
 * @method
 * @name Scope#inject
 * @description inject item from current {@link Scope} context
 * @param {string} key key to inject
 * @return {*}
 */

/**
 * @method
 * @name Scope#provide
 * @param {string} key key to provide
 * @param {*} value value to provide
 * @return {undefined}
 */

/**
 * @param {Scope} [parentScope] scope to inherit from
 * @return {Scope} new scope
 */
export function createScope (parentScope) {
	const scope = {
		context: {},
		parentScope,
		inject (key) {
			if (scope.context[key] !== undefined) {
				return scope.context[key];
			}
			if (parentScope) {
				return parentScope.inject(key);
			}
			throw new Error(`Cannot inject ${key}`);
		},
		provide (key, value) {
			scope.context[key] = value;
		},
	};
	return scope;
}

/**
 * @param {Scope} scope
 * @param {function} fn
 * @returns {*}
 */
export function runInScope (scope, fn) {
	const oldScope = activeScope;
	activeScope = scope;
	try {
		return fn();
	}
	finally {
		activeScope = oldScope;
	}
}

/**
 * @returns {Scope}
 * @description get current active scope
 */
export function getActiveScope () {
	return activeScope || globalScope;
}
