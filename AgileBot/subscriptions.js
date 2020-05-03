// subscriptions.js
// ========
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

module.exports = {
    subscribe: function (name, type, act, discID, channel) {

        fetch(trelloURL, {
            method: "GET"
        })
            .then(response => {
                return response.json()
            })
            .then(data => {
                let boardObj = data;
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
    },
    bar: function () {
        // whatever
    }
};