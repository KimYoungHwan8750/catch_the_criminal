import { ipcMain } from "electron";
import { getProjectList, getSubProjectList } from "./db";

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
}

export { initIpc };