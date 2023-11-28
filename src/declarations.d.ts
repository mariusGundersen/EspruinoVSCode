declare global {
  interface EspruinoPort {
    description: string,
    path: string,
    usb?: unknown
    unimportant?: boolean
  }

  interface EspruinoSerialConnectInfo {
    error?: string;
    portName?: string
  }

  var Espruino: {
    Core: {
      Env: {
        getBoardData(): { BOARD: string, VERSION: string }
      },
      Serial: {
        getPorts(callback: (ports: EspruinoPort[], shouldCallAgain: boolean) => void): void;
        setSlowWrite(slow: boolean): void;
        open(path: string, opened: (info?: EspruinoSerialConnectInfo) => void, closed: () => void): void;
        close(): void;
        write(data: string, showStatus?: boolean, callback?: () => void): void;
        startListening(callback: (data: ArrayBuffer) => void): void;
      },
      Utils: {
        getEspruinoPrompt(callback?: () => void): void;
      }
    }
  }
}

export { };

