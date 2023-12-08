var fs = require("fs");
const { join, relative } = require("path");

/* load all files in EspruinoTools... we do this so we can still
use these files normally in the Web IDE */
function loadJS(filePath) {
  console.log("Found " + filePath);
  var contents = fs.readFileSync(filePath, { encoding: "utf8" });

  return `/*** ${relative(dir, filePath)} ***/
${contents}
`;
  /*
  var realExports = exports;
  exports = undefined;
  var r = eval(contents);
  exports = realExports; // utf8 lib somehow breaks this
  return r;*/
  /* the code below would be better, but it doesn't seem to work when running
   CLI - works fine when running as a module. */
  //return require("vm").runInThisContext(contents, filePath );
}
function loadDir(dir) {
  var files = fs.readdirSync(dir);
  return files
    .filter(file => !file.startsWith('_'))
    .filter(file => file.endsWith(".js"))
    .map(file => dir + "/" + file)
    .map(file => loadJS(file));
}

const dir = join(__dirname, 'node_modules', 'espruino');

const espruinoContent = [
  `
  var escodegen = {};`,
  // Load each JS file...
  // libraries needed by the tools
  //...loadDir(dir + "/libs"),
  ...loadDir(dir + "/libs/esprima"),
  // the 'main' file
  loadJS(dir + "/espruino.js"),
  // Core features
  ...loadDir(dir + "/core"),
  // Various plugins
  ...loadDir(dir + "/plugins"),
  `
  // Bodge up notifications
  Espruino.Core.Notifications = {
    success : function(e) { console.log(e); },
    error : function(e) { console.error(e); },
    warning : function(e) { console.warn(e); },
    info : function(e) { console.log(e); },
  };
  Espruino.Core.Status = {
    setStatus : function(e,len) { console.log(e); },
    hasProgress : function() { return false; },
    incrementProgress : function(amt) {}
  };

  // Finally init everything
  //jqReady.forEach(function(cb){cb();});
  Espruino.init();

  global.Espruino = Espruino;
  `
];

fs.mkdirSync(join(__dirname, 'generated'), { recursive: true });
fs.writeFileSync(join(__dirname, 'generated', 'espruino.js'), espruinoContent.join('\n\n'), 'utf8');

console.log(espruinoContent.length);