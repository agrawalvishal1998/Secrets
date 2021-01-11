//jshint esversion:6
require('dotenv').config()  //always insert it at the top of the documentation.used to encorpate env file.
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5'); used for hashing.We are using bcrypt intead of md5 to make our password safer.
// const bcrypt = require('bcrypt');
// const saltRounds = 10;      replacing this bcrypt method with the passport method.
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;  //This is used to tell that we are using google strategy for authentication.
const findOrCreate = require('mongoose-findorcreate');  //our default findOrCreate do not works,so we install this package.
const app = express();

app.set('view engine', 'ejs');

//To use bodyparser,that helps us to retrieve the input given by the user.
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

//creates session
app.use(session({
  secret: 'This is my secret',
  resave: false,
  saveUninitialized: false,
}))

//initializing passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);
// Defining a schema using mongoose,it is no more a normal object.This needs to be done to use mongoose-encryption.
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String, //stores the id given by google after the user succesfully registers using gmail.
  secret: String  //stores the secret of a user.
 });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);  //need to insert findOrCreate as plugin to our schema in order to use it.

// SECRET is the encryption key

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] }); encryptedFields is used to tell that we only want to encrypt password.
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

//serializer basically stores all the information in a container.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
//deserialize breaks the container and gives back the information.
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Earlier we were using a local strategy created by us ,but in this case we are using google's strategy.
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, //got thei after creating the project with google developer.
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",  //google returns the data on this url.
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));
//TODO
app.get("/", function(req, res) {
  res.render("home");
});


app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
    });

    app.get("/login", function(req, res) {
      res.render("login");
    });

    app.get("/register", function(req, res) {
      res.render("register");
    });

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});



app.get("/secrets", function(req, res) {
  User.find({"secret":{$ne:null}},function(err,foundUsers){ //find all the users whoose secrets are not null.
    if(err)
    {
      console.log(err);
    }
    else
    {
      if(foundUsers)
      {
        res.render("secrets",{userWithSecrets: foundUsers});  //send all the secrets to the secrets page.
      }
    }
  });
});

app.get("/submit",function(req,res){
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;

  User.findById(req.user.id,function(err,foundUser){ //finding the user who just submitted a new secret.
    if(err){
      console.log(err);
    }
    else
    {
      if(foundUser)
      {
        foundUser.secret=submittedSecret;  //assigning the secret to the field.
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});



app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {

    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }

  });

});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);

    } else {
      passport.authenticate("local")(req, res, function() {  //using the local passport method to authenticate the user.
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});



// app.post("/register",function(req,res){
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//
//     const newUser=new User({
//       email:req.body.username,
//       password:hash
//     });
//
//     newUser.save(function(err){
//       if(err)
//       console.log(err);
//       else
//       res.render("secrets");
//     })
//
//    });
//
//
// });
//
// app.post("/login",function(req,res){
//   const username=req.body.username;
//   const password=req.body.password;
//
//   User.findOne({email:username},function(err,foundUser){
//     if(err)
//     console.log(err)
//     else
//     {
//       if(foundUser)
//       {
//         bcrypt.compare(password,foundUser.password, function(err, result) {
//           if(result===true)
//           {
//             res.render("secrets");
//           }
//       });
//
//       }
//
//     }
//   });
// });
