// import dependencies
import express, { Request, Response, NextFunction } from "express";
import passport from 'passport';
import { Strategy as localStrategy } from 'passport-local'
import bcrypt from 'bcrypt';
import config from 'config';

import User, { UserType } from '../models/user.model';

// configuration
const userRouter = express.Router();
const SALT = config.get<number>("SALT")

// passport configuration
passport.serializeUser(function(user: any, done) {    
    done(null, user.id);
}) 

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err: any, user: UserType) {
        done(err, user);
    })
})

// passport local strategies
// login
passport.use('login', new localStrategy(function(username, password, done) {
    User.findOne({ username: username }, function (err: any, user: UserType) {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect username or password.' });

        bcrypt.compare(password, user.password, function (err: any, result: boolean) {
            if (err) return done(err);
            if (result === false) return done(null, false, { message: 'Incorrect username or password.' });

            return done(null, user);
        })
    })
}))

// register
passport.use('register', new localStrategy(function(username, password, done) {
    User.findOne({ username: username }, function (err: any, user: UserType) {
        if (err) return done(err);
        if (user) {
            return done(null, false, { message: 'Username already taken.' });
        } else {
            const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(SALT));
            
            let newUser = new User();
            
            newUser.username = username;
            newUser.password = hashedPassword;

            newUser.save(function(err) {
                if (err) throw err;
                return done(null, newUser);
            })
        }
    })
}))

// middleware
// checks if user is logged in
export const isLoggedIn = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// checks if user is logged out
const isLoggedOut = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return next();
    res.redirect('/channels');
}

// authentication routes
// login get route
userRouter.get('/login', isLoggedOut, (req: Request, res: Response) => {
    const response = {
        error: req.query.error
    }

    res.render('users/login.ejs', { response });
})

// login post route
userRouter.post('/login', passport.authenticate('login', {
    successRedirect: '/channels',
    failureRedirect: '/login?error=true'
}))

//logout get route
userRouter.get('/logout', (req: Request, res: Response, next: NextFunction) => {
    req.logout(function(err) {
        if (err) return next(err);
        res.redirect('/');
    });
})

// index get route
userRouter.get('/', isLoggedIn, (req: Request, res: Response) => {
    res.render('channels/index.ejs');
})

// new
userRouter.get('/register', isLoggedOut, (req: Request, res: Response) => {
    const response = {
        error: req.query.error
    }
    res.render('users/register.ejs', { response });
})

userRouter.post('/register', passport.authenticate('register', {
    successRedirect: '/login',
    failureRedirect: '/register?error=true'
}))

// delete
// update
// create
// edit
// show


// setup admin user route
userRouter.get('/setup', async (req: Request, res: Response, next: NextFunction) => {
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

export default userRouter;