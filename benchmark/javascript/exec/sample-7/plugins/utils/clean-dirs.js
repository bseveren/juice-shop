const { exec } = require('child_process');

const dirsToClean = [
    'pub',
    'node_modules',
];

const cleanDirs = () => {
    console.log("====== REMOVING Generated assets and node modules ========");
    dirsToClean.forEach((dir) => {
       exec(`rm -rf ${dir}`, () => {
           console.log(`Removed ${dir}\n`)
       })
    });
};

cleanDirs();
