import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseNumberAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./FindMissingNumberGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 12;

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildRound(round) {
  const maxNumber = Math.min(5 + round, 10);
  const sequence = Array.from({ length: maxNumber }, (_, index) => index + 1);

  const missingIndex = Math.floor(Math.random() * sequence.length);
  const answer = sequence[missingIndex];

  const visibleNumbers = sequence.filter((_, index) => index !== missingIndex);
  const shuffledVisibleNumbers = shuffle(visibleNumbers);

  const wrongAnswers = new Set();

  while (wrongAnswers.size < 2) {
    const candidate = Math.floor(Math.random() * maxNumber) + 1;
    if (candidate !== answer) {
      wrongAnswers.add(candidate);
    }
  }

  return {
    maxNumber,
    answer,
    visibleNumbers: shuffledVisibleNumbers,
    options: shuffle([answer, ...wrongAnswers])
  };
}

function FindMissingNumberGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(buildRound(1));
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("missing-number-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Find the missing number");
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
    setSpokenText("");
    setVoiceError("");
    setFeedback("Next pattern ready");
  }, [round, finishGame]);

  const submitAnswer = useCallback(
    (value) => {
      const normalizedValue = parseNumberAnswer(value);
      const isCorrect = normalizedValue === String(question.answer);

      setHistory((prev) => [
        ...prev,
        {
          pattern: `1 to ${question.maxNumber}`,
          correctAnswer: String(question.answer),
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
      }, 800);
    },
    [question, goToNextQuestion]
  );

  const handleOptionClick = useCallback(
    (value) => {
      setSpokenText(String(value));
      setVoiceError("");
      submitAnswer(String(value));
    },
    [submitAnswer]
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
      localStorage.setItem("missing-number-best", String(score));
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
    setFeedback("Find the missing number");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  if (!isSupported) {
    return (
      <div className="math-screen">
        <div className="math-card-simple">
          <h2>Find Missing Number Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="num-screen intro-screen">
        <div className="overlay"></div>

        <div className="top-icons">
          <button className="circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="intro-card">
          <div className="board-icon-wrap">
            <div className="board-icon">
              <div className="mini-board">1 ? 3</div>
            </div>
          </div>

          <p className="section-label">ATTENTION GAME</p>
          <h1 className="game-title">Find missing number</h1>

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
                <h3>Attention</h3>
                <p>Look carefully, find the missing number, and answer by voice or tap</p>
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
      <div className="num-screen review-screen">
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
            <div className="review-row" key={`${item.pattern}-${index}`}>
              <div className={`review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="review-content">
                <p className="review-question">{item.pattern}</p>
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
    <div className="num-screen play-screen">
      <div className="top-game-bar">
        <button className="circle-btn small" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="progress-bar">
          <span>{String(timeLeft).padStart(2, "0")}s</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>
      </div>

      <div className="hex-board-wrap">
        <div className="hex-board-title">
          Find the missing number from 1 to {question.maxNumber}
        </div>

        <div className="hex-grid">
          {question.visibleNumbers.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className={`hex-node ${index % 2 === 1 ? "hex-node-offset" : ""}`}
            >
              <div className="hex-inner">{item}</div>
            </div>
          ))}
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
          >
            {isListening ? "Listening..." : "Speak Answer"}
          </button>

          <button
            className="retry-btn"
            onClick={() => {
              setSpokenText("");
              setVoiceError("");
              setFeedback("Try again");
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

      <div className="answer-options">
        {question.options.map((option) => (
          <button
            key={option}
            className="answer-box"
            onClick={() => handleOptionClick(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FindMissingNumberGame;
