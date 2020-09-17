const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');
const jsSHA = require('jssha');
const identicon = require('identicon.js');
const gravatar = require('gravatar');
const request = require('request');

const Challenge = require('./challenge');

const submissionObject = {
    languages: {
        CPP   : { type: Number, default: 0 },
        C     : { type: Number, default: 0 },
        JAVA  : { type: Number, default: 0 }
    },
    results: {
        ACCEPTED          : { type: Number, default: 0 },
        PRESENTATION_ERROR: { type: Number, default: 0 },
        WRONG_ANSWER      : { type: Number, default: 0 },
        RUNTIME_ERROR     : { type: Number, default: 0 },
        COMPILE_ERROR     : { type: Number, default: 0 },
        TIMEOUT           : { type: Number, default: 0 }
    }
};

const userSchema = mongoose.Schema({
    username   : { type: String, index: true },
    email      : String,
    password   : String,
    name       : String,
    biography  : String,
    occupation : String,
    company    : String,
    url        : String,
    location   : String,
    avatar     : { data: Buffer, contentType: String, gravatarURL: String },
    useGravatar: { type: Boolean, default: false },
    facebook: {
        id   : String,
        token: String,
        email: String,
        name : String
    },
    twitter: {
        id         : String,
        token      : String,
        displayName: String,
        username   : String
    },
    google: {
        id   : String,
        token: String,
        email: String,
        name : String
    },
    stats: {
        level  : { type: Number, default: 0 },
        levelXP: { type: Number, default: 0 },
        challenges: {
            created: { type: Number, default: 0 },
            solved : { type: Number, default: 0 },
        },
        submissions: {
            starter     : submissionObject,
            easy        : submissionObject,
            intermediate: submissionObject,
            hard        : submissionObject,
            impossible  : submissionObject
        }
    },
    privacy: {
        email     : { type: Boolean, default: true },
        occupation: { type: Boolean, default: true },
        company   : { type: Boolean, default: true },
        url       : { type: Boolean, default: true },
        location  : { type: Boolean, default: true }
    }
}, { timestamps: true });

userSchema.methods.generateHash = function (password) {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(8).then(salt => {
            bcrypt.hash(password, salt).then(resolve).catch(reject);
        }).catch(reject);
    });
};

userSchema.methods.validatePassword = function (password) {
    return new Promise((resolve) => {
        bcrypt.compare(password, this.password).then(res => {
            res ? resolve(true) : resolve(false);
        });
    });
};

userSchema.methods.getGravatarInfo = function () {
    return new Promise((resolve, reject) => {
        request({ url: gravatar.profile_url(this.email, { protocol: 'https' }), json: true, headers: { 'user-agent': 'node.js' } }, (err, response, result) => {
            if (!err && response.statusCode === 200 && result !== "User not found") {
                resolve(result.entry[0]);
            } else reject(err || result || response.statusCode);
        });
    });
};

userSchema.methods.generateIdenticon = function () {
    var data = new jsSHA("SHA-512", "TEXT");
    data.update(this.username);
    return new identicon(data.getHash("HEX"), 256).toString();
};

userSchema.methods.getRequiredXP = function () {
    return (this.stats.level < 20 ? 10000 : 20000);
}

userSchema.methods.addExperience = function (xp) {
    xp += this.stats.levelXP;

    const requiredXP = this.getRequiredXP();
    let levelUP = false;

    if (xp > requiredXP) {
        this.stats.level++;
        this.stats.levelXP = xp - requiredXP;
        levelUP = true;
    } else this.stats.levelXP = xp;

    return { level: this.stats.level, levelXP: this.stats.levelXP, requiredXP: requiredXP, levelUP: levelUP };
};

userSchema.methods.getCreatedChallenges = function () {
    return Challenge.find({ author: this._id });
}

userSchema.methods.getSolvedChallenges = function () {
    return Challenge.find({ solvedBy: this._id });
}

userSchema.methods.challengeIsSolved = async function (challengeID) {
    return Boolean(await Challenge.count({ _id: challengeID, solvedBy: this._id }));
}

userSchema.methods.getTotalLanguage = function (language) {
    const keys = ['starter', 'easy', 'intermediate', 'hard', 'impossible'];
    let total = 0;
    for (let key of keys) {
        total += this.stats.submissions[key].languages[language];
    }
    return total;
}

userSchema.methods.getTotalResult = function (result) {
    const keys = ['starter', 'easy', 'intermediate', 'hard', 'impossible'];
    let total = 0;
    for (let key of keys) {
        total += this.stats.submissions[key].results[result];
    }
    return total;
}

userSchema.methods.getFavoriteLanguage = function () {
    const keys = ['C', 'CPP', 'JAVA', 'PASCAL'];
    let favorite = "Nenhuma";
    let max = 0;
    for (let key of keys) {
        const x = this.getTotalLanguage(key);
        if (x > max) {
            max = x;
            favorite = key;
        }
    }
    return favorite;
}

userSchema.methods.getFavoriteDifficulty = function () {
    const keys = ['starter', 'easy', 'intermediate', 'hard', 'impossible'];
    let favorite = "Nenhuma";
    let max = 0;
    for (let key of keys) {
        const x = this.stats.submissions[key].results['ACCEPTED'];
        if (x > max) {
            max = x;
            favorite = key;
        }
    }
    return favorite;
}

userSchema.methods.getTotalSubmissions = function () {
    const keys = ['ACCEPTED', 'WRONG_ANSWER', 'PRESENTATION_ERROR', 'RUNTIME_ERROR', 'COMPILE_ERROR', 'TIMEOUT'];
    let total = 0;
    for (let key of keys) {
        total += this.getTotalResult(key);
    }
    return total;
}

module.exports = mongoose.model('User', userSchema);