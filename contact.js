// js/contact.js
const form = document.getElementById("contactForm");
const feedback = document.getElementById("formFeedback");

const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const topic = document.getElementById("topic");
const date = document.getElementById("date");
const people = document.getElementById("people");
const message = document.getElementById("message");

const errName = document.getElementById("errName");
const errEmail = document.getElementById("errEmail");
const errPhone = document.getElementById("errPhone");
const errTopic = document.getElementById("errTopic");
const errDate = document.getElementById("errDate");
const errPeople = document.getElementById("errPeople");
const errMessage = document.getElementById("errMessage");

form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();

    const result = validate();
    if (!result.ok) {
        showFeedback("Controleer de velden hierboven.", "bad");
        return;
    }

    showFeedback("Bericht succesvol verstuurd (simulatie). We nemen snel contact op!", "ok");
    form.reset();
});

function validate() {
    let ok = true;

    if (!String(fullName.value || "").trim() || String(fullName.value).trim().length < 2) {
        errName.textContent = "Vul een geldige naam in (min. 2 tekens).";
        ok = false;
    }

    const emailVal = String(email.value || "").trim();
    if (!emailVal || !isValidEmail(emailVal)) {
        errEmail.textContent = "Vul een geldig e-mailadres in.";
        ok = false;
    }

    const phoneVal = String(phone.value || "").trim();
    if (phoneVal && !isValidPhone(phoneVal)) {
        errPhone.textContent = "Telefoonnummer lijkt ongeldig (gebruik bv. +32... of 04...).";
        ok = false;
    }

    if (!String(topic.value || "").trim()) {
        errTopic.textContent = "Kies een onderwerp.";
        ok = false;
    }

    const msg = String(message.value || "").trim();
    if (msg.length < 10) {
        errMessage.textContent = "Je bericht is te kort (min. 10 tekens).";
        ok = false;
    }

    // Conditional validation: booking
    if (topic.value === "booking") {
        const dateVal = String(date.value || "").trim();
        const peopleVal = Number(people.value);

        if (!dateVal) {
            errDate.textContent = "Kies een datum voor de boeking.";
            ok = false;
        }

        if (!Number.isInteger(peopleVal) || peopleVal < 1) {
            errPeople.textContent = "Vul een geldig aantal personen in (min. 1).";
            ok = false;
        }
    }

    return { ok };
}

function clearErrors() {
    errName.textContent = "";
    errEmail.textContent = "";
    errPhone.textContent = "";
    errTopic.textContent = "";
    errDate.textContent = "";
    errPeople.textContent = "";
    errMessage.textContent = "";
    feedback.textContent = "";
    feedback.classList.remove("notice--ok", "notice--bad", "notice--warn");
}

function showFeedback(text, type) {
    feedback.textContent = text || "";
    feedback.classList.remove("notice--ok", "notice--bad", "notice--warn");
    if (type === "ok") feedback.classList.add("notice--ok");
    if (type === "bad") feedback.classList.add("notice--bad");
    if (type === "warn") feedback.classList.add("notice--warn");
}

function isValidEmail(value) {
    // Simple, safe pattern for student assignment
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
    // Allow +, digits, spaces, /, -
    return /^[+]?[\d\s\-\/]{8,20}$/.test(value);
}
