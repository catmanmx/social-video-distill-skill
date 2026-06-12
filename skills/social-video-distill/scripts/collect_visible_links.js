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
const out = path.resolve(arg("out", "manifest.json"));
const profileDir = path.resolve(arg("profile-dir", "browser-profile"));
const scrolls = Number(arg("scrolls", "10"));
const linkPattern = new RegExp(arg("link-pattern", "(video|shorts|reel|note|post)"), "i");

if (!url) {
  console.error("Usage: node collect_visible_links.js --url=https://example.com/profile --out=manifest.json");
  process.exit(2);
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

(async () => {
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  for (let i = 0; i < scrolls; i += 1) {
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(800);
  }

  const links = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map((a, index) => {
    const images = Array.from(a.querySelectorAll("img")).map(img => img.alt || img.getAttribute("aria-label") || "").filter(Boolean);
    return {
      index,
      url: a.href,
      title: [a.innerText, a.getAttribute("aria-label"), a.getAttribute("title"), images.join(" ")].filter(Boolean).join(" "),
    };
  }));

  const seen = new Set();
  const items = [];
  for (const link of links) {
    if (!linkPattern.test(link.url)) continue;
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    items.push({ id: String(items.length + 1).padStart(3, "0"), url: link.url, title: clean(link.title) });
  }

  fs.writeFileSync(out, JSON.stringify({ source_url: url, count: items.length, items }, null, 2), "utf8");
  await context.close();
  console.log(JSON.stringify({ out, count: items.length }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
