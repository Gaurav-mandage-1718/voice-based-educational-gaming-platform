import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseNumberAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./BasicMathGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 4;

function generateQuestion() {
  const operators = ["+", "-"];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;

  if (operator === "+") {
    return buildQuestion(a, b, operator, a + b);
  }

  const big = Math.max(a, b);
  const small = Math.min(a, b);
  return buildQuestion(big, small, operator, big - small);
}

function buildQuestion(first, second, operator, answer) {
  const wrongAnswers = new Set();

  while (wrongAnswers.size < 2) {
    const offset = Math.floor(Math.random() * 6) + 1;
    const candidate =
      Math.random() > 0.5 ? answer + offset : Math.max(0, answer - offset);

    if (candidate !== answer) {
      wrongAnswers.add(candidate);
    }
  }

  const options = [answer, ...wrongAnswers].sort(() => Math.random() - 0.5);

  return {
    first,
    second,
    operator,
    answer,
    options,
    label: `${first} ${operator} ${second}`
  };
}

function BasicMathGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [question, setQuestion] = useState(generateQuestion());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("basic-math-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Tap the mic and say the answer");
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

    setRound((prev) => prev + 1);
    setQuestion(generateQuestion());
    setSpokenText("");
    setFeedback("Next question ready");
    setVoiceError("");
  }, [round, finishGame]);

  const checkAnswer = useCallback(
    (rawAnswer) => {
      const normalizedUser = parseNumberAnswer(rawAnswer);
      const normalizedCorrect = String(question.answer).trim();
      const isCorrect = normalizedUser === normalizedCorrect;

      setHistory((prev) => [
        ...prev,
        {
          question: question.label,
          correctAnswer: normalizedCorrect,
          userAnswer: getDisplayAnswer(rawAnswer),
          isCorrect
        }
      ]);

      if (isCorrect) {
        setFeedback("Correct ✅");
        speakText("Correct");
        setScore((prev) => prev + 10);

        window.setTimeout(() => {
          goToNextQuestion();
        }, 800);
      } else {
        setFeedback("Wrong ❌ Try Again");
        speakText("Wrong. Please try again.");
      }
    },
    [question, goToNextQuestion, getDisplayAnswer]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalizedTranscript = parseNumberAnswer(transcript);
      setSpokenText(normalizedTranscript || transcript);
      setVoiceError("");
      checkAnswer(transcript);
    },
    [checkAnswer]
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

useSpeechRecognition({
  onResult: handleVoiceResult,
  onError: handleVoiceError,
  autoRestart: false,
  maxListeningTime: 3500
});

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
      localStorage.setItem("basic-math-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    if (screen === "review") {
      saveGameScore();
    }
  }, [screen, saveGameScore]);

  const handleOptionClick = (value) => {
    setSpokenText(String(value));
    checkAnswer(String(value));
  };

  const handleStartGame = () => {
    setScreen("playing");
    setQuestion(generateQuestion());
    setRound(1);
    setScore(0);
    setScoreSaved(false);
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setFeedback("Listen and answer");
    setVoiceError("");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  if (!isSupported) {
    return (
      <div className="math-screen">
        <div className="math-card-simple">
          <h2>Basic Math Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="math-screen intro-screen">
        <div className="math-overlay"></div>

        <div className="top-icons">
          <button className="circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="intro-card">
          <div className="board-icon-wrap">
            <div className="board-icon">
              <div className="mini-board">2+2</div>
            </div>
          </div>

          <p className="section-label">MENTAL MATHS</p>
          <h1 className="game-title">Basic math</h1>

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
              <div className="skill-icon">✎</div>
              <div>
                <h3>Mental arithmetics</h3>
                <p>Boost quick and accurate mental calculations</p>
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
      <div className="math-screen review-screen">
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
            <div className="review-row" key={`${item.question}-${index}`}>
              <div className={`review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="review-content">
                <p className="review-question">{item.question} =</p>
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
    <div className="math-screen play-screen">
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

      <div className="chalkboard-wrap-math">
        <div className="chalkboard">
          <div className="chalk-text">{question.first}</div>
          <div className="chalk-text">{question.operator}</div>
          <div className="chalk-text">{question.second}</div>
        </div>
        <div className="chalk-shelf">
          <div className="chalk-piece"></div>
          <div className="eraser"></div>
        </div>
      </div>

      <div className="equals-sign">=</div>

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
              setFeedback("Try again with your voice");
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

export default BasicMathGame;
