#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find(item => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const url = arg("url");
const statePath = path.resolve(arg("state", "track_state.json"));
const outPath = path.resolve(arg("out", "run-update-check.json"));
const newManifestPath = path.resolve(arg("new-manifest", "new-items-manifest.json"));
const profileDir = path.resolve(arg("profile-dir", "browser-profile"));
const scrolls = Number(arg("scrolls", "12"));
const linkPattern = new RegExp(arg("link-pattern", "(video|shorts|reel|note|post)"), "i");
const trustedResponseFilter = arg("trusted-response-filter", "");

if (!url) {
  console.error("Usage: node track_check_updates.js --url=https://example.com/account [--state=track_state.json]");
  process.exit(2);
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstUrl(addr) {
  if (!addr || !Array.isArray(addr.url_list)) return "";
  return addr.url_list.find(Boolean) || "";
}

function idFromUrl(value) {
  const text = String(value || "");
  const match = text.match(/\/(?:video|shorts|reel|note|post)\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

function normalizeJsonItem(item, sourceUrl) {
  if (!item || typeof item !== "object") return null;
  const rawId = item.aweme_id || item.id || item.video_id || item.item_id || item.note_id;
  if (!rawId) return null;
  const video = item.video || {};
  const playAddr = video.play_addr || {};
  const downloadAddr = video.download_addr || {};
  const bitRates = Array.isArray(video.bit_rate) ? video.bit_rate : [];
  const directUrl = firstUrl(playAddr) || firstUrl(downloadAddr) || "";
  const bestRate = bitRates
    .filter(rate => firstUrl(rate.play_addr))
    .sort((a, b) => Number(b.bit_rate || 0) - Number(a.bit_rate || 0))[0];
  const id = String(rawId);
  const pageUrl = item.webpage_url || item.url || item.share_url || item.share_info?.share_url || "";
  return {
    id,
    source_id: id,
    url: pageUrl || "",
    title: clean(item.desc || item.title || item.preview_title || item.share_info?.share_title || ""),
    create_time: item.create_time || item.createTime || null,
    direct_url: directUrl,
    best_url: firstUrl(bestRate?.play_addr) || directUrl,
    source_url: sourceUrl,
  };
}

function collectJsonItems(root, sourceUrl) {
  const items = new Map();
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (Array.isArray(current)) {
      for (const value of current) stack.push(value);
      continue;
    }
    const normalized = normalizeJsonItem(current, sourceUrl);
    if (normalized) items.set(normalized.id, normalized);
    for (const [key, value] of Object.entries(current)) {
      if (!value || typeof value !== "object") continue;
      const k = key.toLowerCase();
      if (k.includes("aweme") || k.includes("post") || k.includes("item") || k.includes("video") || Array.isArray(value)) {
        stack.push(value);
      }
    }
  }
  return items;
}

function readState() {
  if (!fs.existsSync(statePath)) return { source_url: url, known_ids: [], latest_items: [] };
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

(async () => {
  const state = readState();
  const knownIds = new Set((state.known_ids || []).map(String));
  const previousLatestIds = (state.latest_items || []).slice(0, 3).map(item => String(item.id || item.source_id || item.aweme_id || ""));
  const responseItems = new Map();
  const responses = [];

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 1000 },
    args: ["--window-size=1440,1000", "--window-position=30,30"],
  });
  const page = context.pages()[0] || await context.newPage();

  page.on("response", async response => {
    const responseUrl = response.url();
    if (!trustedResponseFilter || !responseUrl.includes(trustedResponseFilter)) return;
    const record = { url: responseUrl, status: response.status() };
    responses.push(record);
    try {
      const data = await response.json();
      const collected = collectJsonItems(data, responseUrl);
      record.item_count = collected.size;
      for (const [id, item] of collected) responseItems.set(id, item);
    } catch (error) {
      record.error = String(error && error.message || error);
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.keyboard.press("Escape").catch(() => {});
  for (let i = 0; i < scrolls; i += 1) {
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(900);
  }

  const dom = await page.evaluate(() => {
    const bodyText = document.body?.innerText || "";
    const links = Array.from(document.querySelectorAll("a[href]")).map(anchor => {
      const images = Array.from(anchor.querySelectorAll("img")).map(img => img.alt || img.getAttribute("aria-label") || "").filter(Boolean);
      return {
        href: anchor.href,
        title: [anchor.innerText, anchor.getAttribute("aria-label"), anchor.getAttribute("title"), images.join(" ")].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      };
    });
    return {
      hasLoginModal: /扫码登录|验证码登录|手机登录|登录后即可|log in|sign in/i.test(bodyText),
      bodySample: bodyText.replace(/\s+/g, " ").slice(0, 280),
      links,
    };
  });
  await context.close();

  const domItems = new Map();
  for (const link of dom.links) {
    if (!linkPattern.test(link.href)) continue;
    const id = idFromUrl(link.href);
    if (!id || domItems.has(id)) continue;
    domItems.set(id, { id, source_id: id, url: link.href, title: clean(link.title), source_url: "dom" });
  }

  const sourceItems = trustedResponseFilter ? responseItems : domItems;
  for (const [id, item] of domItems) {
    if (sourceItems.has(id) && !sourceItems.get(id).title && item.title) sourceItems.get(id).title = item.title;
  }

  const currentItems = Array.from(sourceItems.values());
  const currentIds = new Set(currentItems.map(item => String(item.id)));
  const matchedPrevious = previousLatestIds.filter(id => currentIds.has(id) || domItems.has(id));
  const newItems = currentItems.filter(item => !knownIds.has(String(item.id)));

  let status = newItems.length ? "has_new_items" : "no_new_items";
  let reason = "";
  if (!fs.existsSync(statePath)) {
    status = "initialized";
    reason = "state file did not exist";
  } else if (dom.hasLoginModal) {
    status = "check_failed";
    reason = "login modal detected";
  } else if (currentItems.length === 0) {
    status = "check_failed";
    reason = trustedResponseFilter ? "no trusted response items captured" : "no visible matching links captured";
  } else if (previousLatestIds.length && matchedPrevious.length === 0) {
    status = "possibly_incomplete";
    reason = "none of the previous latest IDs were seen";
  }

  const newManifest = {
    source_url: url,
    generated_at: new Date().toISOString(),
    count: newItems.length,
    items: newItems.map(item => ({
      id: String(item.id),
      source_id: String(item.source_id || item.id),
      url: item.url || "",
      title: item.title || "",
      create_time: item.create_time || null,
      direct_url: item.direct_url || "",
      best_url: item.best_url || item.direct_url || "",
    })),
  };
  fs.writeFileSync(newManifestPath, JSON.stringify(newManifest, null, 2), "utf8");

  const result = {
    timestamp: new Date().toISOString(),
    source_url: url,
    status,
    reason,
    state_path: statePath,
    old_count: knownIds.size,
    current_count: currentItems.length,
    dom_count: domItems.size,
    new_count: newItems.length,
    previous_latest_ids: previousLatestIds,
    matched_previous_latest_ids: matchedPrevious,
    new_manifest: newManifestPath,
    new_items: newManifest.items,
    current_items: currentItems,
    unmatched_dom_items: Array.from(domItems.values()).filter(item => !sourceItems.has(item.id)),
    responses,
  };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify({
    out: outPath,
    new_manifest: newManifestPath,
    status,
    reason,
    old_count: result.old_count,
    current_count: result.current_count,
    dom_count: result.dom_count,
    new_count: result.new_count,
    new_items: result.new_items.map(item => ({ id: item.id, title: item.title, has_direct_url: Boolean(item.best_url) })),
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
