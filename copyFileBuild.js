var fs = require('fs');
fs.createReadStream('src/index.d.ts').pipe(fs.createWriteStream('dist/index.d.ts'));
fs.createReadStream('src/clientScripts/client.js').pipe(fs.createWriteStream('dist/clientScripts/client.js'));