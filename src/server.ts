// dependencies
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import session from 'express-session';
import passport from 'passport';
import config from 'config';
import dbConnect from './utils/connect';
import logger from './utils/logger';
import morgan from 'morgan';

import userRouter, { isLoggedIn } from './controllers/user.controller';
import UserModel, { UserType } from './models/user.model';

// initialize app
const PORT = config.get<number>('PORT');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const SECRET = config.get<string>('SECRET');

// mount middlware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(express.static('src/public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan('dev'));
app.use(session({
    secret: SECRET,
    resave: false,
    saveUninitialized: true
}))
// initialize passport.js
app.use(passport.initialize());
app.use(passport.session());


// routes
app.use('/', userRouter);

app.get('/channels/:username', isLoggedIn, (req: Request, res: Response) => {
    // res.render('channels/index.ejs');
    UserModel.findById(req.params.username, (err: any, user: UserType) => {
        res.render('channels/index.ejs', { user });
    })
})


// socket listener
type ChatMessage = {
    message: string
}

io.engine.on('connection_error', (err: any) => {
    logger.error(err.req);
    logger.error(err.code);
    logger.error(err.message);
    logger.error(err.context);
})

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
