//just a client ran post request to initiate the webhook

const axios = require('axios')

//considerable documentation on the webhook here: https://developers.trello.com/page/webhooks

axios.post('https://api.trello.com/1/tokens/7038d4016f578c077da4b282d74a8aad0aa8cb068d9bd2b364a22e853384d453/webhooks/?key=f5f7b5f6456619c81fd348f7b69d4e08', {
  description: "testing webhook",
  callbackURL: "https://us-central1-agilebotrp.cloudfunctions.net/webhookTest",
  idModel: "5e502aed52e0dd6109a1f605",
})
.then((res) => {
  console.log(`statusCode: ${res.statusCode}`)
  console.log(res)
})
.catch((error) => {
  console.error(error)
});

axios.post('https://api.trello.com/1/tokens/7038d4016f578c077da4b282d74a8aad0aa8cb068d9bd2b364a22e853384d453/webhooks/?key=f5f7b5f6456619c81fd348f7b69d4e08', {
  description: "Send changes to Firebase",
  callbackURL: "https://us-central1-agilebotrp.cloudfunctions.net/addUpdates",
  idModel: "5e45a94b60bbf0097f5d9d3c", // Looks at whole board
})
.then((res) => {
  console.log(`statusCode: ${res.statusCode}`)
  console.log(res)
})
.catch((error) => {
  console.error(error)
});