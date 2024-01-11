require("dotenv").config()
const express = require("express");//importing the express module, which is a web application framework for Node.js. 
const bodyParser = require("body-parser");//body-parser module parse incoming request in a middleware before your handlers.
const ejs = require("ejs");// ejs is a templating engine that allows you to embed JavaScript code directly within your HTML files
const mongoose= require("mongoose")//mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js
const bcrypt = require('bcrypt');
const saltRounds = 10;
const PORT = process.env.PORT || 3000;
//var md5 = require('md5');/// is basically used to hash passwords to used , we do md5(....)

////initializes an instance of the Express application.it configure routes, set up middleware, and define web server behaviour.
const app = express();
// Add express.json() middleware to parse JSON requests
app.use(express.json());
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/userDB');


// Set up a new userSchema Database which will be Js object with two field 
//I have updated it from plain JavaScript object to mongoose.Schema as its a class and this way we can defining more complex and structured schemas.
const userSchema= new mongoose.Schema({
    email: String,
    password:String
});


// Set up a new user module 
const User = new mongoose.model("User",userSchema)

app.get("/",function(req,res){
  res.render("home")
});

app.get("/register",function(req,res){
    res.render("register")
  });

app.get("/login",function(req,res){
    res.render("login")
});

// we have a form that will target the register route,
// to catch it, we can add our post req  inside our callback 
app.post("/register", async (req, res) => {
    // Extract username and password from the request body
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        const newUser = new User({
            email: req.body.username,
            password: hashedPassword
        });

        await newUser.save();
        res.render("secrets");
    } catch (error) {
        res.redirect("/register");
    }
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
          // Attempt to find a user in the database from the user model based on the provided email
        const foundUser = await User.findOne({ email: username });

        if (foundUser) {
            const passwordMatch = await bcrypt.compare(password, foundUser.password);

            if (passwordMatch) {
                res.render("secrets");
            } else {
                res.send("Incorrect password");
            }
        } else {
            res.send("Email not found");
        }
    } catch (err) {
        res.send("Error");
    }
});


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
