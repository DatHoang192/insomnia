import { autoUpdater, BrowserWindow, dialog } from 'electron';

const _sendUpdateStatus = (status: string) => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('updaterStatus', status);
  }
};

export const init = async () => {
  autoUpdater.on('error', error => {
    console.warn(`[updater] Error: ${error.message}`);
    _sendUpdateStatus('Update Error');
  });
  autoUpdater.on('update-not-available', () => {
    console.log('[updater] Not Available');
    _sendUpdateStatus('Up to Date');
  });
  autoUpdater.on('update-available', () => {
    console.log('[updater] Update Available');
    _sendUpdateStatus('Downloading...');
  });
  autoUpdater.on('update-downloaded', async (_error, releaseNotes, releaseName) => {
    console.log(`[updater] Downloaded ${releaseName}`);
    _sendUpdateStatus('Performing backup...');
    _sendUpdateStatus('Updated (Restart Required)');

    dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'A new version of Insomnia has been downloaded. Restart the application to apply the updates.',
    }).then(returnValue => {
      if (returnValue.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
};
