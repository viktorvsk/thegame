const express = require('express');
const redis = require('redis');
const crypto = require('crypto');

const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const app = express();
app.use(express.json());
const client = redis.createClient(redisURL);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (authHeader) {
    const token = authHeader.trim();

    client.hget("sessions", token, (err, value) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (typeof value !== "undefined" && value !== null) {
        req.current_user = { email: value, token: token }
        next();
      } else {
        res.sendStatus(401);
      }
    });

  } else {
    res.sendStatus(401); // Unauthorized
  }
}

app.get('/', (req, res) => {
  client.incr('visitors_count', (err, count) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    res.json({ visitors: count });
  });
});

// Account

app.post("/requestOtp", (req, res) => {
  const { email } = req.body;
  const token = crypto.randomUUID();
  const link = `${baseUrl}/signIn?email=${email}&token=${token}`

  client.hset("otps", email, token, (err, value) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json({message: link});
  });

});

app.get("/signIn", (req, res) => {
  const { email, token } = req.query;

  client.hget("otps", email, (err, value) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (value === token) {
      const secret = crypto.randomUUID();

      client.hdel("otps", email);
      client.hset("sessions", secret, email)

      res.json({message: secret});
    } else {
      res.sendStatus(401)
    }

  });

});

app.delete("/signOut", authenticateToken, (req, res) => {
  client.hdel("sessions", req.current_user.token)
  res.json({message: "OK"})
});

app.get("/profile", authenticateToken, (req, res) => {
  res.json({message: req.current_user})
});

// app.put("/profile", (req, res) => {
//   res.json({message: "OK"})
// });

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