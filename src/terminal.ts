import * as vscode from "vscode";

export function initTerminal() {

  const writeEmitter = new vscode.EventEmitter<string>();

  const textDecoder = new TextDecoder('utf-8');

  let terminal: vscode.Terminal | undefined;
  return () => {
    console.log('create Terminal');
    if (!terminal) {
      terminal = vscode.window.createTerminal({
        name: 'Espruino Terminal',
        pty: {
          onDidWrite: writeEmitter.event,
          open: () => Espruino.Core.Serial.write('\r\n'),
          close: () => {
            terminal?.dispose();
            terminal = undefined;
          },
          handleInput: (ch: string) => Espruino.Core.Serial.write(ch)
        }
      });
    }

    Espruino.Core.Serial.startListening(data => {
      const text = textDecoder.decode(new Uint8Array(data), { stream: true });
      if (text.length) writeEmitter.fire(text);
    });

    terminal.show();
  };
}