# Online Leaderboard

The game works without a server by saving scores in browser `localStorage`.
To make the leaderboard shared by all players:

1. Deploy `leaderboard-server.js` on a public server.
2. Confirm the endpoint works, for example:
   `https://your-domain.example/leaderboard`
3. Set the endpoint in `config.js`:

```js
window.HUANZI_LEADERBOARD_API = "https://your-domain.example/leaderboard";
```

The frontend sends:

```json
{
  "avatar": "粉",
  "name": "玩家名",
  "score": 8,
  "durationSeconds": 60
}
```

The server returns:

```json
{
  "records": []
}
```
