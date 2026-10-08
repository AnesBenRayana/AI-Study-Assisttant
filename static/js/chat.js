const chatInput = document.querySelector(".chat-input");
const sendButton = document.querySelector(".send-button");
const chatMessages = document.querySelector(".chat-messages");


async function sendMessage() {

    const messageText = chatInput.value.trim();

    if (messageText === "") {
        return;
    }


    // ================================
    // MESSAGE UTILISATEUR
    // ================================

    const userMessage = document.createElement("div");

    userMessage.classList.add("message", "user-message");

    userMessage.innerHTML = `
        <div class="message-content">
            ${messageText}
        </div>
    `;

    chatMessages.appendChild(userMessage);


    // Le chat quitte immédiatement l'état initial
    document.querySelector(".chat-main").classList.remove("chat-start");

    chatInput.value = "";

    chatMessages.scrollTop = chatMessages.scrollHeight;


    // ================================
    // ENVOI À FLASK
    // ================================

    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: messageText
            })

        });


        // ================================
        // VÉRIFICATION DE LA RÉPONSE
        // ================================

        const data = await response.json();

        if (!response.ok) {

            throw new Error(data.error || "Erreur du serveur");

        }


        // ================================
        // MESSAGE IA
        // ================================

        const aiMessage = document.createElement("div");

        aiMessage.classList.add("message", "ai-message");

        aiMessage.innerHTML = `
            <div class="message-content">
                ${data.response}
            </div>
        `;

        chatMessages.appendChild(aiMessage);

        chatMessages.scrollTop = chatMessages.scrollHeight;


   } catch (error) {

    console.error("Erreur :", error);

    const errorMessage = document.createElement("div");

    errorMessage.classList.add("message", "ai-message");

    errorMessage.innerHTML = `
        <div class="message-content">
            Erreur : ${error.message}
        </div>
    `;

    chatMessages.appendChild(errorMessage);

}

}


sendButton.addEventListener("click", sendMessage);


chatInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {

        sendMessage();

    }

});