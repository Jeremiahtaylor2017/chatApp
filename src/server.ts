// dependencies
import express, { Request, Response } from 'express';
import http from 'http';
import config from 'config';
import dbConnect from './utils/connect';
import logger from './utils/logger';
import morgan from 'morgan';

// initialize app
const app = express();
const server = http.createServer(app);
const PORT = config.get<number>('PORT');

// mount middlware
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// routes
app.get('/healthcheck', (req: Request, res: Response) => {
    res.sendStatus(200);
})

// listener
server.listen(PORT, async () => {
    logger.info(`Server listening at http://localhost:${PORT}`);

    await dbConnect();
})