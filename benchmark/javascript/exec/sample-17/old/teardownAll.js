const { execSync } = require("child_process");

async function runCommand(command)
{
    execSync(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

var commands = ['npx renamer --find "default_report.xml" --replace "default_report{{index}}.xml" "**"',
                'npx copyfiles -f report/parallel*/default_report*.xml report',
                'npx copyfiles -f report/parallel*/*.png report',
                'npx junit-merge -d report -o report --out report/mergedJunitReport.xml',
                'npx mochawesome-merge report/parallel*/report.json>report/mergedMochawesomeReport.json',
                'npx marge report/mergedMochawesomeReport.json -f report -o report',
                'node editReport.js']

for(var i = 0; i < commands.length; i++) 
{
    console.log("Executing ", commands[i]);
    runCommand(commands[i]);
}
