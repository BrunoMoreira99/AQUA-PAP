global.Promise = require('bluebird');

const express  = require('express');
const passport = require('passport');
const flash    = require('connect-flash');

const logger       = require('morgan');
const path         = require('path');
const favicon      = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser   = require('body-parser');
const session      = require('express-session');

const routes = require('./routes/index');
const API    = require('./routes/API');

const app  = express();

// Configure database
require('./config/database')();

// Pass passport for configuration
require('./config/passport.js')(passport);

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
//app.set('view cache', true);

// Set favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logger('dev'));
// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express Session
app.use(session({ secret: 'super-secret desu-nyan', resave: true, saveUninitialized: false }));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    req.app.locals.isMobile = false;
    if (/mobile/i.test(req.headers['user-agent'])) req.app.locals.isMobile = true;
    next();
});

app.use('/', routes);
app.use('/api', API);

// Error Handler
app.use((err, req, res, next) => {
    if (err.status !== 404) console.error(err.stack);
    res.status(err.status || 500);
    res.render('error', { status: err.status || 500, message: err.message.toUpperCase() });
});

// Launch
app.listen(80, "0.0.0.0", () => {
    console.log('The magic happens on port 80');
});
