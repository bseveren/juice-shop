import path from "node:path";
import Service from "./service.js";

function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  ipcMain.handle("service.setToken", async (_, token: string) => {
    return await Service.storeToken(token);
  });
  createWindow();
});
