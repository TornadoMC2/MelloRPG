import { Schema, model } from 'mongoose';

const userInfoSchema = new Schema({
    uid: {type: String},
    balance: {type: Number, default: 500},
    lastDaily: {type: Date, default: new Date(Date.now())},
    description: {type: String, default: "No description set. use /description to set one."},
    items: {type: [String], default: []},
    rep: {type: Number, default: 0},
});

export default model('UserInfo', userInfoSchema);