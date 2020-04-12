//firebase stuff Service Account still needs update
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase = require("firebase");
require("firebase/auth");

//const serviceAccount = require("../FirebaseFunctions/functions/agilebotrp-firebase-adminsdk-gs4o8-1b430da2e7.json");
var serviceAccount = require("C:/Users/Sal/Documents/Testing/agilebotrp-firebase-adminsdk-gs4o8-7af84966d8.json");


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

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://agilebotrp.firebaseio.com"
});

firebase.initializeApp(config);

const db = admin.firestore();
const fbAuth = firebase.auth();
const fs = require('fs');


//Subscription stuff
const fetch = require("node-fetch");
const trelloURL = 'https://api.trello.com/1/board/5e45a94b60bbf0097f5d9d3c?cards=open&lists=open&checklists=all&key=f5f7b5f6456619c81fd348f7b69d4e08&token=7038d4016f578c077da4b282d74a8aad0aa8cb068d9bd2b364a22e853384d453';
var actions = new Set(["update", "move", "create", "archive", "all"]);
var IGNORE_ACT = new Set([
    'action_moved_card_higher', 'action_moved_card_lower', 'action_add_label_to_card',
    'action_sent_card_to_board', 'action_remove_label_from_card', 'action_delete_card',
    'action_delete_attachment_from_card', 'action_moved_list_left', 'action_moved_list_right',
    'action_archived_list', 'action_update_board_name'
])

// Load up the discord.js library
const Discord = require("discord.js");

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the auth.json file that contains our. 
const auth = require("./auth.json");
// auth.token contains the bot's token

const prefix = require("./prefix.json");
// prefix.prefix contains the bot's prefix

var NOTIFY_CHANNEL;

var interval = setInterval(async function () {
    let theTrelloUpdates = [];
    let theJSONsRef = db.collection('trelloUpdateTest');
    let theJSONGrab = await theJSONsRef.get().then(snapshot => {
        snapshot.docs.forEach((doc) => {
            theTrelloUpdates.push(doc.data());
            theTrelloUpdates[theTrelloUpdates.length - 1].docID = doc.id; // Add doc ID to update so it can be removed/archived later
        });
    }).catch(err => {
        console.log("error", err);
    });
    let trelloSubscribers = [];
    let JSONsRef = db.collection('Subscribers');
    let JSONGrab = await JSONsRef.get().then(snapshot => {
        snapshot.docs.forEach((doc) => {
            trelloSubscribers.push(doc.data());
        });
    }).catch(err => {
        console.log("error", err);
    })
    notifySubscribers(theTrelloUpdates, trelloSubscribers);
    // doUpdateLogic(theTrelloUpdates);
}, 30 * 1000); // Check every minute


function doUpdateLogic(updates) {
    NOTIFY_CHANNEL.send('I found ' + updates.length + ' update(s) in the database');
    for (let i = 0; i < updates.length; i++) {
        let anUpdate = updates[i];
        switch (anUpdate.action.display.translationKey) {
            case 'action_move_card_from_list_to_list':
                NOTIFY_CHANNEL.send('The card titled `' + anUpdate.action.data.card.name + '` was moved from list `' + anUpdate.action.data.listBefore.name + '` to list `' +
                    anUpdate.action.data.listAfter.name + '` by `' + anUpdate.action.memberCreator.fullName + '`.');
                break;
        }

    }
}

