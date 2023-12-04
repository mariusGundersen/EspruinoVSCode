import path from "path";
import { Uri } from "vscode";

export function getIcon(icon: string) {
  return {
    light: Uri.file(path.join(__dirname, '..', `resources/light/${icon}.svg`)),
    dark: Uri.file(path.join(__dirname, '..', `resources/dark/${icon}.svg`))
  };
}