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

// 한글 날짜 형식을 ISO 형식으로 변환
// "2025-12-03 오전 11:00:29" → "2025-12-03 11:00:29"
// "2025-12-03 오후 1:00:00" → "2025-12-03 13:00:00"
function convertKoreanDateToISO(koreanDate: string): string {
  if (!koreanDate) return '';
  
  const match = koreanDate.match(/(\d{4})-(\d{2})-(\d{2})\s+(오전|오후)\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return koreanDate; // 변환 실패 시 원본 반환
  
  const [_, year, month, day, ampm, hour, minute, second] = match;
  let hour24 = parseInt(hour, 10);
  
  if (ampm === '오후' && hour24 !== 12) {
    hour24 += 12;
  } else if (ampm === '오전' && hour24 === 12) {
    hour24 = 0;
  }
  
  return `${year}-${month}-${day} ${hour24.toString().padStart(2, '0')}:${minute}:${second}`;
}

// 브랜치 목록 조회 (별도 페이지 사용)
async function getBranches(subProjectUuid: string): Promise<Branch[]> {
  if (!context) throw new Error('Browser context not initialized');

  let branchPage: Page | null = null;
  
  try {
    // 새로운 페이지 생성 (전역 page와 충돌 방지)
    branchPage = await context.newPage();
    console.log('[getBranches] Created new page for branch fetching');

    // 커밋 페이지로 이동 (master 브랜치 기본)
    await branchPage.goto(`http://git.wnpsoft.co.kr/Repository/${subProjectUuid}/master/Commits`, {
      timeout: 30000
    });
    await branchPage.waitForLoadState('networkidle', { timeout: 30000 });

    const branches = await branchPage.evaluate(() => {
      const branchNav = document.querySelector('nav.branches');
      if (!branchNav) {
        console.log('[Branch Parse] No nav.branches found');
        return [{ name: 'master', isDefault: true }];
      }

      // HTML 구조: nav.branches > ul > li > a.branch (현재 브랜치)
      //                                  > ul > li.branch (브랜치 목록)
      // 중첩된 ul 안에 실제 브랜치 목록이 있음
      const outerUl = branchNav.querySelector('ul');
      if (!outerUl) {
        console.log('[Branch Parse] No outer ul found');
        return [{ name: 'master', isDefault: true }];
      }

      const nestedUl = outerUl.querySelector('ul');
      if (!nestedUl) {
        console.log('[Branch Parse] No nested ul found');
        return [{ name: 'master', isDefault: true }];
      }

      const branchItems = nestedUl.querySelectorAll('li.branch');
      console.log(`[Branch Parse] Found ${branchItems.length} branch items`);
      
      const branches: any[] = [];

      branchItems.forEach(li => {
        const link = li.querySelector('a');
        if (link) {
          const name = link.textContent?.trim() || '';
          const isDefault = li.classList.contains('active');
          
          if (name) {
            console.log(`[Branch Parse] Branch: ${name}, isDefault: ${isDefault}`);
            branches.push({ name, isDefault });
          }
        }
      });

      console.log(`[Branch Parse] Total branches parsed: ${branches.length}`);
      return branches.length > 0 ? branches : [{ name: 'master', isDefault: true }];
    });

    console.log('Found branches:', branches);
    return branches;
  } catch (error) {
    console.error('Get branches error:', error);
    return [{ name: 'master', isDefault: true }];
  } finally {
    // 사용 완료 후 페이지 닫기
    if (branchPage) {
      await branchPage.close();
      console.log('[getBranches] Closed branch page');
    }
  }
}

// 커밋 목록 조회 (모든 페이지, 캐싱 지원)
async function getCommits(
  subProjectUuid: string, 
  branch: string = 'master',
  checkExistingCommit?: (commitId: string) => boolean,
  onProgress?: (current: number, total: number | null) => void
): Promise<Commit[]> {
  if (!page) throw new Error('Page not initialized');

  try {
    const allCommits: Commit[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    let cacheHit = false;
    let totalPages: number | null = null;

    while (hasMorePages && !cacheHit) {
      // URL 형식: /Repository/{uuid}/{branch}/Commits?page={page}
      const url = currentPage === 1 
        ? `http://git.wnpsoft.co.kr/Repository/${subProjectUuid}/${branch}/Commits`
        : `http://git.wnpsoft.co.kr/Repository/${subProjectUuid}/${branch}/Commits?page=${currentPage}`;
      
      console.log(`Fetching page ${currentPage}: ${url}`);
      
      // 진행 상황 전송
      if (onProgress) {
        onProgress(currentPage, totalPages);
      }
      
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // 첫 페이지에서 전체 페이지 수 파싱
      if (currentPage === 1 && totalPages === null) {
        totalPages = await page.evaluate(() => {
          const tfoot = document.querySelector('table tfoot td');
          if (!tfoot) return null;
          
          const links = tfoot.querySelectorAll('a');
          if (links.length === 0) return 1; // 페이지네이션 없음 = 단일 페이지
          
          // ">>" 링크 찾기 (마지막 페이지로 이동)
          const lastPageLink = Array.from(links).find(link => link.textContent?.trim() === '>>');
          if (lastPageLink) {
            const href = lastPageLink.getAttribute('href');
            if (href) {
              const match = href.match(/[?&]page=(\d+)/);
              if (match) {
                return parseInt(match[1], 10);
              }
            }
          }
          
          // ">>" 링크가 없으면 숫자 링크 중 최대값 찾기
          let maxPage = 1;
          links.forEach(link => {
            const pageNum = parseInt(link.textContent?.trim() || '0', 10);
            if (!isNaN(pageNum) && pageNum > maxPage) {
              maxPage = pageNum;
            }
          });
          
          return maxPage > 0 ? maxPage : 1;
        });
        
        console.log(`Total pages detected: ${totalPages === 1 ? 'single page' : totalPages + ' pages'}`);
        
        // 첫 페이지 정보로 다시 진행 상황 전송
        if (onProgress) {
          onProgress(currentPage, totalPages);
        }
      }

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
            const rawDate = dateElement?.textContent?.trim() || '';
            commitsData.push({
              commitId,
              message: linkElement?.textContent?.trim() || '',
              author: authorElement?.textContent?.trim() || '',
              date: rawDate,
              files: []
            });
          }
        });

        return commitsData;
      });

      if (commits.length > 0) {
        // 캐싱 체크: DB에 이미 있는 커밋이 나오면 중단
        for (const commit of commits) {
          if (checkExistingCommit && checkExistingCommit(commit.commitId)) {
            console.log(`✓ Cache hit at commit ${commit.commitId}. Stopping crawl.`);
            cacheHit = true;
            break;
          }
          allCommits.push(commit);
        }

        if (!cacheHit) {
          console.log(`Page ${currentPage}: Found ${commits.length} commits (Total: ${allCommits.length})`);
          currentPage++;
        }
      } else {
        // 더 이상 커밋이 없으면 종료
        hasMorePages = false;
        console.log(`No more commits found on page ${currentPage}`);
      }
    }

    console.log(`Total NEW commits fetched: ${allCommits.length}${cacheHit ? ' (stopped at cached commit)' : ''}`);
    
    // 날짜를 ISO 형식으로 변환
    const commitsWithConvertedDates = allCommits.map(commit => ({
      ...commit,
      date: convertKoreanDateToISO(commit.date)
    }));
    
    return commitsWithConvertedDates;
  } catch (error) {
    console.error('Get commits error:', error);
    throw error;
  }
}

// 커밋 상세 정보 조회
async function getCommitDetail(subProjectUuid: string, commitId: string): Promise<CommitDetail> {
  if (!page) throw new Error('Page not initialized');

  try {
    await page.goto(`http://git.wnpsoft.co.kr/Repository/Commit/${subProjectUuid}?commit=${commitId}`, {
      timeout: 60000 // 60초로 증가
    });
    await page.waitForLoadState('networkidle', {
      timeout: 60000 // 60초로 증가
    });

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

    // 날짜를 ISO 형식으로 변환
    return {
      ...commitDetail,
      date: convertKoreanDateToISO(commitDetail.date)
    };
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
