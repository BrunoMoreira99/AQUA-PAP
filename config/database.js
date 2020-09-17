const mongoose = require('mongoose');

const config = {
    "url": "mongodb://127.0.0.1:27017/aqua",
    "options": {
        "useMongoClient": true
    }
}

module.exports = function () {
    mongoose.Promise = global.Promise;
    mongoose.connect(config.url, config.options);

    var conn = mongoose.connection;

    conn.once('open', () => {
        console.log('Connected to MongoDB Database.');
    });

    conn.on('disconnected', () => {
        console.log('MongoDB disconnected, reconnecting...');
        mongoose.connect(config.url, config.options).catch(e => {
            console.log(e);
        });
        conn = mongoose.connection;
    });

    conn.on('error', (e) => {
        console.error(e);
    });
}