// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { dirname } from 'path';
import * as vscode from 'vscode';
import initBoardView from './boardView.js';
import selectDevice from './selectDevice.js';
import { init } from './serial.js';
import initStorageView from './storageView.js';
import { initTerminal } from './terminal.js';


//@ts-ignore
require("../generated/espruino.js");

console.log("Espruino", Espruino);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "espruinovscode" is now active!');
  console.log('espruino', Espruino);

  context.subscriptions.push(init(
    initBoardView(),
    initStorageView(context),
    initTerminal(),
  ));

  context.subscriptions.push(vscode.commands.registerCommand('espruinovscode.serial.connect', async () => {
    const selectedDevice = await selectDevice();

    if (!selectedDevice) return;

    if (Espruino.Core.Serial.isConnected()) Espruino.Core.Serial.close();
    Espruino.Core.Serial.setSlowWrite(true);
    Espruino.Core.Serial.open(
      selectedDevice.port.path,
      (info) => {
        console.log('connect callback', info);
        if (info?.error) {
          vscode.window.showErrorMessage(`Connection failed ${info.error}`);
        } else {
          console.log('connected!');

          const boardData = Espruino.Core.Env.getBoardData();
          if (boardData.BOARD && boardData.VERSION) {
            vscode.window.showInformationMessage(`Connected to ${selectedDevice.label} (${boardData.BOARD} ${boardData.VERSION})`);
          } else {
            vscode.window.showInformationMessage(`Connected to ${selectedDevice.label} (No response from board)`);
          }

          vscode.commands.executeCommand("setContext", "espruinovscode.serial.connected", true);
          Espruino.Core.Utils.getEspruinoPrompt();
        }
      },
      () => {
        console.log('disconnected');
        vscode.window.showWarningMessage(`Disconnected from ${selectedDevice.label}`);
        vscode.commands.executeCommand("setContext", "espruinovscode.serial.connected", false);
      });
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

    Espruino.Config.SET("MODULES_CWD", dirname(selectedFile.fsPath));

    const file = await vscode.workspace.openTextDocument(selectedFile);

    const code = file.getText();
    Espruino.callProcessor("transformForEspruino", code, (code: string) => {
      Espruino.Core.CodeWriter.writeToEspruino(code);
    });
  }));
}

// This method is called when your extension is deactivated
export function deactivate() { }
