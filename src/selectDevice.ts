import { QuickPickItem, window } from 'vscode';
import { getIcon } from './utils';

interface PortQuickPick extends QuickPickItem {
  port: EspruinoPort;
}

export default async function selectDevice() {
  const quickPick = window.createQuickPick<PortQuickPick>();
  let cancelled = false;
  try {
    quickPick.title = "Select device";
    quickPick.busy = true;

    continouslyGetPorts(ports => {
      quickPick.items = ports;
      return cancelled;
    }).then(() => quickPick.busy = false);

    quickPick.show();

    return await new Promise<PortQuickPick | undefined>((res) => {
      quickPick.onDidAccept(() => res(quickPick.selectedItems[0]));
      quickPick.onDidHide(() => res(undefined));
    });
  } finally {
    cancelled = true;
    quickPick.dispose();
  }
}

async function getPorts() {
  return new Promise<{ ports: PortQuickPick[], callAgain: boolean }>(res => Espruino.Core.Serial.getPorts((ports, callAgain) => {
    res({
      ports: ports.map(port => ({
        label: port.description,
        description: port.path,
        port,
        iconPath: getIcon(port.type === 'bluetooth' ? 'bluetooth' : 'usb')
      })), callAgain
    });
  }));
}

async function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function continouslyGetPorts(update: (ports: PortQuickPick[]) => boolean) {
  const entries = new Map<string, PortQuickPick>();
  while (true) {
    const { ports, callAgain } = await getPorts();
    for (const port of ports) {
      entries.set(port.port.path, port);
    }
    const cancel = update([...entries.values()]);
    if (cancel) break;
    if (!callAgain) break;
    await delay(1_000);
  }
}