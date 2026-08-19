import { encodeHTML } from "../src/library";

test("encodeHTML: empty input returns empty output", () => {
  expect(encodeHTML([])).toEqual([]);
});
