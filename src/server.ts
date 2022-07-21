// dependencies
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import config from 'config';
import dbConnect from './utils/connect';
import logger from './utils/logger';
import morgan from 'morgan';

// initialize app
const app = express();
const server = http.createServer(app);
const PORT = config.get<number>('PORT');

// mount middlware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(express.static('src/public'));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// routes
app.get('/', (req: Request, res: Response) => {
    res.render('index.ejs');
})

// listener
server.listen(PORT, async () => {
    logger.info(`Server listening at http://localhost:${PORT}`);

    await dbConnect();
})