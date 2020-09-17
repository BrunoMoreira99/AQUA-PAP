const exec = require('child_process').exec,
      fs   = require('fs');

function compile(codePath, options) { // Compiles and executes the source code
    return new Promise((resolve, reject) => {
        var codePathArray = codePath.split('/');
        var basePath = codePathArray.slice(0, -1).join('/') + '/';
        var file = codePathArray.pop().split('.');
        var language = file.pop();
        var filename = file.join("");

        if (language === 'cpp') {
            exec(`g++ "${codePath}" -o "${basePath}${filename}.out"`, (error, stdout, stderr) => {
                if (error) {
                    console.log(filename + ".cpp contained an error while compiling.");
                    reject(stderr);
                } else resolve(`${filename}.out`);
            });
        } else if (language === 'c') {
            exec(`gcc "${codePath}" -o "${basePath}${filename}.out"`, (error, stdout, stderr) => {
                if (error) {
                    console.log(filename + ".c contained an error while compiling.");
                    reject(stderr);
                } else resolve(`${filename}.out`);
            });
        } else if (language === 'java') {
            exec(`javac ${codePath}`, (error, stdout, stderr) => {
                if (error) {
                    console.log(filename + ".java contained an error while compiling.");
                    reject(stderr);
                } else resolve(`${filename}`);
            });
        }
    });
}

function generateOutputs(language, basePath, sourceCodeFile, nTestCases, options) {
    return new Promise((resolve, reject) => {
        let outputs = [];

        for (let i = 0; i < nTestCases; i++) {
            let output = new Promise((resolve, reject) => {
                let command, inputPath = options ? (options.hasOwnProperty('inputPath') ? options.inputPath : basePath) : basePath;

                if (/c(pp)?/.test(language)) command = `"${(basePath + '/' + sourceCodeFile).split('/').join('\\')}"`;
                else if (language === 'java') command = `java -cp ${basePath.split('/').join('\\')} ${sourceCodeFile}`;

                exec(`${command} < ${inputPath}/input${i} > ${basePath}/output${i}`, (error, stdout, stderr) => { // Execute source code
                    if (error) {
                        if (error.toString().includes("Error: stdout maxBuffer exceeded.")) {
                            //callback({ error: "stdout maxBuffer exceeded. You might have initialized an infinite loop."});
                        } else {
                            //callback({ error: stderr });
                        }
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            outputs.push(output);
        }

        Promise.all(outputs).then(() => {
            resolve();
        }).catch(err => {
            reject(err);
        });
    });
}

function validateSubmission(codePath, challengePath) {
    return new Promise((resolve, reject) => {
        var basePath = codePath.split('/').slice(0, -1).join('/');
        var language = codePath.split('.').pop();

        compile(codePath).then(sourceCodeFile => {
            fs.readdir(challengePath, (err, files) => {
                let testcases = [];
                let nTestCases = files.filter(f => f.startsWith('input')).length;

                generateOutputs(language, basePath, sourceCodeFile, nTestCases, { inputPath: challengePath }).then(() => {
                    for (let i = 0; i < nTestCases; i++) {
                        let testcase = new Promise((resolve, reject) => {
                            let submissionOutput = new Promise((resolve, reject) => {
                                fs.readFile(`${basePath}/output${i}`, 'utf8', (err, data) => {
                                    if (err) reject(err);
                                    else resolve(data);
                                });
                            });

                            let originalOutput = new Promise((resolve, reject) => {
                                fs.readFile(`${challengePath}/output${i}`, 'utf8', (err, data) => {
                                    if (err) reject(err);
                                    else resolve(data);
                                });
                            });

                            Promise.join(submissionOutput, originalOutput, (submissionOutput, originalOutput) => {
                                if (submissionOutput === originalOutput) resolve(); // If content of both outputs are equal the test case is Accepted
                                else if (submissionOutput.replace(/\r|\n/g, '') === originalOutput.replace(/\r|\n/g, '')) reject('PRESENTATION_ERROR');
                                else reject('WRONG_ANSWER');
                            });
                        });

                        testcases.push(testcase);
                    }

                    Promise.all(testcases.map(t => t.reflect())).then(results => {
                        if (results.filter(r => r.isFulfilled()).length == nTestCases) resolve(); // Check if all Test Cases were Accepted, resolve if so.
                        else if (results.filter(r => !r.isFulfilled() && r.reason() === 'WRONG_ANSWER').length) reject('WRONG_ANSWER'); // Reject if at least one Test Case has a Wrong Answer.
                        else if (results.filter(r => !r.isFulfilled() && r.reason() === 'PRESENTATION_ERROR').length) reject('PRESENTATION_ERROR'); // Reject if at least one Test Case has a Presentation Error.
                        else reject("UNKNOWN_ERROR");
                    });
                }).catch(err => {
                    reject(err);
                });
            });
        }).catch(err => {
            reject(err);
        });
    });
}

module.exports = { compile: compile, generateOutputs: generateOutputs, validateSubmission: validateSubmission };