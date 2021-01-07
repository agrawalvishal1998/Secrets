//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5'); used for hashing.We are using bcrypt intead of md5 to make our password safer.
const bcrypt = require('bcrypt');
const saltRounds = 10;


const app = express();

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true,useUnifiedTopology: true});
// Defining a schema using mongoose,it is no more a normal object.This needs to be done to use mongoose-encryption.
const userSchema=new mongoose.Schema({
  email:String,
  password:String
});

// SECRET is the encryption key

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] }); encryptedFields is used to tell that we only want to encrypt password.
const User=new mongoose.model("User",userSchema);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//TODO
app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/register",function(req,res){

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

    const newUser=new User({
      email:req.body.username,
      password:hash
    });

    newUser.save(function(err){
      if(err)
      console.log(err);
      else
      res.render("secrets");
    })

   });


});

app.post("/login",function(req,res){
  const username=req.body.username;
  const password=req.body.password;

  User.findOne({email:username},function(err,foundUser){
    if(err)
    console.log(err)
    else
    {
      if(foundUser)
      {
        bcrypt.compare(password,foundUser.password, function(err, result) {
          if(result===true)
          {
            res.render("secrets");
          }
      });

      }

    }
  });
});


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
