// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 
  | 'get-project-list' 
  | 'get-sub-project-list' 
  | 'check-signed-in' 
  | 'save-credentials' 
  | 'login-with-credentials' 
  | 'logout' 
  | 'crawl-and-save-repositories' 
  | 'get-last-update-time'
  | 'get-branches'
  | 'get-commits-from-db'
  | 'crawl-commits'
  | 'crawl-progress'
  | 'get-authors-from-db'
  | 'crawl-authors'
  | 'get-commit-detail-from-db'
  | 'crawl-commit-detail'
  | 'reset-database';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },

  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
