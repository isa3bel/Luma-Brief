// Adds the <title>/description/Open Graph/Twitter meta tags that make a
// shared luma-brief.vercel.app link show a preview card (in iMessage,
// Slack, LinkedIn, etc.) instead of a bare link.
//
// Why this exists instead of `src/app/+html.tsx`: that's the file Expo
// Router docs point to for customizing the root <head>, but it only runs
// when app.json's `web.output` is "static" or "server" — this project uses
// "single" (one prebuilt index.html, all routing client-side, matching
// vercel.json's catch-all rewrite), and in that mode Expo always emits its
// own generic shell and never calls +html.tsx at all. Confirmed by hand:
// with output left as "single", a marker write placed at the top of
// +html.tsx never ran; switching output to "static" made it run
// immediately. Filed here instead of switching output modes, which would
// change how every route is built and risk the working Vercel deploy for a
// one-page feature.
//
// Runs as a postbuild step (see vercel.json's buildCommand) against the
// dist/index.html that `expo export -p web` just produced.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://luma-brief.vercel.app';
const TITLE = 'LumaBrief — never lose what you learned at an event';
const DESCRIPTION =
  "Sync your Luma calendar, confirm what you attended, and turn your notes into takeaways worth sharing.";
// Regenerate by rendering scripts/og-image.html at 1200x630 (2x = 2400x1260)
// with a headless browser and saving over public/og-image.png.
const IMAGE_URL = `${SITE_URL}/og-image.png`;

const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function main() {
  if (!fs.existsSync(distIndexPath)) {
    throw new Error(`inject-web-meta: ${distIndexPath} not found — run "expo export -p web" first.`);
  }
  let html = fs.readFileSync(distIndexPath, 'utf8');

  const metaTags = [
    `<meta name="description" content="${escapeAttr(DESCRIPTION)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${SITE_URL}" />`,
    `<meta property="og:title" content="${escapeAttr(TITLE)}" />`,
    `<meta property="og:description" content="${escapeAttr(DESCRIPTION)}" />`,
    `<meta property="og:image" content="${IMAGE_URL}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(TITLE)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(DESCRIPTION)}" />`,
    `<meta name="twitter:image" content="${IMAGE_URL}" />`,
  ].join('\n    ');

  if (html.includes('og:title')) {
    throw new Error('inject-web-meta: dist/index.html already has og:title — refusing to double-inject.');
  }

  // Expo's exported shell always has a plain `<title>LumaBrief</title>` (the
  // app.json `name`) with nothing after it on the line — replace it and
  // drop our other tags in right after.
  const titleTag = '<title>LumaBrief</title>';
  if (!html.includes(titleTag)) {
    throw new Error(`inject-web-meta: expected to find ${titleTag} in dist/index.html — Expo's export shell may have changed.`);
  }
  html = html.replace(titleTag, `<title>${escapeAttr(TITLE)}</title>\n    ${metaTags}`);

  fs.writeFileSync(distIndexPath, html);
  console.log('inject-web-meta: added title/description/Open Graph/Twitter tags to dist/index.html');
}

main();
