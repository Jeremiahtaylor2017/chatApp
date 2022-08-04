import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import logger from './logger';

async function connect() {
    const MONGO_URI = process.env.MONGO_URI;

    try {
        //@ts-ignore
        await mongoose.connect(MONGO_URI);
        logger.info('Connected to DB');
    } catch {
        logger.error('Could not connect to db');
        process.exit(1);
    }
}

export default connect;