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

function extractDeadline(text) {
  const lower = text.toLowerCase();

  // 1) Formats explicites: "avant juin 2025", "fin avril", "pour janvier", etc.
  const explicitDate = lower.match(
    /(avant|pour|fin|début|d'ici)\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|\d{4})/
  );
  if (explicitDate && explicitDate[0]) {
    return explicitDate[0];
  }

  // 2) Formats relatifs: "dans 3 mois", "avant 2 semaines", "sous 6 semaines"
  const relativeDate = lower.match(
    /(dans|avant|sous|d'ici)\s+(\d+)\s*(jours?|semaines?|mois|ans?)/
  );
  if (relativeDate && relativeDate[0]) {
    return relativeDate[0];
  }

  // 3) Formats du type "3 mois", "90 jours" *mais seulement si* on parle bien d’échéance
  const looseRelative = lower.match(/(\d+)\s*(jours?|semaines?|mois|ans?)/);
  if (
    looseRelative &&
    (lower.includes("livraison") ||
      lower.includes("deadline") ||
      lower.includes("rendu"))
  ) {
    return "avant " + looseRelative[0];
  }

  return null;
}


function buildMissionFromText(text) {
  const lower = text.toLowerCase();

  // ---------- Extraction intelligente ----------
  const deadline = extractDeadline(text);

  const budgetMatch = lower.match(
    /(budget|environ|près de|aux alentours de|entre)\s*([0-9\s.,]+(?:k|k€|€|euros)?)/i
  );




  const isRefonte = lower.includes("refonte") || lower.includes("refondre");
  const isBackoffice = lower.includes("backoffice") || lower.includes("back-office");
  const wantsDashboard = lower.includes("tableau de bord") || lower.includes("dashboard");
  const wantsAuth = lower.includes("auth") || lower.includes("login") || lower.includes("sécurité");

  const bullets = [];

  bullets.push(`Demande exprimée par le client : "${text}".`);

  // Type de projet
  if (isRefonte && isBackoffice) bullets.push("Projet identifié : refonte du backoffice existant.");
  else if (isRefonte) bullets.push("Projet identifié : refonte d’un système existant.");
  else if (isBackoffice) bullets.push("Projet identifié : création ou amélioration d’un backoffice interne.");
  else bullets.push("Type de projet à clarifier (aucun mot-clé explicite détecté).");

  // Fonctionnalités
  if (wantsDashboard) bullets.push("Besoin détecté : tableau de bord / reporting.");
  if (wantsAuth) bullets.push("Besoin détecté : connexion sécurisée / gestion des accès.");

  // Deadline
  if (deadline) {
    bullets.push(`Deadline repérée : "${deadline}". Planification à valider avec le client.`);
  } else {
    bullets.push("Aucune deadline claire détectée. Une clarification est nécessaire.");
  }

    // --- Budget ---
  let budgetText = null;
  if (budgetMatch && budgetMatch[2] && /\d/.test(budgetMatch[2])) {
    budgetText = budgetMatch[2].trim();
  }

  if (budgetText) {
    bullets.push(`Budget détecté : "~${budgetText}". Validation requise.`);
  } else if (lower.includes("budget")) {
    bullets.push(
      "Le client mentionne un budget, mais sans montant précis. À clarifier."
    );
  } else {
    bullets.push(
      "Budget non mentionné – prévoir estimation et fourchettes de coûts."
    );
  }

  // Résumé dynamique
  const summaryParts = [];
  if (isRefonte) summaryParts.push("refonte");
  if (isBackoffice) summaryParts.push("backoffice");
  if (deadline) summaryParts.push(`délai : ${deadline}`);
  if (budgetMatch) summaryParts.push(`budget estimé : ${budgetMatch[2]}`);

  return {
    summary: summaryParts.length
      ? `Projet identifié : ${summaryParts.join(", ")}.`
      : "Projet exprimé mais informations clés manquantes.",
    extracted: {
      deadline,
      budget: budgetMatch ? budgetMatch[2].trim() : null,
      projectType: summaryParts.join(", ") || "Non déterminé"
    },
    bullets,
  };
}


app.listen(port, () => {
  console.log(`Serveur API mission à l'écoute sur http://localhost:${port}`);
});


