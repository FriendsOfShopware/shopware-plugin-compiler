#!/usr/bin/env node
const webpack = require('webpack');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ncp = require('ncp').ncp;
const chalk = require('chalk');

if (process.argv.length === 2) {
    console.error(chalk.red('\n \u{26A0}️  You need to pass the path to the plugin. \u{26A0}️\n'));
    process.exit(1);
}

globalThis.pluginDir = path.resolve(process.argv[2]);
globalThis.compileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin'));

const cleanupFiles = ['static/js/runtime.js', 'static/js/vendors-node.js']
const webpackConfig = require(__dirname + '/webpack.config');
const compiler = webpack(webpackConfig);
compiler.run((err, stats) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log(stats.toString('minimal'));

    for (let file of cleanupFiles) {
        file = `${globalThis.compileDir}/${file}`;
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    }

    let publicAdminPath = `${globalThis.pluginDir}/src/Resources/public/administration`;

    if (!fs.existsSync(publicAdminPath)) {
        fs.mkdirSync(publicAdminPath, {recursive: true});
    }

    let tmpPath = `${globalThis.compileDir}/static/`;
    let folders = fs.readdirSync(tmpPath);

    for (let folder of folders) {
        ncp(`${tmpPath}/${folder}`, `${publicAdminPath}/${folder}`, function (err) {
            if (err) {
                return console.error(err);
            }

            console.log(`Copy ${folder} to plugin public folder`);
        })
    }
});