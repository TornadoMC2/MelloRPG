import { Schema, model } from 'mongoose';

const userInfoSchema = new Schema({
    uid: {type: String},
    balance: {type: Number, default: 500},
    lastDaily: {type: Date, default: new Date(Date.now())},
});

export default model('UserInfo', userInfoSchema);