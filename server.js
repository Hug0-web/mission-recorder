const express = require("express");
const cors = require("cors");

const app = express();
const port = 3001;

// Autoriser ton front React
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// Pour lire le JSON envoyé par le front
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API mission OK");
});

// Route qui reçoit le texte et renvoie une fiche mission
app.post("/api/mission", (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res
      .status(400)
      .json({ error: "Aucun texte fourni pour générer la mission." });
  }

  console.log("Texte reçu pour mission :", text);

  const mission = buildMissionFromText(text);

  res.json({ mission });
});

function buildMissionFromText(text) {
  const lower = text.toLowerCase();

  /** ---- 1) Regex d’extraction ---- **/

  // Extraction deadline → on capture tout le morceau utile
  const deadlineMatch = lower.match(/(avant|fin|début|d'ici|pour|délai|livraison)\s*([a-zéûà]+|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4})/i);

  // Extraction budget → différents formats possibles (euros, k€, milliers)
  const budgetMatch = lower.match(/(?:budget|environ|à peu près|entre)\s*([0-9\s.,]+(?:k|k€|€|euros)?)/i);

  // Détection du type
  const isRefonte = lower.includes("refonte") || lower.includes("refondre");
  const isBackoffice = lower.includes("backoffice") || lower.includes("back-office");
  const wantsDashboard = lower.includes("tableau de bord") || lower.includes("dashboard");
  const wantsAuth = lower.includes("auth") || lower.includes("login") || lower.includes("sécurité");


  /** ---- 2) Construction des bullet points ---- **/
  const bullets = [];

  bullets.push(`Demande exprimée par le client : "${text}".`);

  // Nature du projet
  if (isRefonte && isBackoffice) {
    bullets.push("Projet identifié : refonte d'un backoffice existant.");
  } else if (isRefonte) {
    bullets.push("Projet identifié : refonte d’un système existant.");
  } else if (isBackoffice) {
    bullets.push("Projet identifié : création ou amélioration d’un backoffice interne.");
  } else {
    bullets.push("Type de projet à clarifier (aucun mot-clé explicite détecté).");
  }

  // Fonctionnalités détectées
  if (wantsDashboard) bullets.push("Besoin détecté : ajout ou amélioration d’un tableau de bord.");
  if (wantsAuth) bullets.push("Besoin détecté : authentification / gestion des accès.");

  // Deadline
  if (deadlineMatch) {
    bullets.push(
      `Deadline mentionnée par le client : "${deadlineMatch[0]}". Une validation et un planning précis seront nécessaires.`
    );
  } else {
    bullets.push("Aucune deadline précise détectée. Une clarification sur les échéances sera nécessaire.");
  }

  // Budget
  if (budgetMatch) {
    bullets.push(
      `Budget potentiel détecté : "~${budgetMatch[1].trim()}". À confirmer avec le client.`
    );
  } else {
    bullets.push("Aucun budget explicite détecté. Prévoir estimation et fourchettes de coûts.");
  }

  let summaryParts = [];

  if (isRefonte) summaryParts.push("refonte");
  if (isBackoffice) summaryParts.push("backoffice");
  if (deadlineMatch) summaryParts.push(`délai cible "${deadlineMatch[0]}"`);
  if (budgetMatch) summaryParts.push(`budget estimé "${budgetMatch[1]}"`);

  const summary = summaryParts.length
    ? `Projet détecté : ${summaryParts.join(", ")}.`
    : `Projet exprimé mais détails encore flous.`;

  return {
    summary,
    extracted: {
      deadline: deadlineMatch ? deadlineMatch[0] : null,
      budget: budgetMatch ? budgetMatch[1].trim() : null,
      type: isRefonte || isBackoffice ? summaryParts.join(", ") : "non déterminé",
    },
    bullets,
  };
}

app.listen(port, () => {
  console.log(`Serveur API mission à l'écoute sur http://localhost:${port}`);
});


