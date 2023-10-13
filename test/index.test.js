import {expect, test} from "vitest";

const stock = {
	type: "apples",
	count: 13,
};

test("stock has 13 apples", () => {
	expect(stock.type).toBe("apples");
	expect(stock.count).toBe(13);
});
