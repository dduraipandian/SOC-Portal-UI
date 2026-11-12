import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("no dangerouslySetInnerHTML in src", () => {
  const offenders = files(join(__dirname))
    .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !f.endsWith("safety.test.ts"))
    .filter((f) => readFileSync(f, "utf8").includes("dangerouslySetInnerHTML"));
  expect(offenders).toEqual([]);
});

test("schema.d.ts is current", async () => {
  const stub = readFileSync(join(__dirname, "..", "openapi.yaml"), "utf8");
  const generated = astToString(await openapiTS(stub));
  const committed = readFileSync(join(__dirname, "api", "schema.d.ts"), "utf8");
  const body = (s: string) => s.slice(s.indexOf("export interface paths"));
  expect(body(committed).trim()).toBe(body(generated).trim());
});
