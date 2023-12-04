import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, window } from "vscode";

export default function initBoardView() {
  return () => {
    const boardData = Espruino.Core.Env.getBoardData();

    const boardTreeDataProvider = window.registerTreeDataProvider('espruinovscode-board', new BoardTreeDataProvider(boardData));
    return () => boardTreeDataProvider.dispose();
  };
}

export class BoardTreeDataProvider implements TreeDataProvider<string> {
  constructor(private boardData: EspruinoBoardData) { }

  async getChildren(key?: string) {
    if (key) {
      const data = this.boardData[key as keyof EspruinoBoardData];

      if (!data) return [];

      if (typeof data === "number") {
        return Number.isInteger(data) ? [
          data % 1024 === 0
            ? `${data / 1024} KiB`
            : `${data} bytes`
        ] : [data.toString()];
      } else {
        return data.split(',');
      }
    }

    return Object.keys(this.boardData);
  }

  getTreeItem(key: string) {
    const treeItem = new TreeItem(key, key in this.boardData ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);

    treeItem.id = key;

    return treeItem;
  }
}