const API_URL = "http://localhost:3000";

function Profile() {
  return {
    user: {},
    userName: null,
    userAge: null,
    init() {
      fetch(`/userProfile`).then(response => response.json()).then(data => {
        this.user = data;
      });

    } ,
    updateUser() {
      fetch(`/userProfile`, {method: "PUT", headers: {'Content-type': 'application/json'}, body: JSON.stringify({
        name: this.userName,
        age: this.userAge,
      })}).then(response => response.json()).then(data => this.user = data);
    }
  }
}
