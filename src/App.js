import React, { useRef, useState } from "react";

function App() {
  const [recording, setRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      sendAudio(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendAudio = async (blob) => {
    setLoading(true);
    setTranscription("");
    setMission(null);

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const response = await fetch(
        `http://localhost:3001/api/transcribe`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        console.error("Erreur HTTP:", response.status);
        return;
      }

      const data = await response.json();
      setTranscription(data.transcription || "");
      setMission(data.mission || null);
    } catch (e) {
      console.error("Erreur fetch:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>Enregistrement client → Fiche mission</h1>

      <div style={{ marginBottom: 20 }}>
        {!recording ? (
          <button onClick={startRecording}>🎙️ Démarrer l'enregistrement</button>
        ) : (
          <button onClick={stopRecording}>⏹️ Arrêter</button>
        )}
      </div>

      {loading && <p>Analyse en cours...</p>}

      <div style={{ marginBottom: 20 }}>
        <h2>Transcription brute</h2>
        <div
          style={{
            minHeight: 80,
            border: "1px solid #ccc",
            padding: 10,
            borderRadius: 4,
            whiteSpace: "pre-wrap",
          }}
        >
          {transcription || "En attente de transcription..."}
        </div>
      </div>

      <div>
        <h2>Fiche mission (bullet points)</h2>
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
          <p>La fiche mission sera générée après l'analyse de l'audio.</p>
        )}
      </div>
    </div>
  );
}

export default App;
