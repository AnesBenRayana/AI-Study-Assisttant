
const chatInput = document.querySelector(".chat-input");
const sendButton = document.querySelector(".send-button");
const chatMessages = document.querySelector(".chat-messages");

// =====================================
// AGRANDIR AUTOMATIQUEMENT LE CHAMP
// =====================================

const MAX_INPUT_HEIGHT = 200;

function autoResizeInput() {
    chatInput.style.height = "auto";

    const newHeight = Math.min(
        chatInput.scrollHeight,
        MAX_INPUT_HEIGHT
    );

    chatInput.style.height = `${newHeight}px`;
    chatInput.style.overflowY =
        chatInput.scrollHeight > MAX_INPUT_HEIGHT ? "auto" : "hidden";
}

chatInput.addEventListener("input", autoResizeInput);

// =====================================
// ÉTAT DE LA SESSION
// =====================================

let activeCourseId = null;
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

    // Formater les réponses de l'IA en Markdown.
    // DOMPurify nettoie le HTML généré pour la sécurité.
    if (
        type === "ai-message" &&
        typeof window.marked !== "undefined" &&
        typeof window.DOMPurify !== "undefined"
    ) {
        const html = window.marked.parse(String(text ?? ""));
        content.innerHTML = window.DOMPurify.sanitize(html);
    } else {
        // Les messages utilisateur restent du texte brut.
        content.textContent = String(text ?? "");
    }

    message.appendChild(content);
    chatMessages.appendChild(message);

    document.querySelector(".chat-main")?.classList.remove("chat-start");

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

// =====================================
// IMPORTER ET INDEXER UN PDF
// =====================================

async function uploadPDF(file, statusMessage) {
    // Un nouveau document remplace le cours actif.
    const previousCourseId = activeCourseId;
    activeCourseId = null;

    try {
        if (statusMessage?.isConnected) {
            statusMessage.querySelector(".message-content").textContent =
                "⏳ Importation et analyse du document en cours...";
        }

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

        // Le nouveau cours devient actif.
        activeCourseId = data.course_id;

        console.log("Cours indexé :", activeCourseId);
        console.log("Nombre de chunks :", data.chunks_count);

        if (statusMessage?.isConnected) {
            statusMessage.remove();
        }

        // Supprimer l'ancien cours pour éviter de conserver
        // ses chunks dans ChromaDB.
        if (previousCourseId && previousCourseId !== activeCourseId) {
            try {
                await fetch("/api/chat/end-session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        course_id: previousCourseId
                    })
                });
            } catch (cleanupError) {
                console.error(
                    "Impossible de supprimer l'ancien cours :",
                    cleanupError
                );
            }
        }

        return activeCourseId;

    } catch (error) {
        // Ne pas réutiliser l'ancien cours si l'importation échoue.
        activeCourseId = null;

        if (statusMessage?.isConnected) {
            statusMessage.querySelector(".message-content").textContent =
                `❌ Échec de l'importation : ${error.message}`;
        }

        throw error;
    }
}

// =====================================
// ENVOYER UNE DEMANDE AU CHATBOT
// =====================================

async function sendMessage() {
    const messageText = chatInput.value.trim();

    if (!messageText) {
        chatInput.focus();
        return;
    }

    addMessage("user-message", messageText);

    chatInput.value = "";
    autoResizeInput();
    sendButton.disabled = true;

    let uploadStatusMessage = null;

    try {
        // 1. Importer le PDF en attente, s'il existe.
        if (pendingPdf) {
            const fileToUpload = pendingPdf;
            uploadStatusMessage = pendingPdfStatusMessage;

            // Éviter de réimporter le même fichier.
            pendingPdf = null;
            pendingPdfStatusMessage = null;

            await uploadPDF(fileToUpload, uploadStatusMessage);
        }

        // 2. Exiger un PDF avant toute question.
        if (!activeCourseId) {
            addMessage(
                "ai-message",
                "📄 **Aucun document n'a été importé.**\n\n" +
                "Veuillez importer un fichier PDF pour commencer. " +
                "Je pourrai ensuite expliquer le cours, répondre à vos questions " +
                "et générer des quiz ou des exercices à partir de son contenu."
            );
            return;
        }

        // 3. Envoyer la question et l'identifiant du cours.
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: messageText,
                course_id: activeCourseId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Une erreur est survenue."
            );
        }

        // 4. Afficher la réponse avec le formatage Markdown.
        addMessage("ai-message", data.response);

    } catch (error) {
        console.error("Erreur du chatbot :", error);

        // uploadPDF affiche déjà l'erreur dans son message de statut.
        if (!uploadStatusMessage?.isConnected) {
            addMessage(
                "ai-message",
                `❌ ${error.message}`
            );
        }

    } finally {
        sendButton.disabled = false;
        chatInput.focus();
    }
}

// =====================================
// DÉTECTER UN PDF COLLÉ AVEC CTRL + V
// =====================================

chatInput.addEventListener("paste", function (event) {
    const clipboard = event.clipboardData;

    if (!clipboard) {
        return;
    }

    let pdfFile = null;
    let containsFile = false;

    for (const item of clipboard.items) {
        if (item.kind !== "file") {
            continue;
        }

        containsFile = true;

        const file = item.getAsFile();

        if (!file) {
            continue;
        }

        if (
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf")
        ) {
            pdfFile = file;
            break;
        }
    }

    // Ne pas interrompre le collage de texte ordinaire.
    if (!containsFile) {
        return;
    }

    event.preventDefault();

    if (!pdfFile) {
        addMessage(
            "ai-message",
            "❌ **Fichier non accepté.**\n\n" +
            "Veuillez importer un document au format PDF."
        );
        return;
    }

    pendingPdf = pdfFile;

    const statusText =
        `📄 Document prêt : ${pdfFile.name}. ` +
        "Envoyez votre demande pour commencer.";

    if (pendingPdfStatusMessage?.isConnected) {
        pendingPdfStatusMessage.querySelector(".message-content").textContent =
            statusText;
    } else {
        pendingPdfStatusMessage = addMessage(
            "ai-message",
            statusText
        );
    }

    chatInput.focus();
});

// =====================================
// ENVOYER AVEC LE BOUTON
// =====================================

sendButton.addEventListener("click", sendMessage);

// =====================================
// ENTRÉE = ENVOYER
// SHIFT + ENTRÉE = NOUVELLE LIGNE
// =====================================


chatInput.addEventListener("keydown", function (event) {
    // Entrée : envoyer le message
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }

    // Shift + Entrée : laisser le navigateur
    // insérer une nouvelle ligne normalement.
});

// =====================================
// TERMINER LA SESSION À LA FERMETURE
// OU AU RECHARGEMENT DE LA PAGE
// =====================================

window.addEventListener("pagehide", function () {
    if (!activeCourseId) {
        return;
    }

    const courseIdToDelete = activeCourseId;
    activeCourseId = null;

    // Demander au serveur de supprimer les chunks du cours.
    // keepalive permet à la requête de continuer pendant
    // la fermeture ou le rechargement de la page.
    fetch("/api/chat/end-session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            course_id: courseIdToDelete
        }),
        keepalive: true
    }).catch((error) => {
        console.error(
            "Impossible de demander le nettoyage de la session :",
            error
        );
    });
});