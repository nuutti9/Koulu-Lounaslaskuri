import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://fi.jamix.cloud/apps/menu/?anro=93077&k=74&mt=127', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000); // Wait for rendering
  
  await page.screenshot({ path: '/Users/nuutti/Documents/Codex/Kouluounaslaskuri/jamix_screenshot.png' });
  
  // Dump the HTML for the menu list
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('/Users/nuutti/Documents/Codex/Kouluounaslaskuri/jamix_html.html', html);
  
  await browser.close();
}

takeScreenshot();
