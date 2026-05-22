import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseOperatorAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./FindOperatorGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 7;

function generateQuestion() {
  const operators = ["+", "-", "*", "/"];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let first = 0;
  let second = 0;
  let result = 0;

  const displayOperator = {
    "*": "×",
    "/": "÷"
  };

  if (operator === "+") {
    first = Math.floor(Math.random() * 10) + 1;
    second = Math.floor(Math.random() * 10) + 1;
    result = first + second;
  }

  if (operator === "-") {
    first = Math.floor(Math.random() * 10) + 6;
    second = Math.floor(Math.random() * 5) + 1;
    result = first - second;
  }

  if (operator === "*") {
    first = Math.floor(Math.random() * 5) + 2;
    second = Math.floor(Math.random() * 5) + 2;
    result = first * second;
  }

  if (operator === "/") {
    second = Math.floor(Math.random() * 5) + 1;
    result = Math.floor(Math.random() * 5) + 2;
    first = second * result;
  }

  const options = ["+", "-", "*", "/"]
    .map((value) => ({
      value,
      label: displayOperator[value] || value
    }))
    .sort(() => Math.random() - 0.5);

  return {
    first,
    second,
    result,
    answer: operator,
    options,
    label: `${first} ? ${second} = ${result}`
  };
}

function FindOperatorGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [question, setQuestion] = useState(generateQuestion());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("find-operator-best") || 0)
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Say the correct operator");
  const [history, setHistory] = useState([]);
  const [voiceError, setVoiceError] = useState("");

  const rankLabel = useMemo(() => {
    if (score >= 70) return "A";
    if (score >= 50) return "B";
    if (score >= 30) return "C";
    return "-";
  }, [score]);

  const getDisplayOperator = useCallback((value) => {
    if (value === "*") return "×";
    if (value === "/") return "÷";
    return value;
  }, []);

  const saveGameScore = useCallback(async () => {
    if (scoreSaved || score <= 0) return;

    try {
      await api.post("/user/play", {
        gameId: GAME_ID,
        score
      });
      setScoreSaved(true);
      setSaveStatus("Score saved successfully");
    } catch (error) {
      console.error("Failed to save score:", error);
      setSaveStatus("Failed to save score");
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
    setFeedback("Say the correct operator");
    setVoiceError("");
  }, [round, finishGame]);

  const checkAnswer = useCallback(
    (rawAnswer) => {
      const normalizedUser = parseOperatorAnswer(rawAnswer);
      const normalizedCorrect = question.answer;
      const isCorrect = normalizedUser === normalizedCorrect;

      setHistory((prev) => [
        ...prev,
        {
          question: question.label,
          correctAnswer: getDisplayOperator(normalizedCorrect),
          userAnswer: getDisplayOperator(
            normalizedUser || String(rawAnswer).trim()
          ),
          isCorrect
        }
      ]);

      if (isCorrect) {
        setFeedback("Correct ✅");
        setSpokenText(getDisplayOperator(normalizedUser));
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
    [question, goToNextQuestion, getDisplayOperator]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalized = parseOperatorAnswer(transcript);
      setSpokenText(getDisplayOperator(normalized || transcript));
      setVoiceError("");
      checkAnswer(transcript);
    },
    [checkAnswer, getDisplayOperator]
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
    if (screen === "review" && score > bestScore) {
      setBestScore(score);
      localStorage.setItem("find-operator-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    if (screen === "review") {
      saveGameScore();
    }
  }, [screen, saveGameScore]);

  const handleOptionClick = (value) => {
    setSpokenText(getDisplayOperator(value));
    checkAnswer(value);
  };

  const handleStartGame = () => {
    setScreen("playing");
    setQuestion(generateQuestion());
    setRound(1);
    setScore(0);
    setScoreSaved(false);
    setSaveStatus("");
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setFeedback("Say the correct operator");
    setVoiceError("");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  if (!isSupported) {
    return (
      <div className="operator-screen">
        <div className="operator-card-simple">
          <h2>Find Operator Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="operator-screen intro-screen">
        <div className="overlay"></div>

        <div className="top-icons">
          <button className="circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="intro-card">
          <div className="board-icon-wrap">
            <div className="board-icon">
              <div className="mini-board">? + ?</div>
            </div>
          </div>

          <p className="section-label">MENTAL MATHS</p>
          <h1 className="game-title">Find Operator</h1>

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
                <h3>Operator recognition</h3>
                <p>Choose the correct math symbol using voice</p>
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
      <div className="operator-screen review-screen">
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

        {saveStatus && <div className="save-status">{saveStatus}</div>}

        <div className="review-list">
          {history.map((item, index) => (
            <div className="review-row" key={`${item.question}-${index}`}>
              <div className={`review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="review-content">
                <p className="review-question">{item.question}</p>
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
    <div className="operator-screen play-screen">
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

      <div className="operator-chalkboard-wrap">
        <div className="operator-chalkboard">
          <div className="operator-chalk-text">{question.first}</div>
          <div className="operator-chalk-text">?</div>
          <div className="operator-chalk-text">{question.second}</div>
          <div className="operator-chalk-text">= {question.result}</div>
        </div>
        <div className="operator-chalk-shelf">
          <div className="operator-chalk-piece"></div>
          <div className="operator-eraser"></div>
        </div>
      </div>

      <div className="operator-voice-panel">
        <div className="operator-spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="voice-actions">
          <button
            className={`voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? "Listening..." : "Speak Operator"}
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
            key={option.value}
            className="answer-box"
            onClick={() => handleOptionClick(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FindOperatorGame;
