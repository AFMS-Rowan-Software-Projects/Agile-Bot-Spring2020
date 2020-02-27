//body of our firebase function "webhookTest"

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase = require("firebase");

// serviceAccount is our firebase SDK admin token
const serviceAccount = require("./trello-webhhok-firebase-adminsdk-j1z1c-c2b447b35b.json");

const config = {
    apiKey: "AIzaSyDg2byr8D7-EGHbG7_xZ9YkYPWOgDp0PhA",
    authDomain: "trello-webhhok.firebaseapp.com",
    databaseURL: "https://trello-webhhok.firebaseio.com",
    projectId: "trello-webhhok",
}

//authenticating our admin key and logging us into the firestore database
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trello-webhhok.firebaseio.com"
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
    

    //return the appropriate 200 statuse code for the webhook and a message
    return response.status(200).send("if there is a god, help me now");

});
