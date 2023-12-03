import path from "path";
import { Event, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, window } from "vscode";

export default function initStorageView(context: ExtensionContext) {
  const storageTreeDataProvider = new StorageTreeDataProvider();
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.refresh', storageTreeDataProvider.refresh));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.delete', storageTreeDataProvider.delete));
  return async () => {
    await storageTreeDataProvider.refresh();
    const storageTree = window.registerTreeDataProvider('espruinovscode-storage', storageTreeDataProvider);
    return () => storageTree.dispose();
  };
}

export class StorageTreeDataProvider implements TreeDataProvider<string> {
  private files: string[] = [];
  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
  readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;
  constructor() {
  }

  async getChildren(key?: string) {
    if (key) return [];

    return this.files;
  }

  getTreeItem(key: string) {
    const treeItem = new TreeItem(key, TreeItemCollapsibleState.None);

    treeItem.iconPath = {
      light: path.join(__dirname, '..', 'resources/light/document.svg'),
      dark: path.join(__dirname, '..', 'resources/dark/document.svg')
    };

    return treeItem;
  }

  refresh = async () => {
    const files = await executeExpression(`require('Storage').list()`);
    this.files = files
      .sort();

    this._onDidChangeTreeData.fire(undefined);
  };

  delete = async (key: string | undefined) => {
    if (key) {
      await executeExpression(`require('Storage').erase(${JSON.stringify(key)})`);
    } else {
      await executeExpression(`require('Storage').eraseAll()`);
    }
    await this.refresh();
  };
}

async function executeExpression(expression: string) {
  const json = await new Promise<string>(res => Espruino.Core.Utils.executeExpression(expression, res));
  return JSON.parse(json);
}