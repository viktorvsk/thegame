const express = require('express');
const redis = require('redis');

const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';

const app = express();
const client = redis.createClient(redisURL);

app.get('/', (req, res) => {
  client.incr('visitors_count', (err, count) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    res.json({ visitors: count });
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
