require("dotenv").config()
const express = require("express");//importing the express module, which is a web application framework for Node.js. 
const bodyParser = require("body-parser");//body-parser module parse incoming request in a middleware before your handlers.
const ejs = require("ejs");// ejs is a templating engine that allows you to embed JavaScript code directly within your HTML files
const mongoose= require("mongoose");//mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js
const session = require('express-session');// middleware to handle user sessions in an Express application.
const PORT = process.env.PORT || 3000;
const passport = require("passport");
const passportLocalMongoose= require("passport-local-mongoose");


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
    password:String
});

userSchema.plugin(passportLocalMongoose);//use to hash and salt our passwords and to save

// Set up a new user module 
const User = new mongoose.model("User",userSchema)

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());


// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/",function(req,res){
  res.render("home")
});

app.get("/register",function(req,res){
    res.render("register")
  });

// Route for handling GET requests to "/secrets"
app.get("/secrets", function(req, res) {
    // Check if the user is authenticated using Passport's isAuthenticated method
    if (req.isAuthenticated()) {
        // If authenticated, render the "secrets" view
        res.render("secrets");
    } else {
        // If not authenticated, redirect the user to the "/login" route
        res.redirect("/login");
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