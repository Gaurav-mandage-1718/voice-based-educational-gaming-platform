import React, { useEffect, useRef, useState } from "react";

const words = ["apple", "banana", "cat", "dog", "orange", "school", "react"];

function VoiceWordMatch() {
  const [targetWord, setTargetWord] = useState("apple");
  const [spokenText, setSpokenText] = useState("");
  const [score, setScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("Click start and say the word.");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage("Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.toLowerCase().trim();
      setSpokenText(text);

      if (text === targetWord.toLowerCase()) {
        setScore((prev) => prev + 1);
        setMessage("Correct!");
        setTargetWord(words[Math.floor(Math.random() * words.length)]);
      } else {
        setMessage("Wrong word. Try again.");
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setMessage("Mic error. Please allow microphone access.");
    };

    recognitionRef.current = recognition;
  }, [targetWord]);

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setMessage("Stopped listening.");
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Voice Word Match</h2>
      <p>Say the word shown below.</p>

      <div style={{ margin: "20px 0", fontSize: "30px", fontWeight: "bold" }}>
        {targetWord}
      </div>

      <p>Spoken Text: {spokenText || "Nothing yet"}</p>
      <p>Score: {score}</p>
      <p>{message}</p>

      <button onClick={startListening} disabled={isListening}>
        Start Listening
      </button>
      <button onClick={stopListening} style={{ marginLeft: "10px" }}>
        Stop
      </button>
    </div>
  );
}

export default VoiceWordMatch;
