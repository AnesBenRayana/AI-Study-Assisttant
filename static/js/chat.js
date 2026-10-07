const chatInput = document.querySelector(".chat-input");
const sendButton = document.querySelector(".send-button");
const chatMessages = document.querySelector(".chat-messages");

function sendMessage() {

    const messageText = chatInput.value.trim();

    if (messageText === "") {
        return;
    }

    const message = document.createElement("div");

    message.classList.add("message", "user-message");

    message.innerHTML = `
        

        <div class="message-content">
            ${messageText}
        </div>
    `;

    chatMessages.appendChild(message);
    document.querySelector(".chat-main").classList.remove("chat-start");

    chatInput.value = "";

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendButton.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        sendMessage();
    }

});