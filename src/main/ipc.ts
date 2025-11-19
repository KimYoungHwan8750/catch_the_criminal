import { ipcMain } from "electron";
import { getProjectList, getSubProjectList } from "./db";
import { getPage, isSignedIn } from "../crawling/main";

function initIpc() {
  ipcMain.on('get-project-list', async (event, arg) => {
    try {
      const result = await getProjectList();
      console.log('Project list retrieved:', result);
      event.reply('get-project-list', result);
    } catch (error) {
      console.error('Error in get-project-list handler:', error);
      event.reply('get-project-list', []);
    }
  });

  ipcMain.on('get-sub-project-list', async (event, arg) => {
    try {
      const result = await getSubProjectList(arg[0]);
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
      event.reply('check-signed-in', signedIn);
    } catch (error) {
      console.error('Error in check-signed-in handler:', error);
      event.reply('check-signed-in', false);
    }
  });
}

export { initIpc };
