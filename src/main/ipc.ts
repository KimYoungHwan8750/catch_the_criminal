import { ipcMain } from "electron";
import {
  getProjectList,
  getSubProjectList,
  saveUserCredentials,
  getUserCredentials,
  deleteUserCredentials,
  saveProjectsData,
  getLastUpdateTime,
  getSubProjectByUuid,
  getCommitsBySubProjectUuid,
  getCommitsByFile,
  getAuthorsBySubProjectUuid,
  getCommitsByAuthor,
  saveCommitWithDetails,
  getCommitDetail,
  insertCommit,
  hasCommitInBranch,
  resetDatabase
} from "./db";
import {
  getPage,
  isSignedIn,
  login,
  logout,
  crawlRepositories,
  getBranches,
  getCommits,
  getCommitDetail as crawlCommitDetail,
  getAuthors
} from "../crawling/main";

function initIpc() {
  ipcMain.on('get-project-list', async (event, arg) => {
    try {
      const result = getProjectList();
      console.log('Project list retrieved:', result);
      event.reply('get-project-list', result);
    } catch (error) {
      console.error('Error in get-project-list handler:', error);
      event.reply('get-project-list', []);
    }
  });

  ipcMain.on('get-sub-project-list', async (event, arg) => {
    try {
      const result = getSubProjectList(arg[0]);
      console.log("arg")
      console.log(arg)
      console.log(arg[0])
      event.reply('get-sub-project-list', result);
    } catch (error) {
      console.error('Error in get-sub-project-list handler:', error);
      event.reply('get-sub-project-list', []);
    }
  });

  ipcMain.on('check-signed-in', async (event) => {
    try {
      const page = getPage();
      const signedIn = await isSignedIn(page);
      console.log('Signed In:', signedIn);

      // 로그인 안 되어있으면 DB에서 자격증명 가져와서 자동 로그인 시도
      if (!signedIn) {
        const credentials = getUserCredentials() as { username: string, password: string };
        if (credentials && credentials.username && credentials.password) {
          console.log('Attempting auto-login with saved credentials...');
          const loginSuccess = await login(credentials.username, credentials.password);
          event.reply('check-signed-in', loginSuccess);
          return;
        }
      }

      event.reply('check-signed-in', signedIn);
    } catch (error) {
      console.error('Error in check-signed-in handler:', error);
      event.reply('check-signed-in', false);
    }
  });

  ipcMain.on('save-credentials', async (event, arg) => {
    try {
      const { username, password } = arg;
      saveUserCredentials(username, password);
      console.log('Credentials saved successfully');
      event.reply('save-credentials', { success: true });
    } catch (error) {
      console.error('Error saving credentials:', error);
      event.reply('save-credentials', { success: false, error: '' });
    }
  });

  ipcMain.on('login-with-credentials', async (event, arg) => {
    try {
      const { username, password } = arg;
      const loginSuccess = await login(username, password);
      console.log('Login result:', loginSuccess);
      event.reply('login-with-credentials', loginSuccess);
    } catch (error) {
      console.error('Error during login:', error);
      event.reply('login-with-credentials', false);
    }
  });

  ipcMain.on('logout', async (event) => {
    try {
      const logoutSuccess = await logout();
      console.log('Logout result:', logoutSuccess);

      // 로그아웃 성공 시 저장된 자격증명 삭제
      if (logoutSuccess) {
        deleteUserCredentials();
        console.log('User credentials deleted');
      }

      event.reply('logout', logoutSuccess);
    } catch (error) {
      console.error('Error during logout:', error);
      event.reply('logout', false);
    }
  });

  ipcMain.on('crawl-and-save-repositories', async (event) => {
    try {
      console.log('Starting repository crawling...');
      const projects = await crawlRepositories();
      console.log(`Crawled ${projects.length} projects, saving to database...`);

      saveProjectsData(projects);
      console.log('Successfully saved all projects to database');

      event.reply('crawl-and-save-repositories', { success: true, count: projects.length });
    } catch (error) {
      console.error('Error during crawl and save:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      event.reply('crawl-and-save-repositories', { success: false, error: errorMessage });
    }
  });

  ipcMain.on('get-last-update-time', (event) => {
    try {
      const lastUpdateTime = getLastUpdateTime();
      event.reply('get-last-update-time', lastUpdateTime);
    } catch (error) {
      console.error('Error getting last update time:', error);
      event.reply('get-last-update-time', null);
    }
  });

  // 브랜치 목록 조회
  ipcMain.on('get-branches', async (event, uuid: string) => {
    try {
      const branches = await getBranches(uuid);
      event.reply('get-branches', branches);
    } catch (error) {
      console.error('Error getting branches:', error);
      event.reply('get-branches', [{ name: 'master', isDefault: true }]);
    }
  });

  // 커밋 목록 조회 (DB에서)
  ipcMain.on('get-commits-from-db', async (event, arg: { uuid: string, fileName?: string, author?: string, branch?: string }) => {
    try {
      const { uuid, fileName, author, branch } = arg;

      let commits;
      if (fileName) {
        commits = getCommitsByFile(uuid, fileName, (branch || undefined) as any);
      } else if (author) {
        commits = getCommitsByAuthor(uuid, author, (branch || undefined) as any);
      } else {
        commits = getCommitsBySubProjectUuid(uuid, (branch || undefined) as any);
      }

      event.reply('get-commits-from-db', commits);
    } catch (error) {
      console.error('Error getting commits from DB:', error);
      event.reply('get-commits-from-db', []);
    }
  });

  // 커밋 크롤링 및 저장 (기본 정보만, 캐싱 지원)
  ipcMain.on('crawl-commits', async (event, arg: { uuid: string, branch?: string }) => {
    try {
      const { uuid, branch = 'master' } = arg;
      console.log(`Crawling commits for ${uuid}, branch: ${branch}`);

      const subProject = getSubProjectByUuid(uuid);
      if (!subProject) {
        throw new Error('SubProject not found');
      }

      // 캐싱 체크 함수: 이 브랜치에 이미 있는 커밋인지 확인
      const checkExisting = (commitId: string): boolean => {
        return hasCommitInBranch(uuid, commitId, branch) as boolean;
      };

      // 진행 상황 콜백 - 커밋 목록 크롤링
      const onProgress = (current: number, total: number | null) => {
        event.reply('crawl-progress', {
          current,
          total,
          branch,
          phase: 'commits',
          message: `커밋 목록 크롤링 중... (${current}${total ? `/${total}` : ''} 페이지)`
        });
      };

      // 커밋 크롤링 (캐싱 지원, 진행 상황 전송)
      const commits = await getCommits(uuid, branch, checkExisting, onProgress);
      console.log(`Crawled ${commits.length} NEW commits for branch ${branch}`);

      // 커밋 기본 정보 저장
      let savedCount = 0;
      for (const commit of commits) {
        try {
          insertCommit(
            commit.commitId,
            (subProject as any).sub_project_id,
            commit.author,
            commit.message,
            (commit.date || undefined) as any,
            branch
          );
          savedCount++;
        } catch (error) {
          console.error(`Error saving commit ${commit.commitId}:`, error);
        }
      }

      console.log(`Successfully saved ${savedCount} commits to branch ${branch}`);

      // DB에서 이 브랜치의 모든 커밋 가져오기 (상세 정보 크롤링 대상)
      const allCommitsInBranch = getCommitsBySubProjectUuid(uuid, (branch || undefined) as any, 10000) as any[];
      console.log(`Total commits in branch ${branch}: ${allCommitsInBranch.length}`);

      // 각 커밋의 상세 정보(파일 목록) 크롤링
      console.log(`Starting to crawl commit details for ${allCommitsInBranch.length} commits...`);
      let detailsSavedCount = 0;

      for (let i = 0; i < allCommitsInBranch.length; i++) {
        const commit = allCommitsInBranch[i] as any;

        // 진행 상황 전송
        event.reply('crawl-progress', {
          current: i + 1,
          total: allCommitsInBranch.length,
          branch,
          phase: 'details',
          message: `커밋 상세 정보 크롤링 중... (${i + 1}/${allCommitsInBranch.length})`
        });

        try {
          // DB에 이미 있는지 체크
          const existingDetails = getCommitDetail(commit.commit_id);
          if (existingDetails && existingDetails.length > 0) {
            console.log(`Commit detail already exists for ${commit.commit_id}, skipping`);
            detailsSavedCount++;
            continue;
          }

          // 상세 정보 크롤링
          const detail = await crawlCommitDetail(uuid, commit.commit_id);

          // DB에 저장
          if (detail && detail.files && detail.files.length > 0) {
            saveCommitWithDetails(
              commit.commit_id,
              uuid,
              commit.committer,
              commit.commit_msg,
              commit.commit_date,
              detail.files,
              branch
            );
            detailsSavedCount++;
            console.log(`✓ Saved details for commit ${commit.commit_id} (${detail.files.length} files)`);
          }
        } catch (error) {
          console.error(`Error crawling commit detail for ${commit.commit_id}:`, error as any);
          // 에러가 나도 계속 진행
        }
      }

      console.log(`Successfully crawled details for ${detailsSavedCount}/${allCommitsInBranch.length} commits`);
      event.reply('crawl-commits', {
        success: true,
        count: savedCount,
        detailsCount: detailsSavedCount,
        branch,
        uuid
      });
    } catch (error) {
      console.error('Error crawling commits:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      event.reply('crawl-commits', { success: false, error: errorMessage });
    }
  });

  // 작성자 목록 조회 (DB에서)
  ipcMain.on('get-authors-from-db', async (event, arg: { uuid: string, branch?: string }) => {
    try {
      const { uuid, branch } = arg;
      const authors = getAuthorsBySubProjectUuid(uuid, (branch || undefined) as any);
      event.reply('get-authors-from-db', authors);
    } catch (error) {
      console.error('Error getting authors from DB:', error);
      event.reply('get-authors-from-db', []);
    }
  });

  // 작성자 목록 조회 (크롤링)
  ipcMain.on('crawl-authors', async (event, uuid: string) => {
    try {
      const authors = await getAuthors(uuid);
      event.reply('crawl-authors', authors);
    } catch (error) {
      console.error('Error crawling authors:', error);
      event.reply('crawl-authors', []);
    }
  });

  // 커밋 상세 정보 조회 (DB에서)
  ipcMain.on('get-commit-detail-from-db', async (event, commitId: string) => {
    try {
      const files = getCommitDetail(commitId);
      event.reply('get-commit-detail-from-db', files);
    } catch (error) {
      console.error('Error getting commit detail from DB:', error);
      event.reply('get-commit-detail-from-db', []);
    }
  });

  // 커밋 상세 정보 크롤링 및 저장
  ipcMain.on('crawl-commit-detail', async (event, arg: { uuid: string, commitId: string, branch?: string }) => {
    try {
      const { uuid, commitId, branch = 'master' } = arg;
      const detail = await crawlCommitDetail(uuid, commitId);

      // DB에 저장
      if (detail && detail.files) {
        const subProject = getSubProjectByUuid(uuid);
        if (subProject) {
          saveCommitWithDetails(
            detail.commitId,
            uuid,
            detail.author,
            detail.message,
            detail.date,
            detail.files,
            branch
          );
          console.log(`Saved commit detail for ${commitId} (branch: ${branch})`);
        }
      }

      event.reply('crawl-commit-detail', detail);
    } catch (error) {
      console.error('Error crawling commit detail:', error);
      event.reply('crawl-commit-detail', null);
    }
  });

  // DB 리셋 (테스트용)
  ipcMain.on('reset-database', async (event) => {
    try {
      console.log('[IPC] Database reset requested');
      const result = resetDatabase();
      event.reply('reset-database', result);
    } catch (error) {
      console.error('[IPC] Error resetting database:', error);
      event.reply('reset-database', { success: false, message: (error as any).message });
    }
  });
}

export { initIpc };
