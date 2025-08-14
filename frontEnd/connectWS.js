const socket = new WebSocket(`ws://${window.location.host}`);

const messages = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");

form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.value) {
        addMessage(input.value, "outgoing");
        socket.send(input.value);
        input.value = "";
    }
});

socket.addEventListener("message", function (event) {
    addMessage(event.data, "incoming");
});

function addMessage(text, type) {
    const item = document.createElement("li");
    item.classList.add("message", type);
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
}
