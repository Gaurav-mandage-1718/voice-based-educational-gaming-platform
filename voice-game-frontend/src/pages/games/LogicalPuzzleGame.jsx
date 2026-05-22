import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseYesNoAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./LogicalPuzzleGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 15;

const POSITIONS = [
  { x: 50, y: 18 },
  { x: 72, y: 28 },
  { x: 78, y: 52 },
  { x: 62, y: 74 },
  { x: 38, y: 74 },
  { x: 22, y: 52 },
  { x: 28, y: 28 }
];

const COLORS = ["pink", "yellow"];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildBasePattern() {
  const selectedIndices = shuffle(
    Array.from({ length: POSITIONS.length }, (_, index) => index)
  ).slice(0, 5);

  return selectedIndices.map((positionIndex, index) => ({
    positionIndex,
    color: COLORS[index % COLORS.length]
  }));
}

function rotatePattern(pattern, steps) {
  return pattern.map((dot) => ({
    ...dot,
    positionIndex: (dot.positionIndex + steps) % POSITIONS.length
  }));
}

function breakPattern(pattern) {
  const updated = [...pattern];
  const indexToChange = Math.floor(Math.random() * updated.length);
  const usedPositions = updated.map((item) => item.positionIndex);

  const freePositions = Array.from(
    { length: POSITIONS.length },
    (_, index) => index
  ).filter((index) => !usedPositions.includes(index));

  if (freePositions.length > 0) {
    updated[indexToChange] = {
      ...updated[indexToChange],
      positionIndex:
        freePositions[Math.floor(Math.random() * freePositions.length)]
    };
  } else {
    updated[indexToChange] = {
      ...updated[indexToChange],
      color: updated[indexToChange].color === "pink" ? "yellow" : "pink"
    };
  }

  return updated;
}

function buildRound() {
  const leftPattern = buildBasePattern();
  const isMatch = Math.random() > 0.5;
  const rotationSteps = Math.floor(Math.random() * 6) + 1;

  let rightPattern = rotatePattern(leftPattern, rotationSteps);

  if (!isMatch) {
    rightPattern = breakPattern(rightPattern);
  }

  return {
    leftPattern,
    rightPattern,
    answer: isMatch ? "yes" : "no"
  };
}

