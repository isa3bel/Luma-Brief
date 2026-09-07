// REPL driver for the Tech Event Dashboard web app (apps/app served via
// `expo start --web`). Run this after the dev server is up; wrap in tmux
// for interactive use, or pipe a heredoc to stdin for a one-shot script.
// Requires `playwright-core` + a downloaded Chromium (see SKILL.md).
import { chromium } from 'playwright-core';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

let browser = null;
let page = null;
const consoleErrors = [];

const COMMANDS = {
  async launch(argStr) {
    if (browser) return console.log('already launched');
    const width = Number(argStr?.split(' ')[0]) || 1280;
    const height = Number(argStr?.split(' ')[1]) || 900;
    browser = await chromium.launch({ args: ['--no-sandbox'] });
    page = await browser.newPage({ viewport: { width, height } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
    console.log(`launched. viewport ${width}x${height}`);
  },

  async nav(url) {
    if (!page) return console.log('ERROR: launch first');
    await page.goto(url || 'http://localhost:8081/', { waitUntil: 'domcontentloaded' });
    console.log('nav ->', page.url());
  },

  async 'wait-for'(text) {
    if (!page) return console.log('ERROR: launch first');
    try {
      await page.waitForSelector(`text=${text}`, { timeout: 15000 });
      console.log('found:', text);
    } catch {
      console.log('TIMEOUT waiting for:', text);
    }
  },

  async click(text) {
    if (!page) return console.log('ERROR: launch first');
    await page.getByText(text, { exact: true }).first().click();
    console.log('clicked:', text);
  },

  async fill(argStr) {
    if (!page) return console.log('ERROR: launch first');
    const [selector, ...rest] = argStr.split(' ');
    await page.fill(selector, rest.join(' '));
    console.log('filled', selector);
  },

  async screenshot(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.innerText(sel || 'body'));
  },

  'console'(mode) {
    if (mode === '--errors') {
      console.log(consoleErrors.length ? consoleErrors.join('\n') : 'none');
    } else {
      console.log(consoleErrors.join('\n'));
    }
  },

  async quit() {
    if (browser) await browser.close().catch(() => {});
    browser = null;
    page = null;
  },
  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '));
  },
};

// (No Electron here, so no need for the /dev/stdin fd trick that skill's
// Electron driver skeleton uses to dodge stdin capture — plain
// process.stdin works fine for a Playwright-only driver.)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'driver> ' });

// readline emits 'line' for every buffered line as soon as it's read,
// without waiting for an async listener to finish — piping several
// commands via a heredoc would otherwise fire them all before `launch`'s
// browser/page setup resolves. Chain them through one promise so a piped
// script behaves the same as typing commands one at a time.
//
// For piped (non-tty) input, readline also auto-closes itself on EOF as
// soon as all lines have been *read* — well before this queue has actually
// run them — so rl.prompt() after that point throws ERR_USE_AFTER_CLOSE.
// safePrompt() below is a no-op once that's happened (and prompting is
// meaningless for a piped script anyway).
let queue = Promise.resolve();
const safePrompt = () => {
  try {
    rl.prompt();
  } catch {
    // rl already closed (EOF on piped input) — nothing to do.
  }
};

rl.on('line', (line) => {
  queue = queue.then(async () => {
    const [cmd, ...rest] = line.trim().split(/\s+/);
    if (!cmd) return safePrompt();
    const fn = COMMANDS[cmd];
    if (!fn) {
      console.log('unknown:', cmd, '- try: help');
      return safePrompt();
    }
    try {
      await fn(rest.join(' '));
    } catch (e) {
      console.log('ERROR:', e.message);
    }
    if (cmd === 'quit') {
      rl.close();
      process.exit(0);
    }
    safePrompt();
  });
});
rl.on('close', async () => {
  await queue;
  await COMMANDS.quit();
  process.exit(0);
});

console.log('tech-event-dashboard web driver - "help" for commands, "launch" to start');
rl.prompt();
