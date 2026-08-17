import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL || 'http://localhost:5176/';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run','--disable-gpu'] });
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`console.${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => logs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
await page.setViewport({ width: 1440, height: 1000 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
const info = await page.evaluate(() => ({
  title: document.title,
  bodyLen: document.body.innerHTML.length,
  sections: [...document.querySelectorAll('section')].map((s) => s.id || s.className.split(' ')[0]).slice(0, 40),
  hasVisit: !!document.querySelector('.visit-choices-section'),
  rootChildren: document.getElementById('root')?.children.length,
}));
console.log('INFO', JSON.stringify(info, null, 2));
console.log('LOGS', JSON.stringify(logs.slice(0, 40), null, 2));
await browser.close();
