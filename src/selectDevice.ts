import { QuickPickItem, window } from 'vscode';
import { getIcon } from './utils';

interface PortQuickPick extends QuickPickItem {
  port: EspruinoPort | 'socket';
}

export default async function selectDevice(): Promise<EspruinoPort | undefined> {
  const quickPick = window.createQuickPick<PortQuickPick>();
  let cancelled = false;
  try {
    quickPick.title = "Select device";
    quickPick.busy = true;

    continouslyGetPorts(ports => {
      quickPick.items = [...ports, { label: 'TCP/IP...', description: 'Connect to socket', iconPath: getIcon('tcp'), port: 'socket' }];
      return cancelled;
    }).then(() => quickPick.busy = false);

    quickPick.show();

    const selectedItem = await new Promise<PortQuickPick | undefined>((res) => {
      quickPick.onDidAccept(() => res(quickPick.selectedItems[0]));
      quickPick.onDidHide(() => res(undefined));
    });

    if (selectedItem?.port === 'socket') {
      const savedPorts = Espruino.Config.SERIAL_TCPIP ?? [];
      const address = await window.showInputBox({
        title: "Enter tcp/ip address to connect to",
        placeHolder: "tcp://...",
        prompt: "For example tcp://localhost:23, tcp://192.168.0.1",
      });

      if (!address) return undefined;

      if (!savedPorts.includes(address)) {
        Espruino.Config.set("SERIAL_TCPIP", [...savedPorts, address]);
      }

      return {
        type: 'socket',
        description: address,
        path: address
      };
    }

    return selectedItem?.port;
  } finally {
    cancelled = true;
    quickPick.dispose();
  }
}

async function getPorts() {
  return new Promise<{ ports: EspruinoPort[], callAgain: boolean }>(res => Espruino.Core.Serial.getPorts((ports, callAgain) => {
    res({
      ports,
      callAgain
    });
  }));
}

function getPortIcon(port: EspruinoPort): string {
  switch (port.type) {
    case 'bluetooth':
      return 'bluetooth';
    case 'socket':
      return 'tcp';
    default:
      return 'usb';
  }
}

async function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function continouslyGetPorts(update: (ports: PortQuickPick[]) => boolean) {
  const entries = new Map<string, PortQuickPick>();
  while (true) {
    const { ports, callAgain } = await getPorts();
    for (const port of ports) {
      entries.set(port.path, {
        label: port.description,
        description: port.path,
        port,
        iconPath: getIcon(getPortIcon(port))
      });
    }
    const cancel = update([...entries.values()]);
    if (cancel) break;
    if (!callAgain) break;
    await delay(1_000);
  }
}