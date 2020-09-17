const mkdirp = require('mkdirp');
const fs     = require('fs');
const getDirName = require('path').dirname;

module.exports = {
    writeFile: function (path, contents) {
        return new Promise((resolve, reject) => {
            mkdirp(getDirName(path), err => {
                if (err) reject(err);

                fs.writeFile(path, contents, resolve);
            });
        });
    }
}