const express = require('express');
const { createClient } = require('redis');
const crypto = require('crypto');

const SECRET = crypto.randomUUID();

const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const app = express();
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(express.static('public'))
app.use(cookieParser(SECRET))
app.use(bodyParser.urlencoded({ extended: true }));

const client = createClient({url: redisURL});
client.connect();
client.on('ready', () => { console.log("Connected!") });
client.on('error', (err) => {  console.error(err) });

async function authenticateToken(req, res, next) {
  const sessionId = req.signedCookies.sid;

  if (sessionId) {
    const email = await client.HGET("sessions", sessionId);
    const currentUser = await client.json.get(`users:${email}`)

    if (email && currentUser) {
      req.currentUser = JSON.parse(currentUser);
      next();
    } else {
      res.redirect("/login");
    }

  } else {
    res.redirect("/login");
  }
}

app.get("/", authenticateToken, async (req, res) => {
  res.redirect('/lobby')
});

app.get('/counter', async (req, res) => {
  const count = await client.INCR("visitors_count");
  res.json({ visitors: count });
});

// Account

app.post("/requestOtp", async (req, res) => {
  const { email } = req.body;
  const token = crypto.randomUUID();
  const link = `${baseUrl}/signIn?email=${email}&token=${token}`

  await client.HSET("otps", email, token);

  res.json({message: `OTP successfully sent to your email ${email}!`, link});
});

app.get("/signIn", async (req, res) => {
  const { email, token } = req.query;

  const foundToken = await client.HGET("otps", email);

  if (foundToken === token) {
    const sessionId = crypto.randomUUID();

    await client.HDEL("otps", email);
    await client.HSET("sessions", sessionId, email);
    await client.SADD()
    await client.json.set(`users:${email}`, "$", JSON.stringify({email: email, sessionId: sessionId}), {"NX": true});

    await client.pubslish("active_users", email)

    let options = {
        maxAge: 1000 * 60 * 15, // 15 minutes
        httpOnly: true,
        signed: true
    }

    res.cookie('sid', sessionId, options);
    res.redirect('/');
  } else {
    res.sendStatus(401)
  }

});

app.get("/sign-out", authenticateToken, async (req, res) => {
  await client.HDEL("sessions", req.signedCookies.sid);
  res.clearCookie('sid');
  res.redirect('/');
});

app.get("/userProfile", authenticateToken, async (req, res) => {
  res.json(req.currentUser)
});

app.put("/userProfile", authenticateToken, async (req, res) => {
  const newUserParams = {...req.body, email: req.currentUser.email};
  await client.json.set(`users:${req.currentUser.email}`, "$", JSON.stringify(newUserParams));

  res.json(newUserParams)
});

// Lobby

// app.post("/sendChatMessage", (req, res) => {
//   res.json({message: "OK"})
// });

// app.post("/searchGame", (req, res) => {
//   res.json({message: "OK"})
// });

// app.post("/createGameRoom", (req, res) => {
//   res.json({message: "OK"})
// });

// app.put("/joinGameRoom", (req, res) => {
//   res.json({message: "OK"})
// });

// Game Room

// app.delete("/leaveGameRoom", (req, res) => {
//   res.json({message: "OK"})
// });

// app.delete("/kickUser", (req, res) => {
//   res.json({message: "OK"})
// });

// app.post("/kickUser", (req, res) => {
//   res.json({message: "OK"})
// });

// app.post("/startGame", (req, res) => {
//   res.json({message: "OK"})
// });

// app.post("/playGame", (req, res) => {
//   res.json({message: "OK"})
// });

const wss = new WebSocket.Server({ server });

// Handle WebSocket connections WIP
wss.on('connection', async (ws, req) => {
    let email;

    console.log('WebSocket connection established');

    const sessionId = require('url').parse(req.url).query.split("=")[1];
    email = await client.HGET("sessions", sessionId);
    const currentUser = await client.json.get(`users:${email}`)

    // TODO: something weird
    // const ttt = JSON.stringify(currentUser);
    // console.log(ttt)
    // console.log(typeof ttt)
    // console.log(JSON.parse(ttt))
    // console.log(Object.keys(JSON.parse(ttt)))

    if (email && currentUser) {
      await client.SADD("active_users", email);
    } else {
      ws.close(3401, "user not found");
    }

    // TODO: WIP
    // client.subscribe("active_users", (message) => {
    //   ws.send(message);
    // })


    // console.log(currentUser)

    // Handle incoming WebSocket messages
    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        // You can do something with the message and send a response if needed
        ws.send(`You said: ${message}`);

    });

    // Handle WebSocket disconnections
    ws.on('close', async () => {
      await client.SREM("active_users", email);
        console.log('WebSocket connection closed');
    });
});


server.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});


/// cURL

// CURL -X POST \
//   -H "Content-Type: application/json" \
//   -d '{  "email": "me@viktorvsk.com" }' \
//   http://localhost:3000/requestOtp

// CURL -X GET \
//   -H "Content-Type: application/json" \
//   http://localhost:3000/signIn?email=me@viktorvsk.com&token=bf0c55d3-b319-469b-813b-08c23fb65a66

// CURL -X GET \
//   -H "Content-Type: application/json" \
//   -H "Authorization: fb642104-056d-4bbc-9184-eec37bc63f5d" \
//   http://localhost:3000/profile

// CURL -X DELETE \
//   -H "Content-Type: application/json" \
//   -H "Authorization: fb642104-056d-4bbc-9184-eec37bc63f5d" \
//   http://localhost:3000/signOut