function unsubscribe(name, type, discID, channel) {

    fetch(trelloURL, {
        method: "GET"
    })

        .then(response => response.body) //reads the trello JSON for data
        .then(res => res.on('readable', () => {
            let chunk;
            while (null !== (chunk = res.read())) {
                if (chunk.toString().includes(',"name":"' + name + '"')) {  //finds the ID for the card needed ------------|
                    var slice = chunk.toString();                                                                  // | 
                    var i = slice.indexOf('"' + type + '":');                                                         //  | 
                    var j = slice.indexOf(',"name":"' + name + '"');                                                 //   |  
                    while (i > j) {                                                                                 //    |
                        var j = slice.indexOf(',"name":"' + name + '"', slice.indexOf(',"name":"' + name + '"') + 1);  //     |
                    }                                                                                         //      |
                    while (!slice.slice(j - 6, j).includes('{"id":')) {                                          //       | 
                        j--;                                                                                //        | 
                        if (slice.slice(j - 6, j).includes('{"id":')) {                                         //         |    
                            var subID = slice.slice(j + 1, j + 25)                                            //          | 
                            console.log(name + ' ID is: ' + subID)                                       //           | 
                        }                                                                               //------------|  
                    }

                    let SubCollection = db.collection('Subscribers').doc(subID).get()
                        .then(doc => {
                            if (!doc.exists) {
                                channel.send('You are not subbed to this item!')
                                return;
                            }
                            else {

                                if (doc.get(discID) == null) {    //checks to see if discordID exists
                                    channel.send("You are not subbed to this item!");
                                    return;
                                }

                                else {
                                    let arrunion = db.collection('Subscribers').doc(subID).update({
                                        [discID]: admin.firestore.FieldValue.delete()
                                    });
                                    channel.send("Successfully removed your subscription!");
                                    return;
                                }
                            }
                        })
                        .catch(err => {
                            console.log("Error getting document", err);
                        });
                }

                else {
                    //card name not found, most common error
                    channel.send("Card was not found");
                    return;
                }
            }
        }))
}

function subscribe(name, type, act, discID, channel) {

    fetch(trelloURL, {
        method: "GET"
    })

        .then(response => response.body) //reads the trello JSON for data
        .then(res => res.on('readable', () => {
            let chunk;
            while (null !== (chunk = res.read())) {
                if (chunk.toString().includes(',"name":"' + name + '"')) {  //finds the ID for the card needed ------------|
                    var slice = chunk.toString();                                                                  // | 
                    var i = slice.indexOf('"' + type + '":');                                                         //  | 
                    var j = slice.indexOf(',"name":"' + name + '"');                                                 //   |  
                    while (i > j) {                                                                                 //    |
                        var j = slice.indexOf(',"name":"' + name + '"', slice.indexOf(',"name":"' + name + '"') + 1);  //     |
                    }                                                                                         //      |
                    while (!slice.slice(j - 6, j).includes('{"id":')) {                                          //       | 
                        j--;                                                                                //        | 
                        if (slice.slice(j - 6, j).includes('{"id":')) {                                         //         |    
                            var subID = slice.slice(j + 1, j + 25)                                            //          | 
                            console.log(name + ' ID is: ' + subID)                                       //           | 
                        }                                                                               //------------|  
                    }

                    let SubCollection = db.collection('Subscribers').doc(subID).get()
                        .then(doc => {
                            if (!doc.exists) {
                                db.collection('Subscribers').doc(subID).set({
                                    name: [name]    //adds the name of element as a reference 
                                });                 //then goes through code to add the discord subscriber down below

                                if (doc.get(discID) == null) {    //checks to see if discordID exists
                                    db.collection('Subscribers').doc(subID).update({    // searches doc for the id of the trello card
                                        [discID]: [act]     //"subscribed" is something we can store data in - Just a place holder
                                    })
                                    channel.send("Success!")
                                    return;
                                }

                                else {
                                    //Document checking failed somehow
                                    client.channels.get.chid.send("Error, Document Checking Goofed");
                                    return;
                                }
                            }
                            else {

                                if (doc.get(discID) == null) {    //checks to see if discordID exists
                                    db.collection('Subscribers').doc(subID).update({    // searches doc for the id of the trello card
                                        [discID]: [act]    //"subscribed" is something we can store data in - Just a place holder
                                    })
                                    channel.send("Success!");
                                    return;
                                }

                                else {
                                    if (act == 'all') {
                                        let arrunion = db.collection('Subscribers').doc(subID).update({
                                            [discID]: admin.firestore.FieldValue.delete()
                                        });
                                        db.collection('Subscribers').doc(subID).update({    // searches doc for the id of the trello card
                                            [discID]: [act]     //"subscribed" is something we can store data in - Just a place holder
                                        })
                                        channel.send("Success!")
                                        return;
                                    }
                                    let arrunion = db.collection('Subscribers').doc(subID).update({
                                        [discID]: admin.firestore.FieldValue.arrayUnion(act)
                                    });
                                    channel.send("Successfully added your subscription!");
                                }
                            }
                        })
                        .catch(err => {
                            console.log("Error getting document", err);
                        });
                }

                else {
                    //card name not found, most common error
                    channel.send("Card was not found");
                    return;
                }
            }
        }))
}


