export const getRouteMeta = (route) =>
	route.matched.reduce((result, $route) =>
		Object.assign(result, $route.meta), {});
