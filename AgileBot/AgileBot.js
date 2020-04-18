//firebase stuff Service Account still needs update
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase = require("firebase");
require("firebase/auth");

const serviceAccount = require("../FirebaseFunctions/functions/agilebotrp-firebase-adminsdk-gs4o8-f1d603a5b1.json");


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
var actions = new Set(["update", "move", "create", "all"]);
var IGNORE_ACT = new Set([
    'action_moved_card_higher', 'action_moved_card_lower', 'action_add_label_to_card',
    'action_sent_card_to_board', 'action_remove_label_from_card', 'action_delete_card',
    'action_delete_attachment_from_card', 'action_moved_list_left', 'action_moved_list_right',
    'action_archived_list', 'action_update_board_name'
])
var NOTIFIED_SUBS = new Set;

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
        .then(response => {
            return response.json()
        })
        .then(data => {
            boardObj = data;
            let cards = boardObj.cards;
            let lists = boardObj.lists;
            var subID = ''; //The ID of the item we are retrieving 
            if (type == 'cards') {
                for (let i = 0; i < cards.length; i++) {    //searches through all the cards
                    if (cards[i].name.toLowerCase() == name.toLowerCase()) {
                        subID = cards[i].id;
                    }
                }
            }
            if (type == 'lists') {
                for (let i = 0; i < lists.length; i++) {    //searches through all the lists
                    if (lists[i].name.toLowerCase() == name.toLowerCase()) {
                        subID = lists[i].id;
                    }
                }
            }
            if (type == 'boards') { // Only 1 name on the board
                if (boardObj.name.toLowerCase() == name.toLowerCase()) {
                    subID = boardObj.id;
                }
            }
            if (subID == '') {  //only gets to this if the name is not in the board
                channel.send("Card was not found");
                return;
            }

            let SubCollection = db.collection('Subscribers').doc(subID).get()
                .then(doc => {
                    if (!doc.exists) {  //If the document for the item doesn't exist there is no subscription to it
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
        });
}

function subscribe(name, type, act, discID, channel) {
    fetch(trelloURL, {
        method: "GET"
    })
        .then(response => {
            return response.json()
        })
        .then(data => {
            boardObj = data;
            let cards = boardObj.cards;
            let lists = boardObj.lists;
            var subID = '';
            if (type == 'cards') {
                for (let i = 0; i < cards.length; i++) {    //searches through all the cards
                    if (cards[i].name.toLowerCase() == name.toLowerCase()) {
                        subID = cards[i].id;
                    }
                }
            }
            if (type == 'lists') {
                for (let i = 0; i < lists.length; i++) {    //searches through all the lists
                    if (lists[i].name.toLowerCase() == name.toLowerCase()) {
                        subID = lists[i].id;
                    }
                }
            }
            if (type == 'boards') { // Only 1 name on the board
                if (boardObj.name.toLowerCase() == name.toLowerCase()) {
                    subID = boardObj.id;
                }
            }
            if (subID == '') {  //only gets to this if the name is not in the board
                channel.send("Card was not found");
                return;
            }
            let SubCollection = db.collection('Subscribers').doc(subID).get()
                .then(doc => {
                    if (!doc.exists) {
                        db.collection('Subscribers').doc(subID).set({
                            name: [name]    //adds the name of item as a reference 
                        });                 //then goes through code to add the discord subscriber down below
                        if (doc.get(discID) == null) {    //checks to see if discordID exists
                            db.collection('Subscribers').doc(subID).update({    // searches doc for the id of the trello card
                                [discID]: [act]     //"subscribed" is something we can store data in - Just a place holder
                            })
                            channel.send("Successfully subscribed to " + name + "!")
                            return;
                        }
                        else {
                            //Document checking failed somehow - should never hit this
                            client.channels.get.chid.send("Error, Document Checking Goofed");
                            return;
                        }
                    }
                    else {
                        if (doc.get(discID) == null) {    //checks to see if discordID exists
                            db.collection('Subscribers').doc(subID).update({    // searches doc for the id of the trello card
                                [discID]: [act]
                            })
                            channel.send("Successfully subscribed to " + name + "!");
                            return;
                        }
                        else {
                            if (act == 'all') {
                                let arrunion = db.collection('Subscribers').doc(subID).update({ //if subscribed to everything,
                                    [discID]: admin.firestore.FieldValue.delete()               //deletes all other subs to add 'all'
                                });
                                db.collection('Subscribers').doc(subID).update({    // searches doc for the id of the trello card
                                    [discID]: [act]
                                })
                                channel.send("Successfully subscribed to " + name + "!")
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
        });
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

function archiveCard(cardName, channel) {

    fetch(trelloURL, {
        method: "GET",
        headers: {
            'Accept': 'application/json'
          }
    })
    .then(response => {
        return response.json()
    })
    .then(data => {
        console.log("?");
        var boardObj = data;
        var ourCard;
        let cards = boardObj.cards;
        for (let i = 0; i < cards.length; i++) {
            if (cards[i].name.toLowerCase() == cardName.toLowerCase()) {
                //card exists

                ourCard = cards[i];
                console.log(ourCard);
                break;
            }
        }
        if (ourCard) {
            
            fetch('https://api.trello.com/1/cards/' + ourCard.id + '?closed=true&key=f5f7b5f6456619c81fd348f7b69d4e08&token=7038d4016f578c077da4b282d74a8aad0aa8cb068d9bd2b364a22e853384d453', {
                method: 'PUT',
                headers: {
                'Accept': 'application/json'
                }
                })
             .then(response => {
                console.log(
                `Response: ${response.status} ${response.statusText}`
                );

                if (response.status == "200") {
                    channel.send("Successfully Archived Card")
                }
                return response.text();

            return response.text();
            })
            .then(text => console.log(text))
            .catch(err => {
                channel.send("something broke 2.0");
                return;
            });

            }
        else {
            channel.send("Card not found.")
        }
            return;
    })
    .catch(err => {
        channel.send("something broke");
        return;
    });
}

function moveCardToList(cardName, listName, channel){

    fetch(trelloURL, {
        method: "GET",
        headers: {
            'Accept': 'application/json'
          }
    })
    .then(response => {
        return response.json()
    })
    .then(data => {
        let boardObj = data;
        var ourCard, ourList;
        let cards = boardObj.cards;
        let lists = boardObj.lists;
        for (let i = 0; i < cards.length; i++){
            if (cards[i].name.toLowerCase() == cardName.toLowerCase()) {
                //card exists

                ourCard = cards[i];
                console.log(ourCard);
                break;
            }
        }
        for (let i = 0; i < lists.length; i++){
            if (lists[i].name.toLowerCase() == listName.toLowerCase()) {
                //card exists

                ourList = lists[i];
                console.log(ourList);
                break;
            }
        }

        if(ourCard){

            if(ourList){

                fetch('https://api.trello.com/1/cards/' + ourCard.id + '?idList=' + ourList.id + '&key=f5f7b5f6456619c81fd348f7b69d4e08&token=7038d4016f578c077da4b282d74a8aad0aa8cb068d9bd2b364a22e853384d453', {
                    method: 'PUT',
                    headers: {
                    'Accept': 'application/json'
                    }
                    })
                 .then(response => {
                    console.log(
                    `Response: ${response.status} ${response.statusText}`
                    );
    
                    if (response.status == "200") {
                        channel.send("Successfully Moved Card")
                    }
                    return response.text();
    
                return response.text();
                })
                .then(text => console.log(text))
                .catch(err => {
                    channel.send("something broke 2.0");
                    return;
                }); 

            }
            else{
                channel.send("List not found.")
            }

        }
        else{
            channel.send("Card not found.")
        }

        
    })
    .catch(err => {
        channel.send("something broke");
        return;
    });
}

function parseActions(translKey, cardName, listName, boardName, subMap, updates, i) {
    for (let [sub, actions] of subMap) {
        let NOTIFY_SUBSCRIBER = client.users.find(x => x.id === sub);
        if (NOTIFIED_SUBS.has(NOTIFY_SUBSCRIBER)) {
            return;
        }
        NOTIFIED_SUBS.add(NOTIFY_SUBSCRIBER)
        if (Object.values(actions).indexOf('move') > -1 || Object.values(actions).indexOf('all') > -1) { // When the subscriber is either 'all' or 'move'
            //
            //  This Switch Statement parses through every possibility we want to process. Additional cases can be added on at will.
            //  Any actions we want to ignore needs to be added to the Global Var 'IGNORE_ACT'
            //  Any action with the translation key 'unknown' will not be processed. We can process them by additional means if necessary.
            //      -Console will produce the information needed to find the action that produced an unknown
            //      -The JSON trello sends can provide the specific information needed to parse it
            //
            switch (translKey) {
                case 'action_move_card_from_list_to_list':
                    NOTIFY_SUBSCRIBER.send('The new card titled `' + cardName + '` was moved to  `' + listName + '` by `' +
                        updates[i].action.memberCreator.fullName + '`.');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'unknown':
                    console.log('Unknown update Occured, likely not important. User: ' + updates[i].action.memberCreator.fullName + ' List: '
                        + listName + ' Board: ' + boardName);
                    break;
            }
        }
        if (Object.values(actions).indexOf('update') > -1 || Object.values(actions).indexOf('all') > -1) { // When the subscriber is either 'all' or 'update'
            //
            //  This Switch Statement parses through every possibility we want to process. Additional cases can be added on at will.
            //  Any actions we want to ignore needs to be added to the Global Var 'IGNORE_ACT'
            //  Any action with the translation key 'unknown' will not be processed. We can process them by additional means if necessary.
            //      -Console will produce the information needed to find the action that produced an unknown
            //      -The JSON trello sends can provide the specific information needed to parse it
            //
            switch (translKey) {
                case 'action_comment_on_card':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` was updated with a comment  `' + updates[i].action.data.text + '` by `' +
                        updates[i].action.memberCreator.fullName + '`.');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_renamed_card': //Wont work for renaming a card not quite sure why.
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` was renamed to  `' + updates[i].action.data.card.name + '` by `' +
                        updates[i].action.memberCreator.fullName + '`.');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_added_a_due_date':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been assigned a due date of  `' + updates[i].action.data.card.due.split('T')[0] + '` by `' +
                        updates[i].action.memberCreator.fullName + '`.');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_changed_a_due_date':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + "`'s due date has been changed to `" + updates[i].action.data.card.due.split('T')[0] + '` by `' +
                        updates[i].action.memberCreator.fullName + '`.');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_removed_a_due_date':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has had its due date removed by `' +
                        updates[i].action.memberCreator.fullName + '`.');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_archived_card':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been archived by  `' + updates[i].action.memberCreator.fullName + '`.');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_add_attachment_to_card':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been updated with an attachment by  `' + updates[i].action.memberCreator.fullName + '`. Attachment: '
                        + '\n' + updates[i].action.data.attachment.url);
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_changed_description_of_card':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has added the description `' + updates[i].action.data.card.desc + '` by `' +
                        updates[i].action.memberCreator.fullName + '`');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_add_checklist_to_card': //adding an item to checklist sends a null translation key, we can process it using checkItem but I dont see it necessary
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has been given a checklist by  `' + updates[i].action.memberCreator.fullName + '`');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_remove_checklist_from_card':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has had its checklist removed by `' + updates[i].action.memberCreator.fullName + '`');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_renamed_checkitem':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has had a checklist item `' + updates[i].action.data.old.name + '` renamed to `'
                        + updates[i].action.data.checkItem.name + '` by `' + updates[i].action.memberCreator.fullName + '`');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_completed_checkitem':
                    NOTIFY_SUBSCRIBER.send('The checklist item `' + updates[i].action.data.checkItem.name + '` on the card `' + cardName + '` has been marked completed by `'
                        + updates[i].action.memberCreator.fullName + '`');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_marked_checkitem_incomplete':
                    NOTIFY_SUBSCRIBER.send('The checklist item `' + updates[i].action.data.checkItem.name + '` on the card `' + cardName + '` has been marked incomplete by `'
                        + updates[i].action.memberCreator.fullName + '`');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'action_member_joined_card':
                    NOTIFY_SUBSCRIBER.send('The card titled `' + cardName + '` has added  `' + updates[i].action.data.member.name + '` to the cards members by `'
                        + updates[i].action.memberCreator.fullName + '`');
                    console.log("UserID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: " + translKey);
                    break;
                case 'unknown':
                    console.log('Unknown update Occured, likely not important. User: ' + updates[i].action.memberCreator.fullName + ' Card: '
                        + cardName + ' List: ' + listName);
                    break;
            }
            if (Object.values(actions).indexOf('create') > -1 || Object.values(actions).indexOf('all') > -1) { // Card is created in list
                //
                //  This Switch Statement parses through every possibility we want to process. Additional cases can be added on at will.
                //  Any actions we want to ignore needs to be added to the Global Var 'IGNORE_ACT'
                //  Any action with the translation key 'unknown' will not be processed. We can process them by additional means if necessary.
                //      -Console will produce the information needed to find the action that produced an unknown
                //      -The JSON trello sends can provide the specific information needed to parse it
                //
                switch (translKey) {
                    case 'action_create_card':
                        NOTIFY_SUBSCRIBER.send('The new card titled `' + cardName + '` was created in list `' + listName + '` by `' +
                            updates[i].action.memberCreator.fullName + '`.');
                        break;
                    case 'unknown':
                        console.log('Unknown update Occured, likely not important. User: ' + updates[i].action.memberCreator.fullName + ' Board: '
                            + boardName);
                        break;
                    case 'action_added_list_to_board':
                        NOTIFY_SUBSCRIBER.send('The List `' + updates[i].action.data.list.name + '` was created in the board `' + boardName + '` by `' +
                            updates[i].action.memberCreator.fullName + '`.');
                        console.log("ID: " + sub + ", List: " + listName + ", Card: " + cardName + ", Action: createCard");
                        break;
                }
            }
        }
    }
}

function notifySubscribers(updates, subscribers) {
    let subs = new Map;
    NOTIFIED_SUBS = new Set;
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
            parseActions(translKey, cardName, listName, boardName, subs.get(cardName), updates, i)
        }
        if (subs.has(listName)) {
            parseActions(translKey, cardName, listName, boardName, subs.get(listName), updates, i)
        }
        if (subs.has(boardName)) {
            parseActions(translKey, cardName, listName, boardName, subs.get(boardName), updates, i)
        }
        else if (!subs.has(cardName) || !subs.has(listName) || !subs.has(boardName)) { //If nobody is subscribed to the card, list, or board it will archive the update
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
        }

        else if (translKey) { //If the translation key has not be handled, it will produce a console message but not a discord message. Then archive the update.
            let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
            let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
        }
        let archiveUpdate = db.collection('archivedUpdates').add(updates[i]);
        let deleteUpdate = db.collection('trelloUpdateTest').doc(updates[i].docID).delete();
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

    const embed = new Discord.RichEmbed();

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
        if (!actions.has(arg[1]) || arg[1] == 'create') { //You cannot subscribe to any sort of card creation, you can sub to a list to see all cards create
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
        if (!actions.has(arg[1]) || arg[1] == 'move') {  //There is no possible way for a board to move
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

    if (command == "archive") {

        var arg = args.join(' ').split(' ');
        if (arg[0] == null) {
            message.channel.send('No card name. Include the name of the card you wish to archive.')
            return;
        }
        if (arg[1] != null) {
            message.channel.send('Too many arguments. Use the name of the card you wish to archive.')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        
        archiveCard(arg[0], message.channel);
    }

    if (command == "movecard"){

        var arg = args.join(' ').split(' ');
        if (arg[0] == null) {
            message.channel.send('Too little arguments. Use first the Card you wish you move, then the List you wish to move it to.')
            return;
        }
        if (arg[1] == null) {
            message.channel.send('Too little arguments. Use first the Card you wish you move, then the List you wish to move it to.')
            return;
        }
        if (arg[2] != null) {
            message.channel.send('Too many arguments. Type ;help for details.')
            return;
        }
        arg[0] = arg[0].replace('_', ' ');
        arg[1] = arg[1].replace('_', ' ');
        
        moveCardToList(arg[0], arg[1], message.channel);
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

    if (command === "help") {

        var arg = args.join(' ').split(' ');

        if (args.length == 0){
        embed.setTitle('Type ;help <command name> to learn more about the given command.');
        embed.addField('subcard','Subscribe to a specific card.');
        embed.addField('sublist','Subscribe to a specific list.');
        embed.addField('subboard','Subscribe to a specific board.');
        embed.addField('unsubcard','Unsubscribe to a subscribed card.');
        embed.addField('unsublist','Unsubscribe to a subscribed list.');
        embed.addField('unsubboard','Unsubscribe to a subscribed board.');
        embed.addField('comment','Add a comment to a specific card.');
        embed.addField('addcard','Add a new card to a specific list.');
        embed.addField('archive','Archive a specific card');
        embed.addField('movecard','Move an existing card to a different list.');

        message.channel.send({embed});
        }

        if (arg[0] == 'subcard'){
            embed.setTitle(';subcard <Card Name> <Action>');
            embed.addField('Card Name','Name of the card you wish to subscribe to, space seperated by "_".');
            embed.addField('Action','Describes what action you wish to be updated on, can be one of: update, move, create, or all.');
            message.channel.send({embed});
        }
        if (arg[0] == 'sublist'){
            embed.setTitle(';sublist <List Name> <Action>');
            embed.addField('List Name','Name of the lsit you wish to subscribe to, space seperated by "_".');
            embed.addField('Action','Describes what action you wish to be updated on, can be one of: update, move, create, or all.');
            message.channel.send({embed});
        }
        if (arg[0] == 'subboard'){
            embed.setTitle(';subboard <Board Name> <Action>');
            embed.addField('Board Name','Name of the board you wish to subscribe to, space seperated by "_".');
            embed.addField('Action','Describes what action you wish to be updated on, can be one of: update, move, create, or all.');
            message.channel.send({embed});
        }
        if (arg[0] == 'unsubcard'){
            embed.setTitle(';unsubcard <Card Name>');
            embed.addField('Card Name','Name of the card you wish to unsubscribe to.');
            message.channel.send({embed});
        }
        if (arg[0] == 'unsublist'){
            embed.setTitle(';unsublist <List Name>');
            embed.addField('List Name','Name of the list you wish to unsubscribe to.');
            message.channel.send({embed});
        }
        if (arg[0] == 'unsubboard'){
            embed.setTitle(';unsubboard <Board Name>');
            embed.addField('Board Name','Name of the board you wish to unsubscribe to.');
            message.channel.send({embed});
        }
        if (arg[0] == 'comment'){
            embed.setTitle('');
            message.channel.send({embed});
        }
        if (arg[0] == 'addcard'){
            embed.setTitle('');
            message.channel.send({embed});
        }
        if (arg[0] == 'archive'){
            embed.setTitle(';archive <Card Name>');
            embed.addField('Card Name','The name of the card you wish to archive, space seperated by "_"');
            message.channel.send({embed});
        }
        if (arg[0] == 'movecard'){
            embed.setTitle(';move <Card Name> <List Name>');
            embed.addField('Card Name', 'The name of the card you wish to move, space seperated by "_"');
            embed.addField('List Name', 'Name of the list you wish to move the card to, space seperated by "_"');
            message.channel.send({embed});
        }
    }


});

client.login(auth.token);