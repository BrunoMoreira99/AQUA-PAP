// load all the things we need
const LocalStrategy    = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy  = require('passport-twitter').Strategy;
const GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;

// load up the user model
const User = require('../models/user');

// load the auth variables
const configAuth = require('./auth.json');

module.exports = function (passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser((id, done) => {
        User.findById(id).then(user => {
            done(null, user);
        }).catch(err => { done(err) });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    }, (req, email, password, done) => {
        // asynchronous
        process.nextTick(() => {
            User.findOne({ $or:[{'email':  email.toLowerCase()}, {'username': new RegExp('^' + email + '$','i')}] }).then(async (user) => {
                if (user) {
                    if (await user.validatePassword(password)) done(null, user)
                    else done(null, false, req.flash('loginMessage', 'Nome de utilizador ou palavra-passe incorretos.'));
                } else {
                    return done(null, false, req.flash('loginMessage', 'Nome de utilizador ou palavra-passe incorretos.'));
                }
            }).catch(done);
        });
    }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    }, (req, email, password, done) => {
        if (email) email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(() => {
            // if the user is not already logged in:
            if (!req.user) {
                User.findOne({ $or:[{'email':  email}, {'username': req.body.username}] }).then(user => {
                    if (user) {
                        if (user.email == email && user.username != req.body.username) return done(null, false, req.flash('signupMessage', ['','Este e-mail já se encontra registado.']));
                        else if (user.username == req.body.username && user.email != email) return done(null, false, req.flash('signupMessage', ['Este nome de utilizador está indisponível.','']));
                        else return done(null, false, req.flash('signupMessage', ['Este nome de utilizador está indisponível.','Este e-mail já se encontra registado.']));
                    } else {
                        // create the user
                        const newUser = new User();

                        newUser.username = req.body.username;
                        newUser.email    = email;
                        newUser.generateHash(password).then(hash => {
                            newUser.password = hash;

                            newUser.getGravatarInfo().then(data => {
                                if (data.displayName) newUser.name = data.displayName;
                                newUser.avatar.gravatarURL = data.thumbnailUrl;
                                newUser.useGravatar = true;
                            }).catch(() => {
                                newUser.avatar.contentType = 'image/png';
                                newUser.avatar.data = newUser.generateIdenticon();
                            }).finally(() => {
                                newUser.save().then(() => done(null, newUser)).catch(done);
                            });
                        });
                    }
                }).catch(done);
            // if the user is logged in but has no local account...
            } else if (!req.user.email) {
                // ...presumably they're trying to connect a local account
                // BUT let's check if the email used to connect a local account is being used by another user
                User.findOne({ 'email' :  email }, (err, user) => {
                    if (err) return done(err);

                    if (user) {
                        return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                        // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                    } else {
                        const user = req.user;

                        user.email = email;
                        user.generateHash(password).then(hash => {
                            user.password = hash;
                            user.save().then(() => done(null, user)).catch(done);
                        });
                    }
                });
            } else {
                // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                return done(null, req.user);
            }
        });
    }));

    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    var fbStrategy = configAuth.facebookAuth;
    fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    passport.use(new FacebookStrategy(fbStrategy,
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(() => {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'facebook.id' : profile.id }, (err, user) => {
                    if (err)
                        return done(err);

                    if (user) {

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.facebook.token) {
                            user.facebook.token = token;
                            user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                            user.facebook.email = (profile.emails[0].value || '').toLowerCase();

                            user.save((err) => {
                                if (err)
                                    return done(err);

                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser            = new User();

                        newUser.facebook.id    = profile.id;
                        newUser.facebook.token = token;
                        newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                        newUser.facebook.email = (profile.emails[0].value || '').toLowerCase();

                        newUser.save((err) => {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user            = req.user; // pull the user out of the session

                user.facebook.id    = profile.id;
                user.facebook.token = token;
                user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                user.facebook.email = (profile.emails[0].value || '').toLowerCase();

                user.save((err) => {
                    if (err)
                        return done(err);

                    return done(null, user);
                });

            }
        });

    }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

        consumerKey     : configAuth.twitterAuth.consumerKey,
        consumerSecret  : configAuth.twitterAuth.consumerSecret,
        callbackURL     : configAuth.twitterAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, tokenSecret, profile, done) {

        // asynchronous
        process.nextTick(() => {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'twitter.id' : profile.id }, (err, user) => {
                    if (err)
                        return done(err);

                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.twitter.token) {
                            user.twitter.token       = token;
                            user.twitter.username    = profile.username;
                            user.twitter.displayName = profile.displayName;

                            user.save((err) => {
                                if (err)
                                    return done(err);

                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser                 = new User();

                        newUser.twitter.id          = profile.id;
                        newUser.twitter.token       = token;
                        newUser.twitter.username    = profile.username;
                        newUser.twitter.displayName = profile.displayName;

                        newUser.save((err) => {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user                 = req.user; // pull the user out of the session

                user.twitter.id          = profile.id;
                user.twitter.token       = token;
                user.twitter.username    = profile.username;
                user.twitter.displayName = profile.displayName;

                user.save((err) => {
                    if (err)
                        return done(err);

                    return done(null, user);
                });
            }

        });

    }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({

        clientID        : configAuth.googleAuth.clientID,
        clientSecret    : configAuth.googleAuth.clientSecret,
        callbackURL     : configAuth.googleAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(() => {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'google.id' : profile.id }, (err, user) => {
                    if (err)
                        return done(err);

                    if (user) {

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.google.token) {
                            user.google.token = token;
                            user.google.name  = profile.displayName;
                            user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                            user.save((err) => {
                                if (err)
                                    return done(err);

                                return done(null, user);
                            });
                        }

                        return done(null, user);
                    } else {
                        var newUser          = new User();

                        newUser.google.id    = profile.id;
                        newUser.google.token = token;
                        newUser.google.name  = profile.displayName;
                        newUser.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                        newUser.save((err) => {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user               = req.user; // pull the user out of the session

                user.google.id    = profile.id;
                user.google.token = token;
                user.google.name  = profile.displayName;
                user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                user.save((err) => {
                    if (err)
                        return done(err);

                    return done(null, user);
                });

            }

        });

    }));

};