function PatternDots({ pattern }) {
  return (
    <div className="logic-pattern-ring">
      <div className="logic-pattern-core"></div>

      {pattern.map((dot, index) => {
        const position = POSITIONS[dot.positionIndex];
        return (
          <span
            key={`${dot.positionIndex}-${dot.color}-${index}`}
            className={`logic-dot ${dot.color}`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`
            }}
          />
        );
      })}
    </div>
  );
}

function LogicalPuzzleGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(buildRound());
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("logical-puzzle-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Say yes or no");
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
    setQuestion(buildRound());
    setSpokenText("");
    setVoiceError("");
    setFeedback("Say yes or no");
  }, [round, finishGame]);

  const submitAnswer = useCallback(
    (value) => {
      const normalizedValue = parseYesNoAnswer(value);
      const isCorrect = normalizedValue === question.answer;

      setHistory((prev) => [
        ...prev,
        {
          correctAnswer: question.answer,
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

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalizedTranscript = parseYesNoAnswer(transcript);
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
    if (screen === "review" && score > bestScore) {
      setBestScore(score);
      localStorage.setItem("logical-puzzle-best", String(score));
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
    setQuestion(buildRound());
    setScore(0);
    setScoreSaved(false);
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setVoiceError("");
    setFeedback("Say yes or no");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  const handleButtonAnswer = (value) => {
    setSpokenText(value);
    setVoiceError("");
    submitAnswer(value);
  };

  if (!isSupported) {
    return (
      <div className="logic-screen">
        <div className="logic-simple-card">
          <h2>Logical Puzzle Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="logic-screen logic-intro-screen">
        <div className="logic-overlay"></div>

        <div className="logic-top-icons">
          <button className="logic-circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="logic-intro-card">
          <div className="logic-preview-patterns">
            <div className="logic-preview-box">
              <PatternDots
                pattern={[
                  { positionIndex: 0, color: "pink" },
                  { positionIndex: 1, color: "pink" },
                  { positionIndex: 2, color: "yellow" },
                  { positionIndex: 5, color: "pink" },
                  { positionIndex: 6, color: "yellow" }
                ]}
              />
            </div>

            <div className="logic-preview-box">
              <PatternDots
                pattern={[
                  { positionIndex: 2, color: "pink" },
                  { positionIndex: 3, color: "pink" },
                  { positionIndex: 4, color: "yellow" },
                  { positionIndex: 0, color: "pink" },
                  { positionIndex: 1, color: "yellow" }
                ]}
              />
            </div>
          </div>

          <h1 className="logic-title">Logical puzzle</h1>

          <div className="logic-stats-row">
            <div className="logic-info-box">
              <span className="logic-info-label">BEST SCORE</span>
              <strong>{bestScore || "-"}</strong>
            </div>

            <div className="logic-info-box">
              <span className="logic-info-label">RANK</span>
              <strong>{rankLabel}</strong>
            </div>
          </div>

          <div className="logic-skills-box">
            <div className="logic-skill-item">
              <div className="logic-skill-icon">🧠</div>
              <div>
                <h3>Logical thinking</h3>
                <p>Look at both patterns and decide if the right one matches the left by rotation.</p>
              </div>
            </div>
          </div>

          <button className="logic-start-btn" onClick={handleStartGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="logic-screen logic-review-screen">
        <div className="logic-review-header">
          <button className="logic-back-text-btn" onClick={() => navigate("/user")}>
            ←
          </button>
          <h2>Review performance</h2>
        </div>

        <div className="logic-review-summary">
          <div className="logic-summary-pill">Score: {score}</div>
          <div className="logic-summary-pill">
            Correct: {history.filter((item) => item.isCorrect).length}
          </div>
          <div className="logic-summary-pill">Rounds: {history.length}</div>
        </div>

        <div className="logic-review-list">
          {history.map((item, index) => (
            <div className="logic-review-row" key={`${item.correctAnswer}-${index}`}>
              <div className={`logic-review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="logic-review-content">
                <p className="logic-review-question">Rotation match puzzle</p>
                <p className="logic-review-answer-line">
                  <span className="logic-correct-answer">{item.correctAnswer} ✓</span>
                  {!item.isCorrect && (
                    <span className="logic-wrong-answer"> {item.userAnswer} ✕</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button className="logic-start-btn logic-review-btn" onClick={handleRetryGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="logic-screen logic-play-screen">
      <div className="logic-top-bar">
        <button className="logic-circle-btn small" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="logic-progress-bar">
          <span>{String(timeLeft).padStart(2, "0")}s</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>
      </div>

      <div className="logic-pattern-stage">
        <div className="logic-pattern-box">
          <PatternDots pattern={question.leftPattern} />
        </div>

        <div className="logic-pattern-box">
          <PatternDots pattern={question.rightPattern} />
        </div>
      </div>

      <div className="logic-voice-panel">
        <div className="logic-spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="logic-voice-actions">
          <button
            className={`logic-voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? "Listening..." : "Speak Yes / No"}
          </button>

          <button
            className="logic-retry-btn"
            onClick={() => {
              setSpokenText("");
              setVoiceError("");
              setFeedback("Try again");
            }}
          >
            Retry
          </button>
        </div>

        <div className="logic-feedback">{feedback}</div>
        {voiceError && <div className="logic-voice-error">{voiceError}</div>}
      </div>

      <div className="logic-answer-buttons">
        <button className="logic-answer-btn" onClick={() => handleButtonAnswer("no")}>
          No
        </button>
        <button className="logic-answer-btn" onClick={() => handleButtonAnswer("yes")}>
          Yes
        </button>
      </div>
    </div>
  );
}

export default LogicalPuzzleGame;
