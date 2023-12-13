declare global {
  type EspruinoPort = {
    description: string,
    path: string
  } & ({
    usb?: unknown
    unimportant?: boolean
    type?: undefined
  } | {
    rssi: number,
    type: 'bluetooth'
  } | {
    type: 'socket'
  })

  interface EspruinoSerialConnectInfo {
    error?: string;
    portName?: string
  }

  interface EspruinoBoardData {
    BOARD: string;
    VERSION: string;
    RAM: number;
  }

  var Espruino: {
    callProcessor(processor: string, data: any, callback: (data: any) => void): void;
    addProcessor(processor: string, callback: (data: any, done: (data: any) => void) => void): void;
    Config: {
      [key: string]: any
      set(key: string, value: any): void
    }
    Core: {
      CodeWriter: {
        writeToEspruino(code: string, callback?: () => void): void;
      },
      Env: {
        getBoardData(): EspruinoBoardData
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
        parseJSONish<T>(json: string): T;
        downloadFile(fileName: string, callback: (result?: string) => void): void;
        uploadFile(fileName: string, contents: string, callback: () => void): void;

      }
    },
    Plugins: {
      LocalModules: {
        setCwd(cwd: string): void;
      }
    }
  }
}

export { }

