// dependencies
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import methodOverride from 'method-override';
import session from 'express-session';
import passport from 'passport';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import dbConnect from './utils/connect';
import logger from './utils/logger';
import formatMessage from './utils/format.message';
import { userJoin, getCurrentUser, userLeave, getRoomUsers } from './utils/users'

import userRouter, { isLoggedIn } from './controllers/user.controller';
import User, { UserType } from './models/user.model';
import Room, { RoomType } from './models/room.model';

// initialize app
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const SECRET = process.env.SECRET;
const sessionMiddleware = session({
    //@ts-ignore
    secret: SECRET,
    resave: false,
    saveUninitialized: false
})

// mount middlware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(express.static('src/public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.json());
app.use(morgan('dev'));
app.use(sessionMiddleware);
// initialize passport.js
app.use(passport.initialize());
app.use(passport.session());


// routes
app.use('/', userRouter);

app.get('/channels/:username/:room', isLoggedIn, (req: Request, res: Response) => {
    User.findOne({ username: req.params.username }, (err: any, user: UserType) => {
        Room.find({}, (err: any, rooms: RoomType) => {
            res.render('channels/index.ejs', { username: user.username, rooms });
        })
    })
})

app.get('/channels', isLoggedIn, (req: Request, res: Response) => {
    Room.find({}, (err: any, rooms: RoomType) => {
        //@ts-ignore
        User.findOne({ username: req.user.username }, (err: any, user: UserType) => {
            res.render('channels/rooms.ejs', { rooms, user });
        })
    })
}) 

const botName: string = 'chatApp Bot';

// socket logic
const wrap = (middleware: any) => (socket: any, next: any) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));
io.use((socket: any, next: any) => {
    if (socket.request.user) {
        next();
    } else {
        next( new Error('unauthorized'));
    }
})

// socket debuggers
io.engine.on('connection_error', (err: any) => {
    logger.error(err.req);
    logger.error(err.code);
    logger.error(err.message);
    logger.error(err.context);
})

// run when client connects
io.on('connection', socket => {
    //@ts-ignore
    logger.info(`New connection from id: ${socket.id} | user: ${socket.request.user.username}`);
    socket.on('whoami', cb => {
        //@ts-ignore
        cb(socket.request.user ? socket.request.user.username : '');
    })

    //@ts-ignore
    const session = socket.request.session;
    logger.info(`Saving sid ${socket.id} in session ${session.id}`);
    session.socketId = socket.id;
    session.save();

    // join room logic
    socket.on('joinRoom', async ({ username, room }) => {
        try {
            let result = await Room.findOne({ name: room });
            if (!result) {
                //@ts-ignore
                await Room.create({ name: room }, (err: any, name) => {});
            }

            const user = userJoin(socket.id, username, room);

            socket.join(user.room);
            console.log(typeof(room), room);
            socket.emit('joined', room);

            socket.emit('message', formatMessage(botName, 'Welcome to chatApp!'));

            // broadcasts when a user connects
            socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat`));

            // send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        } catch (err: any) {
            throw err;
        }
    })

    // listen for chat messages
    socket.on('chatMessage', (msg: string) => {
        logger.info(`message: ${msg}`);
        const user = getCurrentUser(socket.id);
        //@ts-ignore
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    })

    // runs when client disconnects
    socket.on('disconnect', () => {
        logger.info('User disconnected');
        const user = userLeave(socket.id);

        if (user) {
            //@ts-ignore
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat.`));

            // send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        }
    })
})


// listener
server.listen(PORT, async () => {
    logger.info(`Server listening at http://localhost:${PORT}`);

    await dbConnect();
})
