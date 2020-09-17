const router   = require('express').Router();
const passport = require('passport');
const upload   = require('multer')();

const fs        = require('fs');
const writeFile = require('../utils/utils.js').writeFile;

const User      = require('../models/user');
const Challenge = require('../models/challenge');

const Compiler = require('../utils/compiler');


// Home Page
router.get('/', (req, res) => {
    res.render('home', { currentUser: req.user });
});

// Login page
router.get('/login', (req, res) => {
    if (req.user) res.redirect('/');
    else res.render('login');
});

// Process data acquired from the login form and authenticate the user.
router.post('/login', (req, res, next) => {
    passport.authenticate('local-login', (err, user) => {
        if (err) return next(err);
        if (!user) res.status(400).send(req.flash('loginMessage'));
        else {
            return req.login(user, (err) => {
                if (err) return next(err);
                return res.send({ redirect: '/' + user.username });
            });
        }
    })(req, res, next);
});

// process the signup form
router.post('/signup', (req, res, next) => {
    passport.authenticate('local-signup', (err, user) => {
        if (err) return next(err);
        if (!user) res.status(409).send(req.flash('signupMessage'));
        else {
            req.login(user, (err) => {
                if (err) return next(err);
                return res.send({ redirect: '/' + user.username });
            });
        }
    })(req, res, next);
});

// Logout page
router.get('/logout', (req, res) => {
    req.session.destroy();
    req.logout();
    res.redirect('/');
});

// Challenge creation page
router.get('/new', isLoggedIn, (req, res, next) => {
    res.render('newChallenge', { currentUser: req.user });
});

