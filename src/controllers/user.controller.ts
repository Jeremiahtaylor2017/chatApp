// import dependencies
import express, { Request, Response, NextFunction } from "express";
import passport from 'passport';
import { Strategy as localStrategy } from 'passport-local'
import bcrypt from 'bcrypt';

import logger from '../utils/logger';

import User, { UserType } from '../models/user.model';

// configuration
const userRouter = express.Router();
const SALT = 10;

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
userRouter.post('/login', 
    passport.authenticate('login', { failureRedirect: '/login?error=true' }), 
    function (req: Request, res: Response) {
    // @ts-ignore
    // resolves error of username not being defined on req.user
    res.redirect('/channels');
})

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


// new user route
userRouter.get('/register', isLoggedOut, (req: Request, res: Response) => {
    const response = {
        error: req.query.error
    }
    res.render('users/register.ejs', { response });
})


// delete
userRouter.delete('/profile/:username', isLoggedIn, (req: Request, res: Response) => {
    User.findOneAndDelete({ username: req.params.username }, (err: any, user: UserType) => {
        res.redirect('/login');
    })
})

// update
userRouter.put('/profile/:username', isLoggedIn, async (req: Request, res: Response) => {
    const { newUsername, oldPassword, newPassword } = req.body;
    
    try {
        const user = await User.findOne({ username: req.params.username });
        const newUser = await User.findOne({ username: newUsername });
        // logger.info(user);
        if (newUser)  return res.redirect(`/profile/${req.params.username}/edit?error=true`);

        if (user) {
            const validPassword = await bcrypt.compare(oldPassword, user.password);

            if (!validPassword) return res.redirect(`/profile/${req.params.username}/edit?error=true`);
            
            const hashedPassword = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(SALT));

            if (newUsername) {
                user.username = newUsername;
            } else {
                user.username = user.username;
            }

            user.password = hashedPassword;

            await user.save();

            res.redirect(`/profile/${user.username}`);
        }
    } catch (err: any) {
        throw err;
    }
})

// create user route
userRouter.post('/register', 
    passport.authenticate('register', { failureRedirect: '/register?error=true', successRedirect: '/channels' }))

// edit
userRouter.get('/profile/:username/edit', (req: Request, res: Response) => {
    const response = {
        error: req.query.error
    }

    User.findOne({ username: req.params.username }, (err: any, user: UserType) => {
        res.render('users/edit.ejs', { user, response });
    })
})

// show
userRouter.get('/profile/:username', isLoggedIn, (req: Request, res: Response) => {
    User.findOne({ username: req.params.username }, (err: any, user: UserType) => {
        res.render('users/profile.ejs', { username: user.username });
    })
})

// user test route
userRouter.get('/whoami', isLoggedIn, (req: Request, res: Response) => {
    res.send(req.user);
})

// setup admin user route
userRouter.get('/setup', async (req: Request, res: Response, next: NextFunction) => {
    const exists = await User.exists({ username: "admin" });
    if (exists) {
        res.redirect('/login');
        return;
    }

    bcrypt.genSalt(SALT, function (err, salt) {
        if (err) return next(err);
        bcrypt.hash("admin", salt, function(err, hash) {
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