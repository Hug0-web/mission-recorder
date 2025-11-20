require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const vosk = require("vosk");
const { Readable } = require("stream");

const app = express();
const port = 3001;

// CORS pour ton front React (http://localhost:3000)
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.get("/", (req, res) => {
  res.send("API OK (Vosk)");
});

// --- Config Vosk ---
const MODEL_PATH = "models/vosk-model-small-fr"; // adapte au nom réel de ton dossier
const SAMPLE_RATE = 16000;

if (!fs.existsSync(MODEL_PATH)) {
  console.error("Model path does not exist:", MODEL_PATH);
  process.exit(1);
}

vosk.setLogLevel(0); // pour éviter le spam dans la console
const model = new vosk.Model(MODEL_PATH);

// --- Multer pour upload de fichiers ---
const upload = multer({ dest: "uploads/" });

// Helper : convertir un buffer en stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  const audioPath = req.file?.path;

  if (!audioPath) {
    return res.status(400).json({ error: "Aucun fichier audio reçu" });
  }

  console.log("FICHIER REÇU :", req.file);

  try {
    // On lit le fichier audio
    const audioBuffer = fs.readFileSync(audioPath);

    // ⚠️ Vosk attend du PCM mono 16kHz
    // Or ton navigateur envoie du webm/opus. Normalement, il faut passer par une étape de conversion
    // (ffmpeg) pour le mettre en PCM 16-bit 16kHz.
    // Pour un vrai projet il faudra ajouter cette étape.
    //
    // Ici je te donne la structure du code avec Vosk.
    // Je vais supposer que tu fournis déjà un WAV/PCM 16kHz.
    // (on pourra ajouter ffmpeg après si tu veux).

    const rec = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE });

    const stream = bufferToStream(audioBuffer);

    stream.on("data", (chunk) => {
      rec.acceptWaveform(chunk);
    });

    stream.on("end", () => {
      const result = rec.finalResult();
      rec.free();

      console.log("Résultat Vosk :", result);

      let text = "";
      try {
        const json = typeof result === "string" ? JSON.parse(result) : result;
        text = json.text || "";
      } catch (e) {
        console.error("Erreur parsing résultat Vosk :", e);
      }

      if (!text) {
        text = "[VOSK] Aucune transcription claire détectée.";
      }

      // --- Fiche mission simulée à partir du texte ---
      const mission = buildFakeMissionFromText(text);

      res.json({
        transcription: text,
        mission,
      });

      // On supprime le fichier temporaire
      fs.unlink(audioPath, () => {});
    });

    stream.on("error", (err) => {
      console.error("Erreur stream audio :", err);
      rec.free();
      fs.unlink(audioPath, () => {});
      res.status(500).json({ error: "Erreur lors du traitement audio" });
    });
  } catch (err) {
    console.error("Erreur dans /api/transcribe :", err);
    fs.unlink(audioPath, () => {});
    res.status(500).json({ error: "Erreur serveur pendant la transcription" });
  }
});

// Petit générateur de fiche mission "fake" basé sur le texte
function buildFakeMissionFromText(text) {
  if (!text || text.startsWith("[VOSK]")) {
    return {
      summary:
        "Aucune consigne claire détectée, la fiche mission devra être complétée manuellement.",
      bullets: [
        "Revoir la demande du client.",
        "Compléter les objectifs, contraintes et délais.",
      ],
    };
  }

  return {
    summary: `Synthèse automatique de la demande : ${text.slice(0, 120)}...`,
    bullets: [
      `Le client exprime le besoin suivant : "${text}".`,
      "Identifier les objectifs principaux du projet.",
      "Lister les contraintes (techniques, budget, délais).",
      "Définir les livrables attendus.",
    ],
  };
}

app.listen(port, () => {
  console.log(`API Vosk listening on port ${port}`);
});
