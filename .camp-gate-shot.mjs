import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:5176/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--no-default-browser-check', '--disable-gpu'],
});

async function scrollToVisit(page, reducedMotion) {
  // gradual scroll to trigger lazy sections + motion
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const total = document.body.scrollHeight;
    for (let y = 0; y <= total; y += window.innerHeight * 0.6) {
      window.scrollTo(0, y);
      await sleep(140);
    }
  });
  // Center the gate media in the viewport.
  await page.evaluate((reduced) => {
    const media = document.querySelector('.visit-gate-media');
    const section = document.querySelector('.visit-choices-section');
    if (reduced && media) {
      const r = media.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + r.top - Math.max(24, (window.innerHeight - r.height) / 3));
    } else if (section) {
      // scroll partway into the 300svh sticky section so the reveal has played
      const r = section.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + r.top + window.innerHeight * 0.5);
    }
  }, reducedMotion);
  await new Promise((r) => setTimeout(r, 1400));
}

async function shoot(label, width, height, reducedMotion) {
  const page = await browser.newPage();
  if (reducedMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await scrollToVisit(page, reducedMotion);
  const gate = await page.evaluate(() => {
    const media = document.querySelector('.visit-gate-media');
    const panels = [...document.querySelectorAll('.visit-gate-panel')].map((p) => {
      const img = p.querySelector('img');
      const r = p.getBoundingClientRect();
      return { cls: p.className.replace('visit-gate-panel ', ''), w: Math.round(r.width), h: Math.round(r.height), imgNatural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null, complete: img ? img.complete : null, objPos: img ? getComputedStyle(img).objectPosition : null, objFit: img ? getComputedStyle(img).objectFit : null };
    });
    const mr = media ? media.getBoundingClientRect() : null;
    const motion = document.querySelector('.visit-gate-media-motion');
    return { found: !!media, opacity: motion ? getComputedStyle(motion).opacity : null, mediaRect: mr ? { w: Math.round(mr.width), h: Math.round(mr.height), top: Math.round(mr.top) } : null, panels };
  });
  console.log(`[${label}] ${JSON.stringify(gate)}`);
  const out = `/tmp/camp-gate-${label}.png`;
  await page.screenshot({ path: out });
  console.log(`[${label}] saved ${out}`);
  await page.close();
}

await shoot('desktop', 1440, 1000, false);
await shoot('desktop-reduced', 1440, 1000, true);
await shoot('mobile', 390, 844, true);
await browser.close();
