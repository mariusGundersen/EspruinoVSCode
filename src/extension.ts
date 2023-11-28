// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


//@ts-ignore
import * as espruino from "../EspruinoTools/index.js";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "espruinovscode" is now active!');
	console.log('espruino', espruino);

	espruino.init(() => {
		console.log('espruino init callback', Espruino);

		const writeEmitter = new vscode.EventEmitter<string>();

		const textDecoder = new TextDecoder('utf-8');
		Espruino.Core.Serial.startListening(data => {
			const text = textDecoder.decode(new Uint8Array(data), { stream: true });
			if (text.length) {
				writeEmitter.fire(text);
			}
		});

		const terminal = vscode.window.createTerminal({
			name: 'Espruino Terminal',
			pty: {
				onDidWrite: writeEmitter.event,
				open: () => Espruino.Core.Serial.write('\r\n'),
				close: () => console.log('closed terminal'),
				handleInput: (ch: string) => Espruino.Core.Serial.write(ch)
			}
		});

		// The command has been defined in the package.json file
		// Now provide the implementation of the command with registerCommand
		// The commandId parameter must match the command field in package.json
		context.subscriptions.push(vscode.commands.registerCommand('espruinovscode.serial.connect', async () => {
			const selectedDevice = await vscode.window.showQuickPick(getPorts(), { title: "Select device", });

			if (!selectedDevice) return;

			Espruino.Core.Serial.close();
			Espruino.Core.Serial.setSlowWrite(true);
			try {

				await new Promise((res, rej) => Espruino.Core.Serial.open(
					selectedDevice?.port.path,
					(info) => info?.error ? rej(info.error) : res(info),
					() => vscode.window.showWarningMessage(`Disconnected from ${selectedDevice.label}`)));

				const { BOARD, VERSION } = Espruino.Core.Env.getBoardData();
				if (BOARD && VERSION) {
					vscode.window.showInformationMessage(`Connected to ${selectedDevice.label} (${BOARD} ${VERSION})`);
				} else {
					vscode.window.showInformationMessage(`Connected to ${selectedDevice.label} (No response from board)`);
				}

				terminal.show();
				Espruino.Core.Utils.getEspruinoPrompt();

			} catch (e) {
				vscode.window.showErrorMessage(`Connection failed ${e}`);
			}
		}));


		context.subscriptions.push(vscode.commands.registerCommand('espruinovscode.serial.disconnect', async () => {
			Espruino.Core.Serial.close();
		}));
	});
}

// This method is called when your extension is deactivated
export function deactivate() { }


async function getPorts() {
	const ports = await new Promise<EspruinoPort[]>(res => Espruino.Core.Serial.getPorts((ports) => res(ports)));

	console.log(ports);

	return ports.map(port => ({
		label: port.path,
		description: port.description,
		port
	}));
}