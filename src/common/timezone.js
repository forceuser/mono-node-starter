const MS_MINUTE = 60 * 1000;

export const timeoneOffsets = {
	local: (new Date()).getTimezoneOffset(),
	cet: -120,
	kyiv: -180,
};

export function convertTz (dt, to, from = timeoneOffsets.local) {
	const result = +dt + (from * MS_MINUTE) - (to * MS_MINUTE);
	if (typeof dt === "object" && dt instanceof Date) {
		return new Date(result);
	}
	return result;
}
