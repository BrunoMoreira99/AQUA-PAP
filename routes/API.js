const router = require('express').Router();
const multer = require('multer')();
const fs     = require('fs');

const Challenge = require('../models/challenge');

const writeFile     = require('../utils/utils').writeFile;
const Compiler      = require('../utils/compiler');
const parseMarkdown = require('../utils/markdown-renderer');

//Middleware to check if user is authenticated in order to use the API
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    else res.status(401).send();
}

router.post('/settings', isAuthenticated, multer.none(), (req, res, next) => {
    new Promise(resolve => {
        const data = req.body;

        if (data.name != req.user.name) req.user.name = data.name;
        if (data.bio != req.user.biography) req.user.biography = data.bio;
        if (data.url != req.user.url) req.user.url = data.url.toLowerCase();
        if (req.user.url && !/^http(s)?:\/\//.test(req.user.url)) req.user.url = 'http://' + req.user.url;
        if (data.company != req.user.company) req.user.company = data.company;
        if (data.occupation != req.user.occupation) req.user.occupation = data.occupation;
        if (data.location != req.user.location) req.user.location = data.location;
        if (data.email_privacy != req.user.privacy.email) req.user.privacy.email = data.email_privacy;
        if (data.occupation_privacy != req.user.privacy.occupation) req.user.privacy.occupation = data.occupation_privacy;
        if (data.company_privacy != req.user.privacy.company) req.user.privacy.company = data.company_privacy;
        if (data.url_privacy != req.user.privacy.url) req.user.privacy.url = data.url_privacy;
        if (data.location_privacy != req.user.privacy.location) req.user.privacy.location = data.location_privacy;

        if (data.useGravatar) {
            req.user.getGravatarInfo().then(data => {
                req.user.avatar.data = null;
                req.user.avatar.contentType = null;
                req.user.avatar.gravatarURL = data.thumbnailUrl;
                req.user.useGravatar = true;
                resolve();
            }).catch(() => resolve());
        } else resolve()
    }).then(() => {
        req.user.save().then(() => {
            res.end()
        }).catch(err => {
            res.status(500).send("Unknown Error");
            console.log(err);
        });
    });
});

router.post('/ChangePassword', isAuthenticated, async (req, res) => {
    const data = req.body;
    if (data.newpassword !== data.confpassword) return res.status(400).send("PASSWORDS_MISMATCH");
    if (!(await req.user.validatePassword(data.currentpassword))) return res.status(401).send("Unauthorized");

    try {
        req.user.password = await req.user.generateHash(data.newpassword);
        await req.user.save();
        res.end()
    } catch (e) {
        res.status(500).send("Unknown Error");
        console.log(e);
    }
});

router.post('/new', isAuthenticated, multer.array('inputs'), (req, res, next) => {
    let data = req.body;
    let challenge = new Challenge();
    challenge.title = data.title.trim();
    challenge.description = data.description || "";
    challenge.wording = data.wording;
    challenge.difficulty = data.difficulty;
    challenge.author = req.user._id;
    if (data.eg_i instanceof Array) {
        for (let i = 0; i < data.eg_i.length; i++) {
            challenge.examples.push({ input: data.eg_i[i], output: data.eg_o[i] });
        }
    } else challenge.examples.push({ input: data.eg_i, output: data.eg_o });
    challenge.save((e, challenge) => {
        if (e) console.log(e);
        else {
            console.log("Challenge saved.");
            req.user.stats.challenges.created++;
            req.user.addExperience(7000);
            req.user.save(e => {
                if (e) console.log(e);
                else {
                    console.log("Challenge added to user.");
                    writeFile(`database/${req.user._id}/challenges/created/${challenge._id}/${data.fileName}`, data.code).then(() => {
                        console.log("File written successfully.");

                        Compiler.compile(`database/${req.user._id}/challenges/created/${challenge._id}/${data.fileName}`).then(sourceCodeFile => {
                            let inputs = [];

                            for (let i = 0; i < req.files.length; i++) {
                                let input = new Promise((resolve, reject) => {
                                    writeFile(`database/${req.user._id}/challenges/created/${challenge._id}/input${i}`, req.files[i].buffer).then(() => {
                                        resolve();
                                    }).catch(reject);
                                });

                                inputs.push(input);
                            }

                            Promise.all(inputs).then(() => {
                                Compiler.generateOutputs(data.language, `database/${req.user._id}/challenges/created/${challenge._id}`, sourceCodeFile, req.files.length).then(() => {
                                    fs.unlink(`database/${req.user._id}/challenges/created/${challenge._id}/${sourceCodeFile}`, (err) => {
                                        if (!err) console.log('Compiled source code deleted.');
                                    });
                                }).catch(err => {
                                    console.log(err);
                                });
                            }).catch(err => {
                                console.log(err);
                            });
                        }).catch(err => {
                            console.log(err);
                        });
                    }).catch(console.log);
                    return res.send({ redirect: '/' + req.user.username + '/' + challenge.title });
                }
            })
        }
    });
    //res.status(400).send(req.flash('errorMessage'));
});

router.post('/challenge', isAuthenticated, (req, res) => {
    writeFile(`database/${req.user._id}/challenges/solved/${req.body.challengeID}/${req.body.fileName}`, req.body.code).then(() => {
        console.log("File written successfully.");
        Challenge.findById(req.body.challengeID, (err, challenge) => {
            if (!err && challenge) {
                Compiler.validateSubmission(`database/${req.user._id}/challenges/solved/${challenge._id}/${req.body.fileName}`, `database/${challenge.author}/challenges/created/${challenge._id}`).then(() => {
                    let newLevel;
                    switch (challenge.difficulty) {
                        case 'Starter'     : newLevel = req.user.addExperience(4000); break;
                        case 'Easy'        : newLevel = req.user.addExperience(5500); break;
                        case 'Intermediate': newLevel = req.user.addExperience(7000); break;
                        case 'Hard'        : newLevel = req.user.addExperience(8500); break;
                        case 'Impossible'  : newLevel = req.user.addExperience(10000); break;
                    }

                    req.user.stats.challenges.solved++;
                    req.user.stats.submissions[challenge.difficulty.toLowerCase()].results.ACCEPTED++;
                    req.user.stats.submissions[challenge.difficulty.toLowerCase()].languages[req.body.language.toUpperCase()]++;
                    challenge.solvedBy.push(req.user._id);

                    Promise.all([req.user.save(), challenge.save()]).then(() => {
                        res.send({ result: "ACCEPTED", stats: newLevel });
                    }).catch(console.log);
                }).catch(err => {
                    req.user.stats.submissions[challenge.difficulty.toLowerCase()].results[err]++;

                    req.user.save(() => {
                        res.send({ result: err });
                    });

                    fs.unlink(`database/${req.user._id}/challenges/solved/${req.body.challengeID}/${req.body.fileName}`, (err) => {
                        if (!err) console.log('Source code deleted.');
                    });
                }).finally(() => {
                    fs.readdir(`database/${req.user._id}/challenges/solved/${req.body.challengeID}`, (err, files) => {
                        if (err) console.log(err);
                        else files.filter(f => !new RegExp(`(${req.body.language})$`).test(f)).forEach(f => {
                            fs.unlink(`database/${req.user._id}/challenges/solved/${req.body.challengeID}/${f}`, (err) => {
                                if (!err) console.log('Temporary file deleted.');
                            });
                        });
                    });
                });
            }
        });
    }).catch(err => {
        console.log("There was an unknown error writing files.", err);
        res.status(500).send("Internal Server Error");
    });
});

router.post('/RenderMarkdown', isAuthenticated, (req, res) => {
    parseMarkdown(req.body.markdown).then(result => {
        return res.send(result);
    });
});

module.exports = router;