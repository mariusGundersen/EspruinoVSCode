type ConnectListener = () => (void | (() => void) | Promise<() => void>);


export function init(...connectListeners: ConnectListener[]) {
  const disconnectListeners: (() => void)[] = [];
  Espruino.addProcessor('connected', async (info, done) => {
    console.log('connected processor', info);
    Espruino.Core.Utils.getEspruinoPrompt(async () => {
      for (const listener of connectListeners) {
        const disconnectListener = await Promise.resolve(listener());
        if (disconnectListener) {
          disconnectListeners.push(disconnectListener);
        }
      }
      done(info);
    });
  });

  Espruino.addProcessor('disconnected', (d, done) => {
    disconnectListeners.forEach(listener => listener());
    disconnectListeners.length = 0;
    done(d);
  });

  return {
    dispose() {
      disconnectListeners.forEach(listener => listener());
      disconnectListeners.length = 0;
    }
  };
}