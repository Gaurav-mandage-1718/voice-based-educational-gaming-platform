import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseNumberAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import redJersey from "../../assets/games/fan-count/red.png";
import blueJersey from "../../assets/games/fan-count/blue.png";
import yellowJersey from "../../assets/games/fan-count/yellow.png";
import "./FanCountGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 14;

const COLOR_CONFIG = {
  red: {
    label: "Red",
    image: redJersey,
    swatchClass: "red"
  },
  blue: {
    label: "Blue",
    image: blueJersey,
    swatchClass: "blue"
  },
  yellow: {
    label: "Yellow",
    image: yellowJersey,
    swatchClass: "yellow"
  }
};

const COLOR_KEYS = Object.keys(COLOR_CONFIG);

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function getItemCount(round) {
  if (round <= 2) return 6;
  if (round <= 4) return 7;
  if (round <= 6) return 9;
  return 8;
}

function buildRound(round) {
  const itemCount = getItemCount(round);
  const items = Array.from({ length: itemCount }, () => {
    const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    return { color };
  });

  const availableColors = [...new Set(items.map((item) => item.color))];
  const targetColor =
    availableColors[Math.floor(Math.random() * availableColors.length)];

  const answer = items.filter((item) => item.color === targetColor).length;

  const wrongAnswers = new Set();
  while (wrongAnswers.size < 2) {
    const offset = Math.floor(Math.random() * 3) + 1;
    const candidate =
      Math.random() > 0.5 ? answer + offset : Math.max(0, answer - offset);

    if (candidate !== answer && candidate <= itemCount) {
      wrongAnswers.add(candidate);
    }
  }

  return {
    items: shuffle(items),
    targetColor,
    answer,
    options: shuffle([answer, ...wrongAnswers])
  };
}

function FanCountGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(buildRound(1));
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("fan-count-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Count the jerseys and speak the answer");
  const [history, setHistory] = useState([]);
  const [voiceError, setVoiceError] = useState("");

  const rankLabel = useMemo(() => {
    if (score >= 70) return "A";
    if (score >= 50) return "B";
    if (score >= 30) return "C";
    return "-";
  }, [score]);

  const getDisplayAnswer = useCallback((value) => {
    return parseNumberAnswer(value) || String(value).trim();
  }, []);

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
    setSpokenText("");
    setVoiceError("");
    setFeedback("Count the jerseys and speak the answer");
  }, [round, finishGame]);

  const submitAnswer = useCallback(
    (value) => {
      const normalizedValue = parseNumberAnswer(value);
      const isCorrect = normalizedValue === String(question.answer);

      setHistory((prev) => [
        ...prev,
        {
          targetColor: COLOR_CONFIG[question.targetColor].label,
          correctAnswer: String(question.answer),
          userAnswer: getDisplayAnswer(value),
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
      }, 800);
    },
    [question, goToNextQuestion, getDisplayAnswer]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalizedTranscript = parseNumberAnswer(transcript);
      setSpokenText(normalizedTranscript || transcript);
      setVoiceError("");
      submitAnswer(transcript);
    },
    [submitAnswer]
  );

  const handleVoiceError = useCallback((errorMessage) => {
    setVoiceError(errorMessage);

    if (errorMessage.toLowerCase().includes("network")) {
      setFeedback("Speech service problem. Please check internet and try again.");
      speakText("Speech service problem. Please try again.");
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
    if (screen === "review" && score > bestScore) {
      setBestScore(score);
      localStorage.setItem("fan-count-best", String(score));
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
    setScore(0);
    setScoreSaved(false);
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setVoiceError("");
    setFeedback("Count the jerseys and speak the answer");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  const handleOptionClick = (value) => {
    setSpokenText(String(value));
    setVoiceError("");
    submitAnswer(String(value));
  };

  if (!isSupported) {
    return (
      <div className="fan-screen">
        <div className="fan-intro-card">
          <h2>Fan Count Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="fan-screen intro-screen">
        <div className="fan-overlay"></div>

        <div className="fan-top-icons">
          <button className="fan-circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="fan-intro-card">
          <div className="fan-preview-wrap">
            <img src={redJersey} alt="Red jersey" className="fan-preview-jersey" />
            <img src={blueJersey} alt="Blue jersey" className="fan-preview-jersey" />
            <img src={yellowJersey} alt="Yellow jersey" className="fan-preview-jersey" />
          </div>

          <p className="fan-section-label">ATTENTION GAME</p>
          <h1 className="fan-title">Fan count game</h1>

          <div className="fan-stats-row">
            <div className="fan-info-box">
              <span className="fan-info-label">BEST SCORE</span>
              <strong>{bestScore || "-"}</strong>
            </div>

            <div className="fan-info-box">
              <span className="fan-info-label">RANK</span>
              <strong>{rankLabel}</strong>
            </div>
          </div>

          <div className="fan-skills-box">
            <div className="fan-skill-item">
              <div className="fan-skill-icon">🎤</div>
              <div>
                <h3>Voice counting</h3>
                <p>Count the selected color and speak the answer clearly.</p>
              </div>
            </div>
          </div>

          <button className="fan-start-btn" onClick={handleStartGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="fan-screen fan-review-screen">
        <div className="fan-review-header">
          <button className="fan-back-text-btn" onClick={() => navigate("/user")}>
            ←
          </button>
          <h2>Review performance</h2>
        </div>

        <div className="fan-review-summary">
          <div className="fan-summary-pill">Score: {score}</div>
          <div className="fan-summary-pill">
            Correct: {history.filter((item) => item.isCorrect).length}
          </div>
          <div className="fan-summary-pill">Rounds: {history.length}</div>
        </div>

        <div className="fan-review-list">
          {history.map((item, index) => (
            <div className="fan-review-row" key={`${item.targetColor}-${index}`}>
              <div className={`fan-review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="fan-review-content">
                <p className="fan-review-question">Count {item.targetColor}</p>
                <p className="fan-review-answer-line">
                  <span className="fan-correct-answer">{item.correctAnswer} ✓</span>
                  {!item.isCorrect && (
                    <span className="fan-wrong-answer"> {item.userAnswer} ✕</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button className="fan-start-btn fan-review-btn" onClick={handleRetryGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="fan-screen fan-play-screen">
      <div className="fan-top-bar">
        <button className="fan-circle-btn small" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="fan-progress-bar">
          <span>{String(timeLeft).padStart(2, "0")}s</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>
      </div>

      <div className="fan-target-card">
        <span>Count</span>
        <div className={`fan-target-swatch ${COLOR_CONFIG[question.targetColor].swatchClass}`}></div>
        <span>{COLOR_CONFIG[question.targetColor].label}</span>
      </div>

      <div className="fan-grid-wrap">
        <div className="fan-grid">
          {question.items.map((item, index) => (
            <div key={`${item.color}-${index}`} className="fan-jersey-slot">
              <img
                src={COLOR_CONFIG[item.color].image}
                alt={item.color}
                className="fan-jersey-image"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="fan-voice-panel">
        <div className="fan-spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="fan-voice-actions">
          <button
            className={`fan-voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? "Listening..." : "Speak Answer"}
          </button>

          <button
            className="fan-retry-btn"
            onClick={() => {
              setSpokenText("");
              setVoiceError("");
              setFeedback("Try again");
            }}
          >
            Retry
          </button>
        </div>

        <div className="fan-feedback">{feedback}</div>
        {voiceError && <div className="fan-voice-error">{voiceError}</div>}
      </div>

      <div className="fan-answer-options">
        {question.options.map((option) => (
          <button
            key={option}
            className="fan-answer-box"
            onClick={() => handleOptionClick(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FanCountGame;
