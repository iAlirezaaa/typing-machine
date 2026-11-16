import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { Script } from "node:vm";

const read = path => readFileSync(new URL("../" + path, import.meta.url));
const html = () => read("index.html").toString("utf8");
const css = () => read("fonts/typewriter-persian.css").toString("utf8");

test("OFL Parastoo WOFF2 is locally bundled and its license preserved", () => {
  const file = read("fonts/Parastoo-Persian-Typewriter.woff2");
  assert.equal(file.toString("ascii", 0, 4), "wOF2");
  assert.ok(file.length > 25000, "Persian WOFF2 appears incomplete");
  assert.deepEqual(file, read("dist/fonts/Parastoo-Persian-Typewriter.woff2"));
  const license = read("fonts/licenses/Parastoo-OFL.txt").toString("utf8");
  assert.match(license, /SIL OPEN FONT LICENSE/i);
  assert.match(license, /Saber Rastikerdar|Parastoo Project Authors/i);
  assert.deepEqual(read("fonts/typewriter-persian.css"), read("dist/fonts/typewriter-persian.css"));
});

test("Font face is restricted to Persian script, not Latin or UI", () => {
  const style = css();
  assert.match(style, /font-family: "Digital Ink Persian Press"/);
  assert.match(style, /font-weight: 400 700/);
  assert.match(style, /unicode-range:/);
  assert.match(style, /U\+0600-06FF/);
  assert.match(style, /U\+200C-200D/);
  assert.match(style, /\.fa-typed/);
  assert.match(style, /letter-spacing: 0 !important/);
  assert.doesNotMatch(style, /letter-spacing:\s*0\.01em/);
});

test("Persian paper renders connected words, stable ink, with original note storage", () => {
  const markup = html();
  const compiled = [...markup.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(compiled.length >= 2, "Expected inline editor and launcher scripts");
  for (const [i, match] of compiled.entries()) {
    assert.doesNotThrow(() => new Script(match[1], { filename: "inline-script-" + i }),
      "Inline JavaScript must parse");
  }
  for (const text of [
    "persianPrintMarkup(piece, a, k, v)",
    "persianInkStyle(wordStart, fullText)",
    "PERSIAN_UNIT.test(fullText[wordStart - 1])",
    "PERSIAN_SCRIPT.test(piece)",
    "const hasPersian = PERSIAN_SCRIPT.test(line)",
    "class=\"fa-typed\"",
    "lamplight.notes.v1",
    'href="fonts/typewriter-persian.css?v=1.3.1"',
    'name="app-version" content="1.3.1"',
  ]) assert.ok(markup.includes(text), "Missing Persian rendering feature: " + text);
  assert.ok(markup.includes('id="persian-ink"'), "Gentle grain filter missing");
  assert.ok(!markup.includes('letter-spacing: 0.01em'), "Never separate Persian joins");
});

test("Offline and Windows distributions include the font and the current version", () => {
  assert.deepEqual(read("index.html"), read("dist/index.html"));
  assert.deepEqual(read("sw.js"), read("dist/sw.js"));
  const sw = read("sw.js").toString("utf8");
  assert.match(sw, /typing-machine-v9/);
  assert.ok(sw.includes('"./fonts/Parastoo-Persian-Typewriter.woff2"'));
  assert.ok(sw.includes('"./fonts/typewriter-persian.css?v=1.3.1"'));
  assert.ok(read("serve.py").toString("utf8").includes('"/fonts/"'));
  assert.equal(JSON.parse(read("release.json")).version, "1.3.1");
  assert.ok(existsSync(new URL("../dist/fonts/licenses/Parastoo-OFL.txt", import.meta.url)));
});
