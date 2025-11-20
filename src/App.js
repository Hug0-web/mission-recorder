import React, { useEffect, useRef, useState } from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";

const MIME_PRIORITY = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4", extension: "m4a" },
  { mimeType: "audio/aac", extension: "aac" },
  { mimeType: "audio/mpeg", extension: "mp3" },
];

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [loadingMission, setLoadingMission] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [mission, setMission] = useState(null);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioUrlRef = useRef(null);
  const recordingFormatRef = useRef({ mimeType: "audio/webm", extension: "webm" });

  const updateAudioUrl = (nextUrl) => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (nextUrl) {
      audioUrlRef.current = nextUrl;
    }
    setAudioUrl(nextUrl);
  };

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = {};
      if (typeof window !== "undefined" && window.MediaRecorder) {
        const supported = MIME_PRIORITY.find((candidate) =>
          window.MediaRecorder.isTypeSupported
            ? window.MediaRecorder.isTypeSupported(candidate.mimeType)
            : false
        );
        if (supported) {
          options.mimeType = supported.mimeType;
          recordingFormatRef.current = supported;
        } else {
          recordingFormatRef.current = MIME_PRIORITY[0];
        }
      }

      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      streamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recordingFormatRef.current.mimeType,
        });
        chunksRef.current = [];
        setAudioBlob(blob);
        updateAudioUrl(URL.createObjectURL(blob));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setTranscription("");
      setMission(null);
      setAudioBlob(null);
      updateAudioUrl(null);
    } catch (err) {
      console.error("Erreur MediaRecorder:", err);
      setError(
        "Impossible d'accéder au micro. Vérifie les permissions navigateur."
      );
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  };

  const transcribeRecording = async () => {
    if (!audioBlob) {
      setError("Aucun enregistrement à transcrire. Lance un enregistrement.");
      return;
    }

    setTranscribing(true);
    setError(null);

    const formData = new FormData();
    formData.append(
      "audio",
      audioBlob,
      `enregistrement.${recordingFormatRef.current.extension}`
    );

    try {
      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errPayload = await response.json();
          throw new Error(errPayload.error || "Erreur de transcription.");
        }
        const text = await response.text();
        throw new Error(text || "Erreur de transcription.");
      }

      const data = await response.json();
      setTranscription(data.transcription || "");
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err.message || "Transcription impossible.");
    } finally {
      setTranscribing(false);
    }
  };

  const sendTextToBackend = async () => {
    if (!transcription) return;

    setLoadingMission(true);
    setMission(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/mission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcription }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errPayload = await response.json();
          throw new Error(errPayload.error || "Erreur côté serveur.");
        }
        const text = await response.text();
        throw new Error(text || "Erreur côté serveur.");
      }

      const data = await response.json();
      setMission(data.mission || null);
    } catch (err) {
      console.error("Mission error:", err);
      setError(err.message || "Impossible de contacter le serveur.");
    } finally {
      setLoadingMission(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>Client → Fiche mission (Whisper)</h1>

      <p>
        1. Clique sur <b>“Démarrer l'enregistrement”</b> et laisse ton client parler. <br />
        2. Clique sur <b>“Arrêter l'enregistrement”</b>. <br />
        3. Clique sur <b>“Transcrire l'enregistrement”</b> pour Whisper. <br />
        4. Clique sur <b>“Générer la fiche mission”</b>.
      </p>

      {error && (
        <div
          style={{
            background: "#ffe5e5",
            color: "#a40000",
            padding: "10px 12px",
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #ffb0b0",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {isRecording ? (
          <button onClick={stopRecording}>⏹️ Arrêter l'enregistrement</button>
        ) : (
          <button onClick={startRecording}>🎙️ Démarrer l'enregistrement</button>
        )}
        <button
          onClick={transcribeRecording}
          disabled={!audioBlob || transcribing}
        >
          {transcribing ? "⏳ Transcription en cours…" : "📝 Transcrire l'enregistrement"}
        </button>
      </div>

      {audioUrl && (
        <div style={{ marginBottom: 20 }}>
          <h2>Pré-écoute</h2>
          <audio controls src={audioUrl} style={{ width: "100%" }} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h2>Transcription Whisper</h2>
        <div
          style={{
            minHeight: 140,
            border: "1px solid #ccc",
            padding: 10,
            borderRadius: 4,
            whiteSpace: "pre-wrap",
            background: "#fff",
          }}
        >
          {transcription || "Aucune transcription disponible pour l’instant."}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={sendTextToBackend}
          disabled={!transcription || loadingMission}
        >
          ➡️ Générer la fiche mission à partir du texte
        </button>
        {loadingMission && (
          <span style={{ marginLeft: 10 }}>Analyse en cours…</span>
        )}
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
