const express = require('express');
const { createClient } = require('redis');
const crypto = require('crypto');

const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const app = express();
app.use(express.json());
app.use(express.static('public'))
const client = createClient({url: redisURL});
client.connect();
client.on('ready', () => { console.log("Connected!") });
client.on('error', (err) => {  console.error(err) });

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];


  if (authHeader) {
    const token = authHeader.trim();
    const email = await client.HGET("sessions", token);
    const currentUser = await client.json.get(`users:${email}`)

    if (email && currentUser) {
      req.currentUser = JSON.parse(currentUser);
      next();
    } else {
      res.sendStatus(401);
    }

  } else {
    res.sendStatus(401); // Unauthorized
  }
}

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

  console.log(`TODO: this should be sent to user email ${email}: ${link}`);

  res.json({message: "OTP successfully sent to your email!"});
});

app.get("/signIn", async (req, res) => {
  const { email, token } = req.query;

  const foundToken = await client.HGET("otps", email);

  if (foundToken === token) {
    const secret = crypto.randomUUID();

    await client.HDEL("otps", email);
    await client.HSET("sessions", secret, email);
    await client.json.set(`users:${email}`, "$", JSON.stringify({email: email}), "NX");

    res.json({message: secret});
  } else {
    res.sendStatus(401)
  }

});

app.delete("/signOut", authenticateToken, async (req, res) => {
  await client.HDEL("sessions", req.currentUser.token)
  res.json({message: "OK"})
});

app.get("/profile", authenticateToken, async (req, res) => {
  res.json(req.currentUser)
});

app.put("/profile", authenticateToken, async (req, res) => {
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

app.listen(3000, () => {
  console.log('Server is running on port 3000');
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