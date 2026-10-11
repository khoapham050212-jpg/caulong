const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "./login.html";
}

const welcomeText = document.getElementById("welcome-text");
if (welcomeText && currentUser) {
  welcomeText.textContent = `Xin chào, ${currentUser.username}`;
}

const logoutBtn = document.getElementById("logout-btn");
logoutBtn.addEventListener("click", function () {
  localStorage.removeItem("currentUser");
  window.location.href = "./login.html";
});