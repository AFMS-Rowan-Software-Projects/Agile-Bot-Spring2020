//body of our firebase function "webhookTest"

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase = require("firebase");

// serviceAccount is our firebase SDK admin token
const serviceAccount = require("./agilebotrp-firebase-adminsdk-gs4o8-1b430da2e7.json");

const config = {
    apiKey: "AIzaSyDiiVlK9NrAypYRD7YWvzVd4vpRDUEbZQU",
    authDomain: "agilebotrp.firebaseapp.com",
    databaseURL: "https://agilebotrp.firebaseio.com",
    projectId: "agilebotrp",
    storageBucket: "agilebotrp.appspot.com",
    messagingSenderId: "153766581343",
    appId: "1:153766581343:web:202d2b794e6d8ad2c8b7ea",
    measurementId: "G-MDH3QBK01F"
}

//authenticating our admin key and logging us into the firestore database
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://agilebotrp.firebaseio.com"
});

firebase.initializeApp(config);

const db = admin.firestore();
const auth = firebase.auth();
const fs = require('fs');

exports.webhookTest = functions.https.onRequest((request, response) => {

    //log any request body in the function logs
    console.log(request.body);

    //takes only post requests and pushes the body into the firestore database
    if(request.method === "POST") {
      if(request.body) {
        db.collection('trelloUpdateTest').add(request.body);
      }
    }
    

    //return the appropriate 200 status code for the webhook and a message
    return response.status(200).send("if there is a god, help me now");

});

exports.addUpdates = functions.https.onRequest((request, response) => {

      //log any request body in the function logs
      console.log(request.body);

      //takes only post requests and pushes the body into the firestore database
      if(request.method === "POST") {
        if(request.body) {
          db.collection('trelloUpdateTest').add(request.body);
        }
      }
      
      //return the appropriate 200 status code for the webhook and a message
      return response.status(200).send("These are not the webhooks you're looking");
})
