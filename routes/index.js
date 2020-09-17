const router   = require('express').Router();
const passport = require('passport');

const User      = require('../models/user');
const Challenge = require('../models/challenge');

const fs = require('fs');
const moment = require('moment');
const parseMarkdown = require('../utils/markdown-renderer');

// Home Page
router.get('/', (req, res) => {
    res.render('home', { currentUser: req.user });
});

// Login page
router.get('/login', (req, res) => {
    if (req.user) res.redirect('/' + req.user.username);
    else res.render('login');
});

// Login page
router.get('/signup', (req, res) => {
    if (req.user) res.redirect('/' + req.user.username);
    else res.render('signup');
});

// Logout page
router.get('/logout', (req, res) => {
    req.session.destroy();
    req.logout();
    res.redirect('/');
});

// Process data acquired from the login form and authenticate the user.
router.post('/login', (req, res, next) => {
    passport.authenticate('local-login', (err, user) => {
        if (err) return next(err);
        if (!user) res.status(401).send(req.flash('loginMessage'));
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

// User settings page
router.get('/settings', (req, res) => {
    res.redirect('/settings/profile');
});
router.get('/settings/:tab', isAuthenticated, (req, res) => {
    if (req.params.tab == 'profile' || req.params.tab == 'admin') {
        if (req.user.avatar.gravatarURL) res.render('settings', { currentUser: req.user, tab: req.params.tab, focus: req.query.focus });
        else {
            req.user.getGravatarInfo().then(data => {
                res.render('settings', { currentUser: req.user, tab: req.params.tab, focus: req.query.focus, hasGravatar: data.thumbnailUrl });
            }).catch(() => {
                res.render('settings', { currentUser: req.user, tab: req.params.tab, focus: req.query.focus });
            });
        }
    } else res.redirect('/settings/profile');
});

// Challenge creation page
router.get('/new', isAuthenticated, (req, res) => {
    res.render('newChallenge', { currentUser: req.user, isNewChallenge: true });
});

// Search page
router.get('/search', (req, res, next) => {
    const query = req.query.q;

    const queries = [
        User.find({ $or: [{ 'username': new RegExp(query, 'i') }, { 'name': new RegExp(query, 'i') }] }).select('username name avatar useGravatar biography stats.level stats.challenges').limit(10).exec(),
        Challenge.find({ 'title': new RegExp(query, 'i') }).select('title description difficulty author').limit(10).populate('author', 'username').exec()
    ];

    Promise.all(queries).then(result => {
        res.render('search', { currentUser: req.user, query: query, users: result[0], challenges: result[1] });
    }).catch(err => next(err));
});

// route middleware to validate :username
router.param('username', (req, res, next, username) => {
    User.findOne({ 'username': new RegExp('^' + username + '$','i') }).select({ 'password': 0 }).exec().then(user => {
        if (!user) {
            let err = new Error("You're traveling on foreign lands.");
            err.status = 404;
            return next(err);
        }
        req._user = user;
        next();
    }).catch(next);
});

router.get('/:username', (req, res) => {
    req.app.locals.moment = moment;
    req.app.locals.moment.locale('pt');

    var query = false;
    if (req.query.tab == 'challenges') {
        var page = req.query.page ? req.query.page : 1;
        query = req._user.getCreatedChallenges()
            .select('title description difficulty createdAt')
            .sort({ createdAt: 1 })
            .skip((page - 1) * 12)
            .limit(12)
            .lean();
    } else if (req.query.tab == 'solved') {
        var page = req.query.page ? req.query.page : 1;
        query = req._user.getSolvedChallenges()
            .select('title description difficulty createdAt author')
            .skip((page - 1) * 12)
            .limit(12)
            .populate('author', 'username avatar useGravatar')
            .lean();
    }

    if (query) {
        query.exec().then(data => {
            let challenges = [];
            while (data[0]) {
                challenges.push(data.splice(0, 3));
            }
            res.render('profile', {
                title: `${req._user.username} ${req._user.name ? '(' + req._user.name + ') ' : ''}· AQUA`,
                currentUser: req.user,
                user: req._user,
                challenges: challenges,
                edit: req.isAuthenticated() ? req.user._id.toString() === req._user._id.toString() : false,
                tab: req.query.tab,
                page: page
            });
        }).catch(console.error);
    } else {
        res.render('profile', {
            title: `${req._user.username} ${req._user.name ? '(' + req._user.name + ') ' : ''}· AQUA`,
            currentUser: req.user,
            user: req._user,
            edit: req.isAuthenticated() ? req.user._id.toString() === req._user._id.toString() : false,
            tab: req.query.tab
        });
    }
});

// route middleware to validate :challenge
router.param('challenge', (req, res, next, title) => {
    Challenge.findOne({ 'title': new RegExp('^' + title + '$','i'), 'author': req._user._id }).then(challenge => {
        if (!challenge) {
            let err = new Error("You're traveling on foreign lands.");
            err.status = 404;
            return next(err);
        }

        req.challenge = challenge;
		parseMarkdown(req.challenge.wording).then(result => {
			req.challenge.wording = result;
			next();
		});
    }).catch(next);
});

router.get('/:username/:challenge', async (req, res, next) => {
    try {
        if (req.isAuthenticated() && await req.user.challengeIsSolved(req.challenge._id)) {
            fs.readdir(`database/${req.user._id}/challenges/solved/${req.challenge._id}/`, (err, files) => {
                if (!err && files.length) {
                    fs.readFile(`database/${req.user._id}/challenges/solved/${req.challenge._id}/${files[0]}`, (err, data) => {
                        if (!err) {
                            res.render('challenge', { title: `${req._user.username}/${req.challenge.title} · AQUA`, challenge: req.challenge, user: req._user, currentUser: req.user, solvedCode: data });
                        }
                    });
                }
            });
        } else res.render('challenge', { title: `${req._user.username}/${req.challenge.title} · AQUA`, challenge: req.challenge, user: req._user, currentUser: req.user });
    } catch (err) {
        next(err);
    }
});

// route middleware to ensure user is logged in
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();

    res.redirect('/login?redirect=' + req.path.substring(1));
}

module.exports = router;