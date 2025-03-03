import { ExtensionContext, StatusBarAlignment, window } from "vscode";

export default function initStatusbar(context: ExtensionContext) {
  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 1);
  statusBarItem.command = 'espruinovscode.serial.sendFile';
  statusBarItem.text = '$(run) Espruino';

  context.subscriptions.push(statusBarItem);

  return async () => {
    statusBarItem.show();

    return () => {

      statusBarItem.hide();
    };
  };
}