function addComment2(name, msg, discUserId, channel) {

    fetch(trelloURL, {
        method: "GET"
    })

        .then(response => {
            return response.json()
        })
        .then(data => {
            var boardObj = data;
            var ourCard;
            let cards = boardObj.cards;
            for (let i = 0; i < cards.length; i++) {
                if (cards[i].name.toLowerCase() == name.toLowerCase()) {
                    //card exists
                    ourCard = cards[i];
                }
            }
            if (ourCard) {
                addCommentToCard(ourCard.id, msg, channel);
            }
        })
        .catch(err => {

        });
}

function addCommentToCard(cardId, text, channel) {
    fetch('https://api.trello.com/1/cards/' + cardId + '/actions/comments?text=' + text + '&key=f5f7b5f6456619c81fd348f7b69d4e08&token=7038d4016f578c077da4b282d74a8aad0aa8cb068d9bd2b364a22e853384d453', {
        method: 'POST'
    })
        .then(response => {
            console.log(
                `Response: ${response.status} ${response.statusText}`
            );
            if (response.status == "200") {
                channel.send("Successfully added comment to card");
            }
            return response.text();
        })
        .then(text => console.log(text))
        .catch(err => console.error(err));
}

function addCardToList(listName, cardName, discUserId, channel) {

    fetch(trelloURL, {
        method: "GET"
    })

        .then(response => {
            return response.json()
        })
        .then(data => {
            console.log("?");
            var boardObj = data;
            var ourList;
            let lists = boardObj.lists;
            for (let i = 0; i < lists.length; i++) {
                if (lists[i].name.toLowerCase() == listName.toLowerCase()) {
                    //card exists

                    ourList = lists[i];
                    console.log(ourList);
                }
            }
            if (ourList) {
                addCard(ourList.id, cardName, channel);
            }
            return;
        })
        .catch(err => {
            channel.send("something broke");
            return;
        });
}

function addCard(listId, cardName, channel) {
    fetch('https://api.trello.com/1/cards?idList=' + listId + '&name=' + cardName + '&key=f5f7b5f6456619c81fd348f7b69d4e08&token=7038d4016f578c077da4b282d74a8aad0aa8cb068d9bd2b364a22e853384d453', {
        method: 'POST'
    })
        .then(response => {
            console.log(
                `Response: ${response.status} ${response.statusText}`
            );
            //channel.send(response.status);
            if (response.status == "200") {
                channel.send("Successfully added card")
            }
            return response.text();
        })
        .then(text => console.log(text))
        .catch(err => console.error(err));
}

