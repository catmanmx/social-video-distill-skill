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
const profileDir = path.resolve(arg("profile-dir", "browser-profile"));
const statusFile = path.resolve(arg("status", "run-status-login.json"));
const cookieFile = path.resolve(arg("cookies", "cookies.txt"));
const domains = arg("domains", "").split(",").map(s => s.trim()).filter(Boolean);
const stopFile = path.resolve(arg("stop-file", "stop-login"));

if (!url) {
  console.error("Usage: node visible_login_wait.js --url=https://example.com [--profile-dir=browser-profile] [--domains=.example.com]");
  process.exit(2);
}

function writeStatus(data) {
  fs.writeFileSync(statusFile, JSON.stringify({ updated_at: new Date().toISOString(), ...data }, null, 2), "utf8");
}

function domainAllowed(cookie) {
  if (!domains.length) return true;
  return domains.some(domain => cookie.domain === domain || cookie.domain.endsWith(domain));
}

function toNetscape(cookies) {
  const lines = ["# Netscape HTTP Cookie File", "# Generated from a visible user login session."];
  for (const c of cookies.filter(domainAllowed)) {
    const includeSubdomains = c.domain.startsWith(".") ? "TRUE" : "FALSE";
    const secure = c.secure ? "TRUE" : "FALSE";
    const expires = c.expires && c.expires > 0 ? Math.floor(c.expires) : 0;
    lines.push([c.domain, includeSubdomains, c.path || "/", secure, expires, c.name, c.value].join("\t"));
  }
  return `${lines.join("\n")}\n`;
}

(async () => {
  fs.rmSync(stopFile, { force: true });
  writeStatus({ state: "starting", url, profileDir });
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 1000 },
    args: ["--window-size=1440,1000", "--window-position=30,30"],
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.bringToFront().catch(() => {});

  while (!fs.existsSync(stopFile)) {
    const cookies = await context.cookies();
    if (cookies.length) fs.writeFileSync(cookieFile, toNetscape(cookies), "utf8");
    writeStatus({ state: "waiting", cookie_count: cookies.filter(domainAllowed).length, cookieFile });
    await page.waitForTimeout(5000);
  }

  await context.close();
  writeStatus({ state: "stopped", cookieFile });
})().catch(error => {
  writeStatus({ state: "error", error: String(error && error.stack || error) });
  process.exit(1);
});
