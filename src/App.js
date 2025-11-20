import React, { useState, useRef } from "react";
import "./App.css";
import DemoCard from "./components/DemoCard";

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
    recognition.continuous = true;
    recognition.interimResults = true;

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
    if (recognition) recognition.stop();
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
    <div className="app-root">
      <header className="app-header">
        <h1>Mission Recorder</h1>
        <p className="tag">Transforme la parole en fiche mission — démo</p>
      </header>

      <main className="container">
        <section className="controls">
          <div className="control-row">
            {!listening ? (
              <button className="btn primary" onClick={startListening}>
                🎙️ Commencer
              </button>
            ) : (
              <button className="btn warn" onClick={stopListening}>
                ⏹️ Arrêter
              </button>
            )}

            <button
              className="btn"
              onClick={sendTextToBackend}
              disabled={!transcription || loading}
            >
              ➡️ Générer la fiche
            </button>
            {loading && <span className="muted">Analyse en cours…</span>}
          </div>

          <div className="transcript">
            <h3>Transcription en direct</h3>
            <div className="transcript-box">
              {transcription || "Parle maintenant — le texte s'affichera ici..."}
            </div>
          </div>
        </section>

        <aside className="result">
          <h3>Fiche mission</h3>
          {mission ? (
            <DemoCard mission={mission} />
          ) : (
            <div className="empty">Aucune fiche générée (encore).</div>
          )}
        </aside>
      </main>

      <footer className="app-footer">
        <small>Démo — API locale attendue sur http://localhost:3001</small>
      </footer>
    </div>
  );
}

export default App;
