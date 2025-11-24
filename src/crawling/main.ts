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


async function signIn(page: Page) {
  await page.waitForSelector('input[name="Username"]');
}

async function login(username: string, password: string) {
  if (!page) throw new Error('Page not initialized');

  try {
    // 로그인 페이지로 이동
    await page.goto('http://git.wnpsoft.co.kr/');

    // Username 입력
    await page.waitForSelector('input[name="Username"]', { timeout: 10000 });
    await page.fill('input[name="Username"]', username);

    // Password 입력
    await page.fill('input[name="Password"]', password);

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');

    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');

    // 로그인 성공 여부 확인
    const signedIn = await isSignedIn(page);
    return signedIn;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

async function isSignedIn(page: Page) {
  try {
    const h1Element = await page.waitForSelector('h1', { timeout: 5000 });
    const text = await h1Element.textContent();
    return text !== 'Sign In';
  } catch (error) {
    console.error('Error checking signed in status:', error);
    return false;
  }
}

export {
  signIn,
  isSignedIn,
  getPage,
  initCrawling,
  login
};