router.post('/new', upload.array('inputs'), (req, res, next) => {
    let data = req.body;
    let challenge = new Challenge();
    challenge.title = data.title;
    challenge.description = data.description || "";
    challenge.wording = data.wording;
    challenge.difficulty = data.difficulty;
    challenge.author = req.user._id;
    for (let i = 0; i < data.eg_i.length; i++) {
        challenge.examples.push({ input: data.eg_i[i], output: data.eg_o[i] });
    }
    console.log(challenge);
    challenge.save((e, challenge) => {
        if (e) console.log(err);
        else {
            console.log("Challenge saved.");
            req.user.challenges.created.push(challenge._id);
            req.user.save(e => {
                if (e) console.log(err);
                else {
                    console.log("Challenge added to user.");
                    writeFile(`database/${req.user._id}/challenges/created/${challenge._id}/${data.fileName}`, data.code, (err) => {
                        if (err) console.log(err);
                        else {
                            console.log("File written successfully.");

                            Compiler.compile(`database/${req.user._id}/challenges/created/${challenge._id}/${data.fileName}`).then(sourceCodeFile => {
                                let inputs = [];

                                for (let i = 0; i < req.files.length; i++) {
                                    let input = new Promise((resolve, reject) => {
                                        writeFile(`database/${req.user._id}/challenges/created/${challenge._id}/input${i}`, req.files[i].buffer, (err) => {
                                            if (err) reject(err);
                                            else resolve();
                                        });
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
                        }
                    });
                    return res.send({ redirect: '/' + req.user.username + '/' + challenge.title });
                }
            })
        }
    });
    //res.status(400).send(req.flash('errorMessage'));
});

router.post('/challenge', (req, res, next) => {
    writeFile(`database/${req.user._id}/challenges/solved/${req.body.challengeID}/${req.body.fileName}`, req.body.code, (err) => {
        if (err) {
            console.log("There was an unknown error writing files.", err);
            res.status(400).send("Unknown Error");
        } else {
            console.log("File written successfully.");

            Compiler.validateSubmission(`database/${req.user._id}/challenges/solved/${req.body.challengeID}/${req.body.fileName}`, `database/${req.body.challengeAuthor}/challenges/created/${req.body.challengeID}`).then((msg) => {
                req.user.challenges.solved.push(req.body.challengeID);
                let newLevel;
                switch (req.body.difficulty) {
                    case 'Starter'     : newLevel = req.user.addExperience(5); break;
                    case 'Easy'        : newLevel = req.user.addExperience(10); break;
                    case 'Intermediate': newLevel = req.user.addExperience(30); break;
                    case 'Hard'        : newLevel = req.user.addExperience(60); break;
                    case 'Impossible'  : newLevel = req.user.addExperience(120); break;
                }
                req.user.stats.submissions.ACCEPTED++;
                req.user.save(e => {
                    if (e) console.log(e);
                });
                Challenge.findById(req.body.challengeID, (err, challenge) => {
                    challenge.solvedTimes++;
                    challenge.save(e => {
                        if (e) console.log(e);
                    });
                });
                res.send({ result: "ACCEPTED", newLevel: (newLevel.level != req.user.stats.level ? newLevel : false) });
            }).catch(err => {
                res.send({ result: err });
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
});

// route middleware to validate :username
router.param('username', (req, res, next, username) => {
    User.findOne({ 'username': new RegExp('^' + username + '$','i') }, (err, user) => {
        if (err) return next(err);
        if (!user) {
            let err = new Error("You're traveling on foreign lands.");
            err.status = 404;
            return next(err);
        }

        req.currentUser = req.user;
        req.user = user;

        next();
    });
});

router.get('/:username', (req, res, next) => {
    res.render('profile', { title: `${req.user.username} ${req.user.name ? '(' + req.user.name + ') ' : ''}· AQUA`, user: req.user, currentUser: req.currentUser, edit: req.currentUser ? JSON.stringify(req.user) === JSON.stringify(req.currentUser) : false });
});

// route middleware to validate :challenge
router.param('challenge', (req, res, next, title) => {
    Challenge.findOne({ 'title': new RegExp('^' + title + '$','i'), 'author': req.user._id }, (err, challenge) => {
        if (err) return next(err);
        if (!challenge) {
            let err = new Error("You're traveling on foreign lands.");
            err.status = 404;
            return next(err);
        }

        req.challenge = challenge;

        next();
    });
});

router.get('/:username/:challenge', (req, res, next) => {
    res.render('challenge', { title: `${req.user.username}/${req.challenge.title} · AQUA`, challenge: req.challenge, currentUser: req.currentUser });
});

/*

// facebook -------------------------------

// send to facebook to do the authentication
router.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

// handle the callback after facebook has authenticated the user
router.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect : '/profile',
    failureRedirect : '/'
}));

// twitter --------------------------------

// send to twitter to do the authentication
router.get('/auth/twitter', passport.authenticate('twitter', { scope : 'email' }));

// handle the callback after twitter has authenticated the user
router.get('/auth/twitter/callback',
passport.authenticate('twitter', {
    successRedirect : '/profile',
    failureRedirect : '/'
}));


// google ---------------------------------

// send to google to do the authentication
router.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

// the callback after google has authenticated the user
router.get('/auth/google/callback',
passport.authenticate('google', {
    successRedirect : '/profile',
    failureRedirect : '/'
}));

// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

// locally --------------------------------
router.get('/connect/local', function(req, res) {
    res.render('connect-local.ejs', { message: req.flash('loginMessage') });
});
router.post('/connect/local', passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

// facebook -------------------------------

// send to facebook to do the authentication
router.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

// handle the callback after facebook has authorized the user
router.get('/connect/facebook/callback',
passport.authorize('facebook', {
    successRedirect : '/profile',
    failureRedirect : '/'
}));

// twitter --------------------------------

// send to twitter to do the authentication
router.get('/connect/twitter', passport.authorize('twitter', { scope : 'email' }));

// handle the callback after twitter has authorized the user
router.get('/connect/twitter/callback',
passport.authorize('twitter', {
    successRedirect : '/profile',
    failureRedirect : '/'
}));


// google ---------------------------------

// send to google to do the authentication
router.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

// the callback after google has authorized the user
router.get('/connect/google/callback',
passport.authorize('google', {
    successRedirect : '/profile',
    failureRedirect : '/'
}));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

// local -----------------------------------
router.get('/unlink/local', isLoggedIn, function(req, res) {
    var user            = req.user;
    user.local.email    = undefined;
    user.local.password = undefined;
    user.save(function(err) {
        res.redirect('/profile');
    });
});

// facebook -------------------------------
router.get('/unlink/facebook', isLoggedIn, function(req, res) {
    var user            = req.user;
    user.facebook.token = undefined;
    user.save(function(err) {
        res.redirect('/profile');
    });
});

// twitter --------------------------------
router.get('/unlink/twitter', isLoggedIn, function(req, res) {
    var user           = req.user;
    user.twitter.token = undefined;
    user.save(function(err) {
        res.redirect('/profile');
    });
});

// google ---------------------------------
router.get('/unlink/google', isLoggedIn, function(req, res) {
    var user          = req.user;
    user.google.token = undefined;
    user.save(function(err) {
        res.redirect('/profile');
    });
});

*/

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();

    res.redirect('/login?redirect=' + req.path.substring(1));
}

module.exports = router;