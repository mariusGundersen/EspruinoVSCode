import { workspace } from "vscode";

function getConfigKeys() {
  return Object.entries(Espruino.Core.Config.data).map(([key, data]) => ({
    espruinoKey: key,
    vscodeKey: data.section.toLowerCase() + '.' + key.split('_').map((w, i) => i === 0 ? w.toLowerCase() : w[0] + w.slice(1).toLowerCase()).join(''),
    section: data.section
  }));
}

export function initConfig() {
  const configuration = workspace.getConfiguration('espruinovscode');
  const configKeys = getConfigKeys();
  for (const { espruinoKey, vscodeKey } of configKeys) {
    if (configuration.has(vscodeKey)) {
      const value = configuration.get(vscodeKey);
      Espruino.Config.set(espruinoKey, value);
      console.log('setting', espruinoKey, vscodeKey, value);
    }
  }

  return workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('espruinovscode')) {
      const configuration = workspace.getConfiguration('espruinovscode');
      console.log('Configuration changed!');
      for (const { espruinoKey, vscodeKey } of configKeys) {
        if (e.affectsConfiguration(`espruinovscode.${vscodeKey}`)) {
          const value = configuration.get(vscodeKey);
          Espruino.Config.set(espruinoKey, value);
          console.log('setting', espruinoKey, vscodeKey, value);
        }
      }
    }
  });
}