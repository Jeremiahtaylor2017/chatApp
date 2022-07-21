// dependencies
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import config from 'config';
import dbConnect from './utils/connect';
import logger from './utils/logger';
import morgan from 'morgan';

// initialize app
const PORT = config.get<number>('PORT');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

// socket listener
type ChatMessage = {
    message: string
}

io.on('connection', socket => {
    logger.info('A user connected');

    socket.on('chat message', (msg: ChatMessage) => {
        logger.info(`Message: ${msg}`);
        io.emit('chat message', msg);
    })

    socket.on('disconnect', () => {
        logger.info('User disconnected');
    })
})

// listener
server.listen(PORT, async () => {
    logger.info(`Server listening at http://localhost:${PORT}`);

    await dbConnect();
})