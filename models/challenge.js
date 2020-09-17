"use strict";

const mongoose = require('mongoose');

const challengeSchema = mongoose.Schema({
    title      : { type: String, index: true },
    description: String,
    wording    : Object,
    difficulty: {
        type: String,
        enum: ['Starter', 'Easy', 'Intermediate', 'Hard', 'Impossible']
    },
    examples: [{
        input : String,
        output: String
    }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    solvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Challenge', challengeSchema);