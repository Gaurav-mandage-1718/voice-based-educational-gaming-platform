import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parsePhoneNumberAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./PhoneNumberMemoryGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const PREVIEW_TIME = 2000;
const GAME_ID = 13;

const fakeProfiles = [
  { name: "John Doe", role: "Chief Executive Officer" },
  { name: "Kohel McKay", role: "Reporter" },
  { name: "Emma Stone", role: "Designer" },
  { name: "Liam Scott", role: "Teacher" },
  { name: "Olivia Reed", role: "Doctor" },
  { name: "Noah James", role: "Pilot" },
  { name: "Ava Brooks", role: "Manager" }
];

function getDigitLength(round) {
  if (round <= 2) return 3;
  if (round <= 4) return 4;
  if (round <= 6) return 5;
  return 6;
}

function generateNumberString(length) {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += String(Math.floor(Math.random() * 10));
  }
  return result;
}

function buildRound(round) {
  const profile = fakeProfiles[Math.floor(Math.random() * fakeProfiles.length)];
  const digitLength = getDigitLength(round);
  const number = generateNumberString(digitLength);

  return {
    profile,
    number,
    digitLength
  };
}

function PhoneNumberMemoryGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(buildRound(1));
  const [phase, setPhase] = useState("preview");
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("phone-number-memory-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Memorize the number");
  const [history, setHistory] = useState([]);
  const [voiceError, setVoiceError] = useState("");

  const rankLabel = useMemo(() => {
    if (score >= 70) return "A";
    if (score >= 50) return "B";
    if (score >= 30) return "C";
    return "-";
  }, [score]);

  const saveGameScore = useCallback(async () => {
    if (scoreSaved || score <= 0) return;

    try {
      await api.post("/user/play", {
        gameId: GAME_ID,
        score
      });
      setScoreSaved(true);
    } catch (error) {
      console.error("Failed to save score:", error);
    }
  }, [score, scoreSaved]);

  const finishGame = useCallback(() => {
    speakText("Game over");
    setScreen("review");
  }, []);

  const goToNextQuestion = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      finishGame();
      return;
    }

    const nextRound = round + 1;
    setRound(nextRound);
    setQuestion(buildRound(nextRound));
    setPhase("preview");
    setSpokenText("");
    setVoiceError("");
    setFeedback("Memorize the number");
  }, [round, finishGame]);

  const submitAnswer = useCallback(
    (value) => {
      const normalizedValue = parsePhoneNumberAnswer(value);
      const isCorrect = normalizedValue === question.number;

      setHistory((prev) => [
        ...prev,
        {
          profileName: question.profile.name,
          correctAnswer: question.number,
          userAnswer: normalizedValue || String(value).trim(),
          isCorrect
        }
      ]);

      if (isCorrect) {
        setFeedback("Correct ✅");
        speakText("Correct");
        setScore((prev) => prev + 10);
      } else {
        setFeedback("Wrong ❌");
        speakText("Wrong. Please try again.");
      }

      window.setTimeout(() => {
        goToNextQuestion();
      }, 900);
    },
    [question, goToNextQuestion]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalizedTranscript = parsePhoneNumberAnswer(transcript);
      setSpokenText(normalizedTranscript || transcript);
      setVoiceError("");
      submitAnswer(transcript);
    },
    [submitAnswer]
  );

 const handleVoiceError = useCallback((errorMessage) => {
  setVoiceError(errorMessage);

  const message = errorMessage.toLowerCase();

  if (message.includes("network")) {
    setFeedback("Speech service problem. Check internet and try again.");
    speakText("Speech service problem. Please try again.");
    return;
  }

  if (message.includes("no speech")) {
    setFeedback("No speech detected. Please speak clearly and try again.");
    speakText("No speech detected. Please try again.");
    return;
  }

  if (message.includes("permission") || message.includes("not available")) {
    setFeedback("Microphone problem. Please check microphone access.");
    speakText("Microphone problem. Please check microphone access.");
    return;
  }

  setFeedback("Could not hear clearly. Please try again.");
  speakText("Voice not clear. Please try again.");
}, []);


  const { isSupported, isListening, startListening, stopListening } =
    useSpeechRecognition({
      onResult: handleVoiceResult,
      onError: handleVoiceError,
      autoRestart: false
    });

  useEffect(() => {
    if (screen !== "playing") return;

    if (timeLeft <= 0) {
      finishGame();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [screen, timeLeft, finishGame]);

  useEffect(() => {
    if (screen !== "playing" || phase !== "preview") return;

    const previewTimer = window.setTimeout(() => {
      setPhase("answer");
      setFeedback("Speak the number");
      speakText("Speak the number");
    }, PREVIEW_TIME);

    return () => window.clearTimeout(previewTimer);
  }, [screen, phase, question]);

  useEffect(() => {
    if (screen === "review" && score > bestScore) {
      setBestScore(score);
      localStorage.setItem("phone-number-memory-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    if (screen === "review") {
      saveGameScore();
    }
  }, [screen, saveGameScore]);

  const handleStartGame = () => {
    setScreen("playing");
    setRound(1);
    setQuestion(buildRound(1));
    setPhase("preview");
    setScore(0);
    setScoreSaved(false);
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setVoiceError("");
    setFeedback("Memorize the number");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  if (!isSupported) {
    return (
      <div className="phone-screen">
        <div className="phone-card-simple">
          <h2>Phone Number Memory Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="phone-screen intro-screen">
        <div className="phone-overlay"></div>

        <div className="top-icons">
          <button className="circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="intro-card phone-intro-card">
          <div className="phone-card-preview">
            <div className="phone-avatar"></div>
            <p className="phone-name">John Doe</p>
            <p className="phone-role">Chief Executive Officer</p>
            <div className="phone-number-preview">3214</div>
          </div>

          <p className="section-label">MEMORY GAME</p>
          <h1 className="game-title">Phone number memory</h1>

          <div className="stats-row">
            <div className="info-box">
              <span className="info-label">BEST SCORE</span>
              <strong>{bestScore || "-"}</strong>
            </div>

            <div className="info-box">
              <span className="info-label">RANK</span>
              <strong>{rankLabel}</strong>
            </div>
          </div>

          <div className="skills-box">
            <p className="section-label">SKILLS TRAINED</p>

            <div className="skill-item">
              <div className="skill-icon">#</div>
              <div>
                <h3>Memory</h3>
                <p>Memorize the number quickly and say it back using your voice</p>
              </div>
            </div>
          </div>

          <button className="start-btn" onClick={handleStartGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="phone-screen review-screen">
        <div className="review-header">
          <button className="back-text-btn" onClick={() => navigate("/user")}>
            ←
          </button>
          <h2>Review performance</h2>
        </div>

        <div className="review-summary">
          <div className="summary-pill">Score: {score}</div>
          <div className="summary-pill">
            Correct: {history.filter((item) => item.isCorrect).length}
          </div>
          <div className="summary-pill">Rounds: {history.length}</div>
        </div>

        <div className="review-list">
          {history.map((item, index) => (
            <div className="review-row" key={`${item.profileName}-${index}`}>
              <div className={`review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="review-content">
                <p className="review-question">{item.profileName}</p>
                <p className="review-answer-line">
                  <span className="correct-answer">{item.correctAnswer} ✓</span>
                  {!item.isCorrect && (
                    <span className="wrong-answer"> {item.userAnswer} ✕</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button className="start-btn review-btn" onClick={handleRetryGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="phone-screen play-screen">
      <div className="top-game-bar">
        <button className="circle-btn small" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="progress-bar">
          <span>{String(timeLeft).padStart(2, "0")}s</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>

        <button className="circle-btn small hint-btn">?</button>
      </div>

      <div className="memory-stage">
        <div className="memory-instruction">
          {phase === "preview" ? "Memorize the phone number" : "Speak the phone number"}
        </div>

        <div className="memory-card">
          <div className="memory-card-glow"></div>
          <div className="phone-avatar"></div>
          <p className="memory-name">{question.profile.name}</p>
          <p className="memory-role">{question.profile.role}</p>

          <div className="memory-number">
            {phase === "preview" ? question.number : "•".repeat(question.digitLength)}
          </div>
        </div>
      </div>

      <div className="voice-panel">
        <div className="spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="voice-actions">
          <button
            className={`voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
            disabled={phase !== "answer"}
          >
            {isListening ? "Listening..." : "Speak Answer"}
          </button>

          <button
            className="retry-btn"
            onClick={() => {
              setSpokenText("");
              setVoiceError("");
              setFeedback(phase === "preview" ? "Memorize the number" : "Try again");
            }}
          >
            Retry
          </button>
        </div>

        <div
          className={`feedback-text ${
            feedback.includes("Correct") ? "good" : "warn"
          }`}
        >
          {feedback}
        </div>

        {voiceError && <div className="voice-error">{voiceError}</div>}
      </div>
    </div>
  );
}

export default PhoneNumberMemoryGame;
