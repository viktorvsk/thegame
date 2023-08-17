const API_URL = "http://localhost:3000";

function Lobby() {
  return {
    user: undefined,
    init: async () => {
      await fetch(`/userProfile`).then(response => response.json()).then(data => {
        this.user = data;
      });

      ws = new WebSocket(`ws://localhost:3000/?sessionId=${this.user.sessionId}`)

      ws.onmessage = (message) => {
        switch(message.type) {
          case "active_users" {
            document.querySelector("#ative_users").append(message.email)
            break;
          }

        }
      }
    } 
  }
}
