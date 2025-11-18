import { chromium, devices, Page } from 'playwright';
import assert from 'node:assert';

(async () => {
  // Setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // The actual interesting bit
  await page.goto('http://git.wnpsoft.co.kr/');

  if(await isSignedIn(page)) console.log('Signed In');
  else console.log('Not Signed In');
  await context.close();
  await browser.close();
})();


function signIn(page: Page) {
  page.waitForSelector('input[name="Username"]');
}
async function isSignedIn(page: Page) {
  return await (await page.waitForSelector('h1')).textContent() === 'Sign In';
}
