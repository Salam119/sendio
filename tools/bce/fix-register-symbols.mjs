import fs from "node:fs";

const path = "app/register/page.tsx";
const source = fs.readFileSync(path, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

if (!lines[841]?.includes("Back")) {
  throw new Error("Unexpected Back content at line 842");
}

if (!lines[977]?.trim()) {
  throw new Error("Unexpected check mark content at line 978");
}

if (!lines[1100]?.includes("Create account")) {
  throw new Error("Unexpected create button content at line 1101");
}

lines[841] = "        &larr; Back";
lines[977] = "                        {'\\u2713'}";
lines[1100] =
  "                {loading ? 'Sending email...' : 'Create account \\u2192'}";

fs.writeFileSync(path, lines.join(eol), "utf8");

console.log("Registration symbols fixed safely.");
