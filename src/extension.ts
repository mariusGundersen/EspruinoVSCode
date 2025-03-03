// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { dirname } from 'path';
import * as vscode from 'vscode';


//@ts-ignore
import * as espruino from "espruino";
import initBoardView from './boardView.js';
import { initConfig } from './config.js';
import selectDevice from './selectDevice.js';
import { init } from './serial.js';
import initStatusbar from './statusBar.js';
import initStorageView from './storageView.js';
import { initTerminal } from './terminal.js';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "espruinovscode" is now active!');
  console.log('espruino', espruino);

  espruino.init(() => {
    console.log('espruino init callback', Espruino);

    Espruino.awaitProcessor = (processor: string, data: any) => new Promise(res => Espruino.callProcessor(processor, data, res));

    Espruino.Core.Notifications.success = (message: string) => vscode.window.showInformationMessage(message);
    Espruino.Core.Notifications.error = (message: string) => vscode.window.showErrorMessage(message);
    Espruino.Core.Notifications.warning = (message: string) => vscode.window.showWarningMessage(message);
    Espruino.Core.Notifications.info = (message: string) => vscode.window.showInformationMessage(message);


    context.subscriptions.push(initConfig());

    context.subscriptions.push(init(
      initBoardView(),
      initStorageView(context),
      initTerminal(),
      initContext(),
      initStatusbar(context)
    ));

    context.subscriptions.push(vscode.commands.registerCommand('espruinovscode.serial.connect', async () => {

      if (Espruino.Core.Serial.isConnected()) {
        const action = await vscode.window.showWarningMessage("You are already connected to an Espruino device, do you want to disconnect from it?", "Disocnnect");
        if (action) await vscode.commands.executeCommand("espruinovscode.serial.disconnect");
        return;
      }

      const selectedDevice = await selectDevice();

      if (!selectedDevice) return;

      Espruino.Core.Serial.setSlowWrite(true);
      try {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Connecting to ${selectedDevice.description}`
        }, () => connect(selectedDevice, () => vscode.window.showWarningMessage(`Disconnected from ${selectedDevice.description}`)));

        Espruino.Core.Utils.getEspruinoPrompt();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Connection failed ${error}`);
      }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('espruinovscode.serial.disconnect', async () => {
      console.log('disconnect command called');
      Espruino.Core.Serial.close();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('espruinovscode.serial.sendCode', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const code = editor.document.getText(editor.selection);
      console.log('args', code);
      Espruino.Core.Utils.executeExpression(code, function (result) {
        editor.edit(editBuilder => {
          editBuilder.insert(editor.selection.end, `${editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'}//${result}`);
        });
        console.log('result:', result);
      });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('espruinovscode.serial.sendFile', async (selectedFile?: vscode.Uri) => {
      selectedFile ??= vscode.window.activeTextEditor?.document.uri;

      if (!selectedFile) return;

      if (!Espruino.Core.Serial.isConnected()) return;

      Espruino.Config.set("MODULES_CWD", dirname(selectedFile.fsPath));

      const file = await vscode.workspace.openTextDocument(selectedFile);

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Sending ${selectedFile.fsPath} to Espruino device...`,
        cancellable: false
      }, async () => {
        const code = await Espruino.awaitProcessor("transformForEspruino", file.getText());
        await new Promise<void>(res => Espruino.Core.CodeWriter.writeToEspruino(code, res));
      });
    }));
  });
}

// This method is called when your extension is deactivated
export function deactivate() { }

function connect({ path }: EspruinoPort, onDisconnect: () => void) {
  const timeout = AbortSignal.timeout(10_000);
  const connecting = new Promise<string | undefined>((resolve, reject) => Espruino.Core.Serial.open(
    path,
    (info) => {
      if (timeout.aborted) reject('Timeout (10 seconds)');
      else if (info?.error) reject(info.error);
      else resolve(info?.portName);
    },
    onDisconnect));
  return Promise.race([connecting, new Promise((_, rej) => timeout.addEventListener('abort', () => rej('Timeout (10 seconds)')))]);
}

function initContext() {
  return async () => {
    await vscode.commands.executeCommand("setContext", "espruinovscode.serial.connected", true);

    return () => vscode.commands.executeCommand("setContext", "espruinovscode.serial.connected", false);
  };
}