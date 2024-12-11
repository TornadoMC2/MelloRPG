import { Schema, model } from 'mongoose';

const userInfoSchema = new Schema({
    uid: {type: String},
    balance: {type: Number, default: 500}
});

export default model('UserInfo', userInfoSchema);