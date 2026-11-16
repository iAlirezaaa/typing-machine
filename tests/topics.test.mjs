import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("index.html");
const css = read("mobile.css");

test("Notes may be assigned and reassigned a subject independently of text", () => {
  for (const fragment of [
    "const normalizeTopic =",
    "const topicOf =",
    "function setNoteTopic(n, value)",
    "n.topic = next;",
    "n.updated = Date.now();",
    "topic: \"\", created: Date.now()",
    "if (!cur.text.trim() && !topicOf(cur))",
    "notes.includes(n)",
    "Object.hasOwn(n, \"topic\")",
    "topic: normalizeTopic(n.topic)",
  ]) assert.ok(html.includes(fragment), "Missing topic persistence behavior: " + fragment);
  assert.ok(!html.includes("cur.text += topic"), "Topic must not alter stored text");
});

test("Topic editor is accessible while writing and on saved paper; filter is independent of hashtags", () => {
  for (const marker of [
    'id="btnTopic"',
    'id="topicPanel" role="dialog"',
    'id="topicInput"',
    'id="topicChoices"',
    'id="topicFilter"',
    'data-act="topic"',
    'id="topicSave"',
    'id="topicClear"',
    'role="dialog" aria-modal="true"',
    'topicNames(true)',
    'activeTopicFilter === "none"',
    'n.text + " " + topicOf(n)',
    'if (act === "topic") { openTopic(n); return; }'
  ]) assert.ok(html.includes(marker), "Missing subject UI: " + marker);
  assert.ok(css.includes("#drawer #topicFilter"));
  assert.ok(css.includes("#topicPanel"));
  assert.ok(css.includes('#drawer .leaf .acts button'));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  for (const [index, block] of scripts.entries())
    assert.doesNotThrow(() => new Script(block[1], { filename: "topic-script-" + index }));
});

test("Topic metadata stays inside JSON backups and is restored on import", () => {
  assert.ok(html.includes('JSON.stringify({ app: "digital-ink", version: 1, notes }'));
  assert.ok(html.includes('localStorage.setItem(NOTES_KEY, JSON.stringify(notes))'));
  assert.ok(html.includes('ex.topic = Object.hasOwn(n, "topic") ? normalizeTopic(n.topic) : previousTopic'));
  assert.ok(html.includes('topic: normalizeTopic(n.topic)'));
});

test("Topic chooser respects mobile keyboard and offline app packaging", () => {
  assert.ok(css.includes('body.topicing #topicPanel'));
  assert.ok(html.includes('body.topicing #scrim'));
  assert.ok(html.includes("topicTarget = n"));
  assert.ok(read("sw.js").includes("typing-machine-v9"));
  assert.ok(read("release.json").includes('"version": "1.3.1"'));
});
