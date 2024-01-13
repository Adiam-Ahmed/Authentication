require("dotenv").config()
const express = require("express");//importing the express module, which is a web application framework for Node.js. 
const bodyParser = require("body-parser");//body-parser module parse incoming request in a middleware before your handlers.
const ejs = require("ejs");// ejs is a templating engine that allows you to embed JavaScript code directly within your HTML files
const mongoose= require("mongoose");//mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js
const session = require('express-session');// middleware to handle user sessions in an Express application.
const PORT = process.env.PORT || 3000;
const passport = require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


////initializes an instance of the Express application.it configure routes, set up middleware, and define web server behaviour.
const app = express();
// Add express.json() middleware to parse JSON requests
app.use(express.json());
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

// Express Session Middleware
app.use(session({
    // A secret string used to sign the session ID cookie for security.
    secret: "Our little secret.",
    // If set to false, the session data won't be saved on every request.
    resave: false,
    // If set to false, a session will not be stored for uninitialized (new but not modified) sessions.
    saveUninitialized: false
}));

app.use(passport.initialize()); // Passport Initialization Middleware
app.use(passport.session()); // Passport Session Middleware


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/userDB');


// Set up a new userSchema Database which will be Js object with two field 
//I have updated it from plain JavaScript object to mongoose.Schema as its a class and this way we can defining more complex and structured schemas.
const userSchema= new mongoose.Schema({
    email: String,
    password:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);//use to hash and salt our passwords and to save
userSchema.plugin(findOrCreate);

// Set up a new user module 
const User = new mongoose.model("User",userSchema)

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());


// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// Serialize the user to store in the session
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home")
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/register",function(req,res){
    res.render("register")
  });


// // Route for handling GET requests to "/secrets"
// app.get("/secrets", function(req, res) {
//     // Check if the user is authenticated using Passport's isAuthenticated method
//     if (req.isAuthenticated()) {
//         // If authenticated, render the "secrets" view
//         res.render("secrets");
//     } else {
//         // If not authenticated, redirect the user to the "/login" route
//         res.redirect("/login");
//     }
// });

// Route for handling GET requests to "/secrets"
app.get("/secrets", async function(req, res) {
    try {
        // Find users where the "Secret" field is not null
        const foundUsers = await User.find({"secret": {$ne: null}});
        console.log("Found Users with Secrets:", foundUsers);
        // Render the "secrets" view and pass the found users to the template
        res.render("secrets", { usersWithSecrets: foundUsers });
    } catch (err) {
        // If there's an error during the database query, log the error
        console.log(err);
        // Handle the error, you might want to send an error response or redirect to an error page
        res.status(500).send("Internal Server Error");
    }
});

app.get("/submit",function(req,res){
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    } 
})

app.post("/submit", async function (req, res) {
    try {
        const submittedSecret = req.body.secret; // Get the submitted secret from the request body
        const foundUser = await User.findById(req.user.id);  // Attempt to find the user by ID using await
        console.log(req.user.id)
        console.log(req.user.secret)
        // If the user is found, update the secret and save it
        if (foundUser) {
            foundUser.secret = submittedSecret;
            await foundUser.save();// Save the updated user information using await
            res.redirect("/secrets"); // Redirect to the "/secrets" route after successful update
        }
    } catch (err) {
        // If any error occurs during the try block, catch it here
        console.log(err);
    }
});



app.get("/login",function(req,res){
    res.render("login")
});

// Route for handling user logout n deauthinicate
app.get("/logout", function(req, res) {
    // Use req.logout() with a callback function
    req.logout(function(err) {
        if (err) {
            // Handle error, if any
            console.error(err);
            res.redirect("/");
        } else {
            // Redirect the user to the home page after successful logout
            res.redirect("/");
        }
    });
});


// Route for handling POST requests to "/register"
app.post("/register", async (req, res) => {
    // Use the User model's register method to create a new user with provided username and password
    User.register({ username: req.body.username }, req.body.password, function(err, user) {
        if (err) {
            // If there's an error during user registration, log the error and redirect to "/register"
            console.log(err);
            res.redirect("/register");
        } else {
            // If registration is successful, authenticate the user using Passport's local strategy
            passport.authenticate("local")(req, res, function() {
                // Redirect the user to the "/secrets" route after successful authentication
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", async (req, res) => {
    const user = new User({
        username: req.body.username,
        password:req.body.password
    })
    req.login(user, function(err){
        if (err) {
            // If there's an error during user registration, log the error and redirect to "/register"
            console.log(err);
            res.redirect("/register");
        } else{
            passport.authenticate("local")(req, res, function() {
                // Redirect the user to the "/secrets" route after successful authentication
                res.redirect("/secrets");
            });
        }
    })
});


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});


//adding cookies using passport ,  npm i passport passport-local passport-local-mongoose express-session