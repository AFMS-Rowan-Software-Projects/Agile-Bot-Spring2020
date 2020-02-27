const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase = require("firebase");
const serviceAccount = require("./trello-webhhok-firebase-adminsdk-j1z1c-c2b447b35b.json");

const config = {
    apiKey: "AIzaSyDg2byr8D7-EGHbG7_xZ9YkYPWOgDp0PhA",
    authDomain: "trello-webhhok.firebaseapp.com",
    databaseURL: "https://trello-webhhok.firebaseio.com",
    projectId: "trello-webhhok",
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trello-webhhok.firebaseio.com"
});

firebase.initializeApp(config);

const db = admin.firestore();
const auth = firebase.auth();
const fs = require('fs');

exports.webhookTest = functions.https.onRequest((request, response) => {

    console.log(request.body);
    if(request.method === "POST") {
      if(request.body) {
        db.collection('trelloUpdateTest').add(request.body);
      }
    }
    

    return response.status(200).send("if there is a god, help me now");

});
