import { ipcMain } from "electron";
import { getProjectList, getSubProjectList, saveUserCredentials, getUserCredentials, saveProjectsData, getLastUpdateTime } from "./db";
import { getPage, isSignedIn, login, logout, crawlRepositories } from "../crawling/main";

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
}

export { initIpc };
