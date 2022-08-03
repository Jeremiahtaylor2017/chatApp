import dotenv from 'dotenv';
dotenv.config();

export default {
    PORT: 3000,
    MONGO_URI: process.env.MONGO_URI,
    SECRET: process.env.SECRET,
    SALT: 10
}