import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import "./ColorChangeGame.css";

const COLORS = ["red", "blue", "green", "pink", "yellow"];
const SHAPE = "circle";

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildQuestion() {
  const targetColor = randomFrom(COLORS);
  const currentColor = randomFrom(COLORS.filter((color) => color !== targetColor));

  return {
    targetColor,
    currentColor
  };
}

function normalizeColorAnswer(value) {
  const text = String(value || "").toLowerCase().trim();

  for (const color of COLORS) {
    if (text.includes(color)) {
      return color;
    }
  }

  return text;
}

function ColorShape({ color }) {
  return <div className={`color-shape ${SHAPE} ${color}`}></div>;
}

function ColorChangeGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [question, setQuestion] = useState(buildQuestion());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("color-change-fun-best") || 0)
  );
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Say the color name");
  const [voiceError, setVoiceError] = useState("");

  const label = useMemo(
    () => question.targetColor.charAt(0).toUpperCase() + question.targetColor.slice(1),
    [question.targetColor]
  );

  const nextQuestion = useCallback(() => {
    setQuestion(buildQuestion());
    setSpokenText("");
    setVoiceError("");
    setFeedback("Say the color name");
  }, []);

  const submitAnswer = useCallback(
    (value) => {
      const normalized = normalizeColorAnswer(value);
      const isCorrect = normalized === question.targetColor;

      if (isCorrect) {
        setScore((prev) => {
          const next = prev + 1;
          if (next > bestScore) {
            setBestScore(next);
            localStorage.setItem("color-change-fun-best", String(next));
          }
          return next;
        });

        setFeedback("Correct ✅");
        setQuestion((prev) => ({
          ...prev,
          currentColor: prev.targetColor
        }));

        window.setTimeout(() => {
          nextQuestion();
        }, 700);
      } else {
        setFeedback("Wrong ❌ Try again");
      }
    },
    [question, bestScore, nextQuestion]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalized = normalizeColorAnswer(transcript);
      setSpokenText(normalized || transcript);
      setVoiceError("");
      submitAnswer(transcript);
    },
    [submitAnswer]
  );

  const handleVoiceError = useCallback((message) => {
    setVoiceError(message);
    setFeedback("Could not hear clearly. Please try again.");
  }, []);

  const { isSupported, isListening, startListening, stopListening } =
    useSpeechRecognition({
      onResult: handleVoiceResult,
      onError: handleVoiceError,
      autoRestart: false
    });

  const startGame = () => {
    setScreen("playing");
    setScore(0);
    setSpokenText("");
    setVoiceError("");
    setFeedback("Say the color name");
    setQuestion(buildQuestion());
  };

  if (!isSupported) {
    return (
      <div className="fun-screen">
        <div className="fun-simple-card">
          <h2>Color Change Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="fun-screen">
        <div className="fun-card">
          <button className="fun-back-btn" onClick={() => navigate("/user")}>
            Back
          </button>

          <h1>Color Change Game</h1>
          <p className="fun-subtext">Fun game only</p>

          <div className="fun-preview-shapes">
            <ColorShape color="pink" />
          </div>

          <div className="fun-stats">
            <div>
              <span>Highest Score</span>
              <strong>{bestScore}</strong>
            </div>
            <div>
              <span>Control</span>
              <strong>Voice</strong>
            </div>
          </div>

          <p className="fun-description">
            The shape stays the same. Only the color changes by your voice command.
          </p>

          <button className="fun-start-btn" onClick={startGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fun-screen">
      <div className="fun-top-bar">
        <button className="fun-pause-btn" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="fun-progress-bar">
          <span>Fun Game</span>
          <span>Score: {score}</span>
          <span>Best: {bestScore}</span>
        </div>
      </div>

      <div className="fun-stage">
        <p className="fun-instruction">Change to {label}</p>
        <ColorShape color={question.currentColor} />
      </div>

      <div className="fun-voice-panel">
        <div className="fun-spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="fun-voice-actions">
          <button
            className={`fun-voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? "Listening..." : "Speak Color"}
          </button>

          <button
            className="fun-secondary-btn"
            onClick={() => {
              setSpokenText("");
              setVoiceError("");
              setFeedback("Try again");
            }}
          >
            Retry
          </button>

          <button
            className="fun-secondary-btn"
            onClick={nextQuestion}
          >
            Next
          </button>
        </div>

        <div className="fun-feedback">{feedback}</div>
        {voiceError && <div className="fun-error">{voiceError}</div>}
      </div>
    </div>
  );
}

export default ColorChangeGame;
