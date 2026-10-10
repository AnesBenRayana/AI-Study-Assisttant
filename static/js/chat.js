
const chatInput = document.querySelector(".chat-input");
const sendButton = document.querySelector(".send-button");
const chatMessages = document.querySelector(".chat-messages");

// PDF en attente d'envoi
let pendingPdf = null;
let pendingPdfStatusMessage = null;


// =====================================
// AFFICHER UN MESSAGE
// =====================================

function addMessage(type, text) {
    const message = document.createElement("div");
    message.classList.add("message", type);

    const content = document.createElement("div");
    content.classList.add("message-content");
    content.textContent = text;

    message.appendChild(content);
    chatMessages.appendChild(message);

    document.querySelector(".chat-main").classList.remove("chat-start");
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}


// =====================================
// IMPORTER ET INDEXER UN PDF
// =====================================

async function uploadPDF(file, statusMessage) {
    try {
        statusMessage.querySelector(".message-content").textContent =
            "⏳ Importation et indexation du PDF en cours...";

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/courses", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Impossible d'importer le PDF."
            );
        }

        // Enregistrer l'identifiant du cours
        localStorage.setItem("course_id", data.course_id);

        statusMessage.querySelector(".message-content").textContent =
            `✅ PDF indexé ! ${data.chunks_count} morceaux enregistrés.`;

        return data.course_id;

    } catch (error) {
        statusMessage.querySelector(".message-content").textContent =
            `❌ Erreur d'importation : ${error.message}`;

        throw error;
    }
}


// =====================================
// ENVOYER LA QUESTION AU CHATBOT
// =====================================

async function sendMessage() {
    const messageText = chatInput.value.trim();

    // Ne rien envoyer si aucune question n'est écrite
    if (!messageText) {
        chatInput.focus();
        return;
    }

    // Afficher la question de l'utilisateur
    addMessage("user-message", messageText);
    chatInput.value = "";

    // Désactiver temporairement l'envoi
    sendButton.disabled = true;

    try {
        // Si un PDF est en attente, l'indexer d'abord
        if (pendingPdf) {
            const fileToUpload = pendingPdf;
            const statusMessage = pendingPdfStatusMessage;

            const courseId = await uploadPDF(
                fileToUpload,
                statusMessage
            );

            // Effacer le PDF en attente après indexation réussie
            pendingPdf = null;
            pendingPdfStatusMessage = null;

            console.log("Cours indexé :", courseId);
        }

        // Récupérer l'identifiant du cours
        const courseId = localStorage.getItem("course_id");

        // Envoyer la question à Flask
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: messageText,
                course_id: courseId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Erreur du serveur");
        }

        // Afficher la réponse du chatbot
        addMessage("ai-message", data.response);

    } catch (error) {
        console.error("Erreur :", error);

        addMessage(
            "ai-message",
            `Erreur : ${error.message}`
        );
    } finally {
        sendButton.disabled = false;
        chatInput.focus();
    }
}


// =====================================
// DÉTECTER UN PDF COLLÉ AVEC CTRL + V
// =====================================

chatInput.addEventListener("paste", function(event) {
    const clipboard = event.clipboardData;

    if (!clipboard) return;

    let pdfFile = null;

    for (const item of clipboard.items) {
        if (item.kind !== "file") continue;

        const file = item.getAsFile();

        if (
            file &&
            (
                file.type === "application/pdf" ||
                file.name.toLowerCase().endsWith(".pdf")
            )
        ) {
            pdfFile = file;
            break;
        }
    }

    // Si aucun PDF n'est détecté, le collage normal continue
    if (!pdfFile) return;

    event.preventDefault();

    // Conserver le PDF sans lancer immédiatement l'importation
    pendingPdf = pdfFile;

    // Afficher un message d'attente
    if (pendingPdfStatusMessage) {
        pendingPdfStatusMessage.querySelector(".message-content").textContent =
            `📄 PDF remplacé : ${pdfFile.name}. Écris ta question puis envoie.`;
    } else {
        pendingPdfStatusMessage = addMessage(
            "ai-message",
            `📄 PDF prêt : ${pdfFile.name}. Écris ta question puis clique sur Envoyer.`
        );
    }

    chatInput.focus();
});


// =====================================
// ÉVÉNEMENTS DU CHAT
// =====================================

sendButton.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});