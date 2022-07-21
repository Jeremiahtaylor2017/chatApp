import mongoose from 'mongoose';
import config from 'config';
import logger from './logger';

async function connect() {
    const MONGO_URI = config.get<string>('MONGO_URI')

    try {
        await mongoose.connect(MONGO_URI);
        logger.info('Connected to DB');
    } catch {
        logger.error('Could not connect to db');
        process.exit(1);
    }
}

export default connect;