const API_URL = "http://localhost:3000";

function App() {
  return {
    token: Alpine.$persist(null).as('valent.admin.token'),
    user: undefined,
    init() {
      if (this.token) {
        fetch(`${API_URL}/profile`, {headers: {authorization: this.token}}).then(response => response.json()).then(data => this.user = data);
      }
    }
  }
}