function notifySubscribers(updates, subscribers) {
    let subs = new Map;
    for (let [k, v] of Object.entries(subscribers)) { // Populate map with keys of cards/lists which currently have subscribers.
        for (let [k2, v2] of Object.entries(v)) {     // Key is the name of the trello object.
            if (k2 == 'name') {
                subs.set(v2.toString(), '');
            }
        }
    }

    for (let [k, v] of Object.entries(subscribers)) {   // Assign each key in map to another map, which has keys of subscribers
        let name = '';                                  // Discord IDs paired with a list of the actions they are watching.
        let currentSubs = new Map;                      // subs map structure is:
        for (let [k2, v2] of Object.entries(v)) {       // key:                       value:
            if (k2 == 'name') {                         // card/list name(String) <-> currentSubs(Map)
                name = v2.toString();                   //                            |
            }                                           //                            |--> key:                        value:
            else if (!(isNaN(k2)) && k2.length == 18) { //                                 user Discord ID(String) <-> subscribed actions(object)
                currentSubs.set(k2, v2);
            }
        }
        subs.set(name, currentSubs);
    }

    for (let i = 0; i < updates.length; i++) {
        let cardName = '';
        let listName = '';
        let boardName = '';
        if ('card' in updates[i].action.data) { // If action was done on a card, 'cardName' and 'cardList' will be updated        
            cardName = updates[i].action.data.card.name;
        }
        if ('list' in updates[i].action.data) { // If action was done on a list, only 'listName' will be updated
            listName = updates[i].action.data.list.name;
        }
        if ('listAfter' in updates[i].action.data) { // If action was done on a list, only 'listName' will be updated
            listName = updates[i].action.data.listAfter.name;
        }
        if ('board' in updates[i].action.data) {
            boardName = updates[i].action.data.board.name;
        }
        let action = updates[i].action.type;
        let translKey = updates[i].action.display.translationKey; // For specific updates in future

        if (IGNORE_ACT.has(translKey)) {
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
            return;
        }
        // Logic for cards and lists should be separate. For instance, you can't subscribe to a 'create' action on a card, since it
        // isn't created yet.
        // TODO: Figure out all the action that should be allowed to be subscribed to for card, list, board.
        if (subs.has(cardName)) {
            for (let [sub, actions] of subs.get(cardName)) {
                if (Object.values(actions).indexOf('move') > -1 || Object.values(actions).indexOf('all') > -1) { // Card is created in list
                    let NOTIFY_SUBSCRIBER = client.users.find(x => x.id === sub);
                    switch (translKey) {
                        case 'action_move_card_from_list_to_list':
                            NOTIFY_SUBSCRIBER.send('The new card titled `' + cardName + '` was moved to  `' + listName + '` by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                    }
                }
                if (Object.values(actions).indexOf('update') > -1 || Object.values(actions).indexOf('all') > -1) { // Card is created in list
                    let NOTIFY_SUBSCRIBER = client.users.find(x => x.id === sub);
                    switch (translKey) {
                        case 'action_comment_on_card':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` was updated with a comment  `' + updates[i].action.data.text + '` by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_renamed_card': //Wont work for renaming a card not quite sure why.
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` was renamed to  `' + updates[i].action.data.card.name + '` by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_added_a_due_date':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been assigned a due date of  `' + updates[i].action.data.card.due.split('T')[0] + '` by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_changed_a_due_date':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` due date has been changed to `' + updates[i].action.data.card.due.split('T')[0] + '` by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_removed_a_due_date':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has had its due date removed by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_archived_card':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been archived by  `' + updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_add_attachment_to_card':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been updated with an attachment by  `' + updates[i].action.memberCreator.fullName + '`. Attachment: '
                                + '\n' + updates[i].action.data.attachment.url);
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_changed_description_of_card':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has added the description `' + updates[i].action.data.card.desc + '` by `' +
                                updates[i].action.memberCreator.fullName + '`');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_add_checklist_to_card': //adding an item to checklist sends a null translation key, we can process it using checkItem but I dont see it necessary
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been given a checklist by  `' + updates[i].action.memberCreator.fullName + '`');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_remove_checklist_from_card':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has had its checklist removed by `' + updates[i].action.memberCreator.fullName + '`');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_renamed_checkitem':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has had a checklist item `' + updates[i].action.data.old.name + '` renamed to `'
                                + updates[i].action.data.checkItem.name + '` by `' + updates[i].action.memberCreator.fullName + '`');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_completed_checkitem':
                            NOTIFY_SUBSCRIBER.send('The checklist item `' + updates[i].action.data.checkItem.name + '` on the card `' + cardName + '` has been marked completed by `'
                                + updates[i].action.memberCreator.fullName + '`');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_marked_checkitem_incomplete':
                            NOTIFY_SUBSCRIBER.send('The checklist item `' + updates[i].action.data.checkItem.name + '` on the card `' + cardName + '` has been marked incomplete by `'
                                + updates[i].action.memberCreator.fullName + '`');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'action_member_joined_card':
                            NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has added  `' + updates[i].action.data.member.name + '` to the cards members by `'
                                + updates[i].action.memberCreator.fullName + '`');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                        case 'unknown':
                            console.log('Unknown update Occured, likely not important. User: ' + updates[i].action.memberCreator.fullName + ' Card: '
                                + cardName + ' List: ' + listName);
                            break;
                    }
                }
            }
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
        }
        else if (subs.has(listName)) { // Someone is subscribed to this update, which is a change on a list
            for (let [sub, actions] of subs.get(listName)) {
                if (Object.values(actions).indexOf('create') > -1 || Object.values(actions).indexOf('all') > -1) { // Card is created in list
                    let NOTIFY_SUBSCRIBER = client.users.find(x => x.id === sub);
                    switch (translKey) {
                        case 'action_create_card':
                            NOTIFY_SUBSCRIBER.send('The new card titled `' + cardName + '` was created in list `' + listName + '` by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                    }
                }
            }
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
        }
        else if (subs.has(boardName)){
            for (let [sub, actions] of subs.get(boardName)) {
                if (Object.values(actions).indexOf('create') > -1 || Object.values(actions).indexOf('all') > -1) { // List is created in the board
                    let NOTIFY_SUBSCRIBER = client.users.find(x => x.id === sub);
                    switch (translKey) {
                        case 'action_added_list_to_board':
                            NOTIFY_SUBSCRIBER.send('The List `' + updates[i].action.data.list.name + '` was created in the board `' + boardName + '` by `' +
                                updates[i].action.memberCreator.fullName + '`.');
                            console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                            break;
                    }
                }
            }
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
        }
        
        else if (!subs.has(cardName) || !subs.has(listName) || !subs.has(boardName)){
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
        }  
        
        else if(translKey){
            console.log(translKey + " has not been ignored or handled. Change done by " + updates[i].action.memberCreator.fullName);
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
        }
    }
}

client.on("ready", () => {
    NOTIFY_CHANNEL = client.channels.find(x => x.id === "680592567796105226"); // Channel to send notification
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});


client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    //message.channel.send(message.toString());
    if (message.author.bot) {
        return;
    }
    else {
        //not a bot so can't get stuck in a loop
    }

    // Also good practice to ignore any message that does not start with our prefix, 
    // which is set in the prefix file.
    if (message.content.indexOf(prefix.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command. 
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(prefix.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Let's go with a few common example commands! Feel free to delete or change those.

    if (command === "subcard") {
        var arg = args.join(' ').split(' ');
        if (arg[2] != null) {
            message.channel.send("Too many arguments. Please remember to use ' _ ' to replace spaces on Trello items.");
            return;
        }
        if (arg[1] == null || arg[0] == null) {
            message.channel.send('Not enough arguments. Make sure you have the card name and subscription type.')
            return;
        }
        arg[1] = arg[1].toLowerCase();
        if (!actions.has(arg[1])) {
            message.channel.send('Invalid subsciption type. Please use <make help command> to see the approved actions')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        subscribe(arg[0], 'cards', arg[1], message.author.id, message.channel);
    }

    if (command === "sublist") {
        var arg = args.join(' ').split(' ');
        if (arg[2] != null) {
            message.channel.send("Too many arguments. Please remember to use ' _ ' to replace spaces on Trello items.");
            return;
        }
        if (arg[1] == null || arg[0] == null) {
            message.channel.send('Not enough arguments. Make sure you have the card name and subscription type.')
            return;
        }
        arg[1] = arg[1].toLowerCase();
        if (!actions.has(arg[1])) {
            message.channel.send('Invalid subsciption type. Please use <make help command> to see the approved actions')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        subscribe(arg[0], 'lists', arg[1], message.author.id, message.channel)
    }

    if (command === "subboard") {
        var arg = args.join(' ').split(' ');
        if (arg[2] != null) {
            message.channel.send("Too many arguments. Please remember to use ' _ ' to replace spaces on Trello items.");
            return;
        }
        if (arg[1] == null || arg[0] == null) {
            message.channel.send('Not enough arguments. Make sure you have the card name and subscription type.')
            return;
        }
        arg[1] = arg[1].toLowerCase();
        if (!actions.has(arg[1])) {
            message.channel.send('Invalid subsciption type. Please use <make help command> to see the approved actions')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        subscribe(arg[0], 'boards', arg[1], message.author.id, message.channel)
    }

    if (command === "unsubcard") {
        var arg = args.join(' ').split(' ');
        if (arg[1] != null) {
            message.channel.send("Too many arguments. Please remember to use ' _ ' to replace spaces on Trello items.");
            return;
        }
        if (arg[0] == null) {
            message.channel.send('Not enough arguments. Make sure you have the card name.')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        unsubscribe(arg[0], 'cards', message.author.id, message.channel);
    }

    if (command === "unsublist") {
        var arg = args.join(' ').split(' ');
        if (arg[1] != null) {
            message.channel.send("Too many arguments. Please remember to use ' _ ' to replace spaces on Trello items.");
            return;
        }
        if (arg[0] == null) {
            message.channel.send('Not enough arguments. Make sure you have the card name.')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        unsubscribe(arg[0], 'lists', message.author.id, message.channel);
    }

    if (command === "unsubboard") {
        var arg = args.join(' ').split(' ');
        if (arg[1] != null) {
            message.channel.send("Too many arguments. Please remember to use ' _ ' to replace spaces on Trello items.");
            return;
        }
        if (arg[0] == null) {
            message.channel.send('Not enough arguments. Make sure you have the card name.')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        unsubscribe(arg[0], 'boards', message.author.id, message.channel);
    }

    if (command == "comment") {
        var arg = args.join(' ').split(' ');
        if (arg[1] == null) {
            message.channel.send('Not enough arguments. Make sure you have the card name and your message.')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        let i = 1;
        let msg = "";
        while (arg[i]) {
            msg += arg[i] + " ";
            i++
        }
        addComment2(arg[0], msg, message.author.id, message.channel);
    }

    if (command == "addcard") {
        //message.channel.send("ye");
        var arg = args.join(' ').split(' ');
        if (arg[1] == null) {
            message.channel.send('Not enough arguments. Make sure you have the list name and your card name.')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        let i = 1;
        let cardName = "";
        while (arg[i]) {
            cardName += arg[i] + " ";
            i++
        } //arg[0] is the list name
        addCardToList(arg[0], cardName, message.author.id, message.channel);
    }

    if (command === "ping") {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }

    if (command === "say") {
        // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
        // To get the "message" itself we join the `args` back into a string with spaces: 
        const sayMessage = args.join(" ");
        // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
        message.delete().catch(O_o => { });
        // And we get the bot to say the thing: 
        message.channel.send(sayMessage);
    }

    if (command === "kick") {
        // This command must be limited to mods and admins. In this example we just hardcode the role names.
        // Please read on Array.some() to understand this bit: 
        // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
        if (!message.member.roles.some(r => ["Administrator", "Moderator"].includes(r.name)))
            return message.reply("Sorry, you don't have permissions to use this!");

        // Let's first check if we have a member and if we can kick them!
        // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
        // We can also support getting the member by ID, which would be args[0]
        let member = message.mentions.members.first() || message.guild.members.get(args[0]);
        if (!member)
            return message.reply("Please mention a valid member of this server");
        if (!member.kickable)
            return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

        // slice(1) removes the first part, which here should be the user mention or ID
        // join(' ') takes all the various parts to make it a single string.
        let reason = args.slice(1).join(' ');
        if (!reason) reason = "No reason provided";

        // Now, time for a swift kick in the nuts!
        await member.kick(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
        message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

    }

    if (command === "ban") {
        // Most of this command is identical to kick, except that here we'll only let admins do it.
        // In the real world mods could ban too, but this is just an example, right? ;)
        if (!message.member.roles.some(r => ["Administrator"].includes(r.name)))
            return message.reply("Sorry, you don't have permissions to use this!");

        let member = message.mentions.members.first();
        if (!member)
            return message.reply("Please mention a valid member of this server");
        if (!member.bannable)
            return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

        let reason = args.slice(1).join(' ');
        if (!reason) reason = "No reason provided";

        await member.ban(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
        message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
    }

    if (command === "purge") {
        // This command removes all messages from all users in the channel, up to 100.

        // get the delete count, as an actual number.
        const deleteCount = parseInt(args[0], 10);

        // Ooooh nice, combined conditions. <3
        if (!deleteCount || deleteCount < 2 || deleteCount > 100)
            return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

        // So we get our messages, and delete them. Simple enough, right?
        const fetched = await message.channel.fetchMessages({ limit: deleteCount });
        message.channel.bulkDelete(fetched)
            .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
    }
});

client.login(auth.token);