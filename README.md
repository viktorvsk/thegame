# thegame

A minimal [Express.js](https://expressjs.com) + Redis + WebSocket app — a small playground for a real-time, browser-based game lobby.

It provides cookie-based (passwordless, email magic-link) sign-in, a user profile page where you can set your display name, and a simple shared lobby kept in sync over WebSockets. Sessions and user data are stored in Redis.

> Work in progress / prototype.

## Usage

```sh
npm install
REDIS_URL=redis://localhost:6379 node app.js
```

Then open http://localhost:3000.

A `docker-compose.yaml` is included to run the app together with Redis:

```sh
docker compose up
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `BASE_URL` | `http://localhost:3000` | Base URL used when building sign-in links |
