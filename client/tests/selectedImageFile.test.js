import test from "node:test";
import assert from "node:assert/strict";

import {
  createObjectUrlManager,
  getSelectedImageMimeType,
  snapshotSelectedImageBeforeReset,
  snapshotSelectedImageFile,
} from "../src/utils/selectedImageFile.js";

test("selected image bytes are copied before the picker is reset", async () => {
  const events = [];
  const original = new File(["darb-proof"], "proof.jpg", { type: "image/jpeg", lastModified: 123 });
  const originalArrayBuffer = original.arrayBuffer.bind(original);
  original.arrayBuffer = async () => {
    events.push("read");
    return originalArrayBuffer();
  };

  const stable = await snapshotSelectedImageBeforeReset(original, () => events.push("reset"));

  assert.deepEqual(events, ["read", "reset"]);
  assert.notEqual(stable.blob, original);
  assert.equal(await stable.blob.text(), "darb-proof");
  assert.equal(stable.name, "proof.jpg");
});

test("picker reset still happens when snapshotting fails", async () => {
  const events = [];
  const unreadable = {
    name: "proof.png",
    type: "image/png",
    arrayBuffer: async () => {
      events.push("read");
      throw new Error("provider access ended");
    },
  };

  await assert.rejects(
    snapshotSelectedImageBeforeReset(unreadable, () => events.push("reset"))
  );
  assert.deepEqual(events, ["read", "reset"]);
});

test("known extensions support Android empty and octet-stream MIME reports", () => {
  assert.equal(getSelectedImageMimeType({ name: "proof.JPG", type: "" }), "image/jpeg");
  assert.equal(getSelectedImageMimeType({ name: "proof.webp", type: "application/octet-stream" }), "image/webp");
  assert.equal(getSelectedImageMimeType({ name: "proof.jpg", type: "image/jpg" }), "image/jpeg");
  assert.equal(getSelectedImageMimeType({ name: "proof.heic", type: "application/octet-stream" }), "");
  assert.equal(getSelectedImageMimeType({ name: "proof.jpg", type: "image/heic" }), "");
});

test("snapshot falls back to an application-owned Blob when File construction is unavailable", async () => {
  const originalFile = globalThis.File;
  const source = new originalFile(["proof"], "proof.png", { type: "image/png" });
  try {
    globalThis.File = undefined;
    const stable = await snapshotSelectedImageFile(source);
    assert.ok(stable.blob instanceof Blob);
    assert.equal(stable.blob instanceof originalFile, false);
    assert.equal(stable.name, "proof.png");
  } finally {
    globalThis.File = originalFile;
  }
});

test("object URL manager revokes replaced and removed previews exactly once", () => {
  const revoked = [];
  let next = 0;
  const manager = createObjectUrlManager({
    createObjectURL: () => `blob:proof-${++next}`,
    revokeObjectURL: (url) => revoked.push(url),
  });

  assert.equal(manager.replace(new Blob(["one"])), "blob:proof-1");
  assert.equal(manager.replace(new Blob(["two"])), "blob:proof-2");
  assert.deepEqual(revoked, ["blob:proof-1"]);
  manager.clear();
  manager.clear();
  assert.deepEqual(revoked, ["blob:proof-1", "blob:proof-2"]);
});
