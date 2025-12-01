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

async function logout() {
  if (!page) throw new Error('Page not initialized');

  try {
    // 로그아웃 페이지로 이동 (실제 Git 서버의 로그아웃 URL)
    await page.goto('http://git.wnpsoft.co.kr/Home/LogOff');
    await page.waitForLoadState('networkidle');

    // 로그아웃 성공 여부 확인 (로그인 페이지로 돌아갔는지 확인)
    const signedOut = !(await isSignedIn(page));
    return signedOut;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

interface SubProject {
  name: string;
  uuid: string;
  url: string;
}

interface Project {
  name: string;
  subProjects: SubProject[];
}

async function crawlRepositories(): Promise<Project[]> {
  if (!page) throw new Error('Page not initialized');

  try {
    // Repository Index 페이지로 이동
    await page.goto('http://git.wnpsoft.co.kr/Repository/Index');
    await page.waitForLoadState('networkidle');

    // select#Repositories에서 optgroup과 option들을 파싱
    const projects = await page.evaluate(() => {
      const select = document.querySelector('select#Repositories');
      if (!select) return [];

      const projectsData: any[] = [];
      const optgroups = select.querySelectorAll('optgroup');

      optgroups.forEach(optgroup => {
        const projectName = optgroup.getAttribute('label') || '';
        const options = optgroup.querySelectorAll('option');
        const subProjects: any[] = [];

        options.forEach(option => {
          const url = option.getAttribute('value') || '';
          const name = option.textContent?.trim() || '';

          // URL에서 UUID 추출: /Repository/Detail/{uuid}
          const uuidMatch = url.match(/\/Repository\/Detail\/([a-f0-9-]+)/i);
          const uuid = uuidMatch ? uuidMatch[1] : '';

          if (name && uuid) {
            subProjects.push({
              name,
              uuid,
              url
            });
          }
        });

        if (projectName && subProjects.length > 0) {
          projectsData.push({
            name: projectName,
            subProjects
          });
        }
      });

      return projectsData;
    });

    console.log(`Crawled ${projects.length} projects`);
    return projects;
  } catch (error) {
    console.error('Crawl repositories error:', error);
    throw error;
  }
}

interface Branch {
  name: string;
  isDefault: boolean;
}

interface Commit {
  commitId: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

interface CommitDetail {
  commitId: string;
  message: string;
  author: string;
  date: string;
  files: CommitFile[];
}

interface CommitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  changes: number;
  additions: number;
  deletions: number;
  diff: string;
}

// 브랜치 목록 조회
async function getBranches(subProjectUuid: string): Promise<Branch[]> {
  if (!page) throw new Error('Page not initialized');

  try {
    // 커밋 페이지로 이동 (master 브랜치 기본)
    await page.goto(`http://git.wnpsoft.co.kr/Repository/${subProjectUuid}/master/Commits`);
    await page.waitForLoadState('networkidle');

    const branches = await page.evaluate(() => {
      const branchNav = document.querySelector('nav.branches');
      if (!branchNav) return [{ name: 'master', isDefault: true }];

      const branchLinks = branchNav.querySelectorAll('li.branch a');
      const branches: any[] = [];

      branchLinks.forEach(link => {
        const name = link.textContent?.trim() || '';
        const isDefault = link.closest('li')?.classList.contains('active') || false;
        
        if (name) {
          branches.push({ name, isDefault });
        }
      });

      return branches.length > 0 ? branches : [{ name: 'master', isDefault: true }];
    });

    return branches;
  } catch (error) {
    console.error('Get branches error:', error);
    return [{ name: 'master', isDefault: true }];
  }
}

// 커밋 목록 조회 (모든 페이지)
async function getCommits(subProjectUuid: string, branch: string = 'master'): Promise<Commit[]> {
  if (!page) throw new Error('Page not initialized');

  try {
    const allCommits: Commit[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      // URL 형식: /Repository/{uuid}/{branch}/Commits?page={page}
      const url = currentPage === 1 
        ? `http://git.wnpsoft.co.kr/Repository/${subProjectUuid}/${branch}/Commits`
        : `http://git.wnpsoft.co.kr/Repository/${subProjectUuid}/${branch}/Commits?page=${currentPage}`;
      
      console.log(`Fetching page ${currentPage}: ${url}`);
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const commits = await page.evaluate(() => {
        const commitElements = document.querySelectorAll('.commit');
        const commitsData: any[] = [];

        commitElements.forEach(element => {
          const linkElement = element.querySelector('h2 a');
          const dateElement = element.querySelector('.commitdate');
          const authorElement = element.querySelector('h4');
          const commitUrl = linkElement?.getAttribute('href') || '';
          
          // URL에서 commit ID 추출
          const commitIdMatch = commitUrl.match(/commit=([a-f0-9]+)/i);
          const commitId = commitIdMatch ? commitIdMatch[1] : '';

          if (commitId) {
            commitsData.push({
              commitId,
              message: linkElement?.textContent?.trim() || '',
              author: authorElement?.textContent?.trim() || '',
              date: dateElement?.textContent?.trim() || '',
              files: []
            });
          }
        });

        return commitsData;
      });

      if (commits.length > 0) {
        allCommits.push(...commits);
        console.log(`Page ${currentPage}: Found ${commits.length} commits (Total: ${allCommits.length})`);
        currentPage++;
      } else {
        // 더 이상 커밋이 없으면 종료
        hasMorePages = false;
        console.log(`No more commits found on page ${currentPage}`);
      }
    }

    console.log(`Total commits fetched: ${allCommits.length}`);
    return allCommits;
  } catch (error) {
    console.error('Get commits error:', error);
    throw error;
  }
}

// 커밋 상세 정보 조회
async function getCommitDetail(subProjectUuid: string, commitId: string): Promise<CommitDetail> {
  if (!page) throw new Error('Page not initialized');

  try {
    await page.goto(`http://git.wnpsoft.co.kr/Repository/Commit/${subProjectUuid}?commit=${commitId}`);
    await page.waitForLoadState('networkidle');

    const commitDetail = await page.evaluate(() => {
      const messageElement = document.querySelector('.commit h2 a');
      const authorElement = document.querySelector('.commit .metadata h4');
      const dateElement = document.querySelector('.commit .commitdate');

      // 변경된 파일 목록
      const fileElements = document.querySelectorAll('.changes .item');
      const files: any[] = [];

      fileElements.forEach(fileElement => {
        const linkElement = fileElement.querySelector('a[href*="Blob"]');
        const countElement = fileElement.querySelector('.count');
        const iconElement = fileElement.querySelector('i.fa');
        
        let status = 'modified';
        if (iconElement?.classList.contains('fa-plus-square-o')) status = 'added';
        else if (iconElement?.classList.contains('fa-minus-square-o')) status = 'deleted';
        else if (iconElement?.classList.contains('fa-edit')) status = 'modified';

        const countText = countElement?.textContent || '';
        const changesMatch = countText.match(/(\d+)\s*\(\+(\d+)\s*-(\d+)\)/);

        files.push({
          path: linkElement?.textContent?.trim() || '',
          status,
          changes: changesMatch ? parseInt(changesMatch[1]) : 0,
          additions: changesMatch ? parseInt(changesMatch[2]) : 0,
          deletions: changesMatch ? parseInt(changesMatch[3]) : 0,
          diff: ''
        });
      });

      // Diff 내용 추출
      const diffElements = document.querySelectorAll('.diff .blob');
      diffElements.forEach((diffElement, index) => {
        const codeElement = diffElement.querySelector('pre code');
        if (codeElement && files[index]) {
          files[index].diff = codeElement.textContent || '';
        }
      });

      return {
        commitId: window.location.search.match(/commit=([a-f0-9]+)/i)?.[1] || '',
        message: messageElement?.textContent?.trim() || '',
        author: authorElement?.textContent?.trim() || '',
        date: dateElement?.textContent?.trim() || '',
        files
      };
    });

    return commitDetail;
  } catch (error) {
    console.error('Get commit detail error:', error);
    throw error;
  }
}

// 작성자 목록 조회
async function getAuthors(subProjectUuid: string): Promise<string[]> {
  if (!page) throw new Error('Page not initialized');

  try {
    // URL 형식: /Repository/{uuid}/master/Commits (기본 브랜치 사용)
    await page.goto(`http://git.wnpsoft.co.kr/Repository/${subProjectUuid}/master/Commits`);
    await page.waitForLoadState('networkidle');

    const authors = await page.evaluate(() => {
      const authorElements = document.querySelectorAll('.commit .metadata h4');
      const authorsSet = new Set<string>();

      authorElements.forEach(element => {
        const author = element.textContent?.trim();
        if (author) authorsSet.add(author);
      });

      return Array.from(authorsSet);
    });

    return authors;
  } catch (error) {
    console.error('Get authors error:', error);
    throw error;
  }
}

export {
  signIn,
  isSignedIn,
  getPage,
  initCrawling,
  login,
  logout,
  crawlRepositories,
  getBranches,
  getCommits,
  getCommitDetail,
  getAuthors
};

export type {
  Branch,
  Commit,
  CommitDetail,
  CommitFile
};
