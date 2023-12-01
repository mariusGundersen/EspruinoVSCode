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
    callProcessor(processor: string, data: any, callback: (...args: any[]) => void): void;
    Config: {
      [key: string]: any
      set(key: string, value: any): void
    }
    Core: {
      CodeWriter: {
        writeToEspruino(code: string, callback?: () => void): void;
      },
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
        isConnected(): boolean
      },
      Utils: {
        getEspruinoPrompt(callback?: () => void): void;
        executeExpression(code: string, callback: (result: string) => void): void;
        executeStatement(code: string, callback: (result: string) => void): void;
      }
    },
    Plugins: {
      LocalModules: {
        setCwd(cwd: string): void;
      }
    }
  }
}

export { };

