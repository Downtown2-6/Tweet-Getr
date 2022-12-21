/* eslint-disable */

//Needle is an HTTP client (allegeldy the leanest and most handsome client in Nodeland)
const needle = require('needle')
//requiring the .env created at root
const confid = require('dotenv').config()
const http = require('http')
const path = require('path')
const express = require('express')
const socketIo = require('socket.io')
const PORT = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'))
})


const TOKEN = process.env.TWITTER_BEARER_TOKEN

//quick test to ensure the token was grabbed succesfully
//we will need it for every connection attempt to Twitter API
//console.log(TOKEN)

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id'

const rules = [{
  value: 'Coding -is:retweet'
}]

//get stream rules
async function getRules() {
  const response = await needle('get', rulesURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })
  return response.body
}

//set stream rules
async function setRules() {
  const data = {
    add: rules
  }

  const response = await needle('post', rulesURL, data, {
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    }
  })
  return response.body
}

//delete stream rules
async function deleteRules(rules) {
  if(!Array.isArray(rules.data)){
    return null
  }

  const ids = rules.data.map((rule) => rule.id)
  const data = {
    delete: {
      ids: ids
    }
  }

  const response = await needle('post', rulesURL, data, {
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    }
  })
  return response.body
}

function streamTweets(socket) {
  const stream = needle.get(streamURL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  })
  stream.on('data', (data) => {
    try {
      const json = JSON.parse(data)
      // console.log(json)
      socket.emit('tweet', json)
    } catch (err){}
  })
}

io.on('connection', async () => {
  console.log('Client connected...')

    let currentRules

  try {
    //get all stream rules
    currentRules = await getRules()
    //delete all stream rules
    await deleteRules(currentRules)
    //set rules based on array above (rulesArray)
    await setRules()

  } catch (err) {
    console.error(err)
    process.exit(1)
  }
  streamTweets(io)
})


 server.listen(PORT, () => console.log(`Listening on port ${PORT}`))
