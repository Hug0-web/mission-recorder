import React, { useState, useRef } from "react";

function App() {
  const [listening, setListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  const initRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "La reconnaissance vocale n'est pas supportée sur ce navigateur. Utilise de préférence Chrome ou Edge."
      );
      return null;
    }

    

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;      // on continue tant qu’on ne stoppe pas
    recognition.interimResults = true;  // on voit les résultats au fur et à mesure

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript + " ";
      }
      setTranscription(finalText.trim());
    };

    recognition.onerror = (event) => {
      console.error("Erreur reconnaissance vocale:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      console.log("Reconnaissance vocale terminée");
      setListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startListening = () => {
    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = initRecognition();
      if (!recognition) return;
    }

    setTranscription("");
    setMission(null);
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
    }
  };

  const sendTextToBackend = async () => {
    if (!transcription) return;

    setLoading(true);
    setMission(null);

    try {
      const response = await fetch("http://localhost:3001/api/mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcription }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur API:", data);
        alert(data.error || "Erreur côté serveur");
        return;
      }

      setMission(data.mission || null);
    } catch (e) {
      console.error("Erreur fetch:", e);
      alert("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>Client → Fiche mission (Web Speech API)</h1>

      <p>
        1. Clique sur <b>“Commencer à écouter”</b> et laisse le client parler. <br />
        2. Clique sur <b>“Arrêter”</b>. <br />
        3. Clique sur <b>“Générer la fiche mission”</b>.
      </p>

      <div style={{ marginBottom: 20 }}>
        {!listening ? (
          <button onClick={startListening}>🎙️ Commencer à écouter</button>
        ) : (
          <button onClick={stopListening}>⏹️ Arrêter</button>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>Transcription en direct</h2>
        <div
          style={{
            minHeight: 120,
            border: "1px solid #ccc",
            padding: 10,
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            background: "#fff",
          }}
        >
          {transcription || "Parle, le texte va s'afficher ici..."}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={sendTextToBackend}
          disabled={!transcription || loading}
        >
          ➡️ Générer la fiche mission à partir du texte
        </button>
        {loading && <span style={{ marginLeft: 10 }}>Analyse en cours…</span>}
      </div>

      <div>
        <h2>Fiche mission générée</h2>
        {mission ? (
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: 10,
              background: "#fafafa",
            }}
          >
            {mission.summary && (
              <p>
                <strong>Résumé :</strong> {mission.summary}
              </p>
            )}
            {mission.bullets && (
              <ul>
                {mission.bullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p>Aucune fiche mission encore générée.</p>
        )}
      </div>
    </div>
  );
}

export default App;
