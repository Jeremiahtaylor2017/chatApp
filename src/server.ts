// dependencies
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import session from 'express-session';
import passport from 'passport';
import { Strategy as localStrategy } from 'passport-local'
import bcrypt from 'bcrypt';
import config from 'config';
import dbConnect from './utils/connect';
import logger from './utils/logger';
import morgan from 'morgan';

import User, { UserType } from './models/user.model';
import { NextFunction } from 'connect';

// initialize app
const PORT = config.get<number>('PORT');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const SECRET = config.get<string>('SECRET');
const SALT = config.get<number>("SALT")

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
// authentication using passport.js
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user: any, done) {    // should user be set to any???
    done(null, user.id);
}) 

passport.deserializeUser(function(id, done) {
    User.findById(id, function (err: any, user: UserType) {
        done(err, user);
    })
})

passport.use(new localStrategy(function(username, password, done) {
    User.findOne({ username: username}, function (err: any, user: UserType) {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username or password.' });

        bcrypt.compare(password, user.password, function (err: any, result: boolean) {
            if (err) return done(err);
            if (result === false) return done(null, false, { message: 'Incorrect username or password.' });

            return done(null, user);
        })
    })
}))

const isLoggedIn = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

const isLoggedOut = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return next();
    res.redirect('/');
}

// setup admin user
app.get('/setup', async (req: Request, res: Response, next: NextFunction) => {
    const exists = await User.exists({ username: "admin" });
    if (exists) {
        res.redirect('/login');
        return;
    }

    bcrypt.genSalt(SALT, function (err, salt) {
        if (err) return next(err);
        bcrypt.hash("password", salt, function(err, hash) {
            if (err) return next(err);

            const newAdmin = new User<UserType>({
                username: "admin",
                password: hash
            })

            newAdmin.save();

            res.redirect('/login');
        })
    })
})

// routes
app.get('/', isLoggedIn, (req: Request, res: Response) => {
    res.render('messages/index.ejs');
})

app.get('/login', isLoggedOut, (req: Request, res: Response) => {
    const response = {
        title: "login",
        error: req.query.error
    }

    res.render('users/login.ejs', { response });
})

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login?error=true'
}))

app.get('/logout', (req: Request, res: Response, next: NextFunction) => {
    req.logout(function(err){
        if (err) return next(err);
        res.redirect('/');
    });
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
