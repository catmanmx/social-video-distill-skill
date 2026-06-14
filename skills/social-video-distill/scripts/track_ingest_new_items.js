#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find(item => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const checkPath = path.resolve(arg("check", "run-update-check.json"));
const newManifestPath = path.resolve(arg("new-manifest", "new-items-manifest.json"));
const manifestPath = path.resolve(arg("manifest", "manifest.json"));
const statePath = path.resolve(arg("state", "track_state.json"));
const commit = process.argv.includes("--commit");

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeItem(item) {
  const id = String(item.id || item.source_id || item.aweme_id || "");
  return {
    id,
    source_id: String(item.source_id || id),
    url: item.url || item.webpage_url || "",
    title: item.title || "",
    create_time: item.create_time || null,
    direct_url: item.direct_url || "",
    best_url: item.best_url || item.direct_url || "",
  };
}

if (!fs.existsSync(checkPath)) {
  console.error(`Missing check file: ${checkPath}`);
  process.exit(2);
}

const check = readJson(checkPath, {});
const newItems = (check.new_items || []).map(normalizeItem).filter(item => item.id);
const newManifest = {
  source_url: check.source_url || "",
  generated_at: check.timestamp || new Date().toISOString(),
  count: newItems.length,
  items: newItems,
};
fs.writeFileSync(newManifestPath, JSON.stringify(newManifest, null, 2), "utf8");

if (commit) {
  const manifest = readJson(manifestPath, { source_url: check.source_url || "", items: [] });
  const existing = new Map((manifest.items || []).map(item => [String(item.id || item.source_id), item]));
  for (const item of newItems) existing.set(item.id, { ...existing.get(item.id), ...item });
  const mergedItems = Array.from(existing.values())
    .map(normalizeItem)
    .sort((a, b) => Number(b.create_time || 0) - Number(a.create_time || 0));
  const mergedManifest = {
    ...manifest,
    source_url: manifest.source_url || check.source_url || "",
    updated_at: new Date().toISOString(),
    count: mergedItems.length,
    items: mergedItems,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(mergedManifest, null, 2), "utf8");

  const state = readJson(statePath, { source_url: check.source_url || "", known_ids: [], latest_items: [] });
  const known = new Set((state.known_ids || []).map(String));
  for (const item of mergedItems) known.add(item.id);
  const updatedState = {
    ...state,
    source_url: state.source_url || check.source_url || "",
    known_ids: Array.from(known),
    latest_items: mergedItems.slice(0, 10),
    last_checked_at: check.timestamp || new Date().toISOString(),
    last_status: check.status || "",
    last_new_ids: newItems.map(item => item.id),
  };
  fs.writeFileSync(statePath, JSON.stringify(updatedState, null, 2), "utf8");
}

console.log(JSON.stringify({
  new_manifest: newManifestPath,
  new_count: newItems.length,
  committed: commit,
  manifest: commit ? manifestPath : null,
  state: commit ? statePath : null,
}, null, 2));
