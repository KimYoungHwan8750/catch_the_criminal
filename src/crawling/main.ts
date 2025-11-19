import { Browser, BrowserContext, chromium, devices, Page } from 'playwright';
import assert from 'node:assert';
let browser: Browser;
let context: BrowserContext;
let page: Page;
async function initCrawling() {  // Setup
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();

  await page.goto('http://git.wnpsoft.co.kr/');

}


function getPage() {
  if(!page) throw new Error('Page not initialized');
  return page;
}


function signIn(page: Page) {
  page.waitForSelector('input[name="Username"]');
}
async function isSignedIn(page: Page) {
  return await (await page.waitForSelector('h1')).textContent() !== 'Sign In';
}

export {
  signIn,
  isSignedIn,
  getPage,
  initCrawling
};
