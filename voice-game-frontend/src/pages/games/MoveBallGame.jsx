import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import "./MoveBallGame.css";

const BOARD_SIZE = 5;
const TOTAL_ROUNDS = 7;
const ROUND_TIME = 45;

function getRandomTarget(ball) {
  while (true) {
    const target = {
      row: Math.floor(Math.random() * BOARD_SIZE),
      col: Math.floor(Math.random() * BOARD_SIZE)
    };

    if (target.row !== ball.row || target.col !== ball.col) {
      return target;
    }
  }
}

function normalizeDirection(value) {
  const text = String(value || "").toLowerCase().trim();

  if (text.includes("up")) return "up";
  if (text.includes("down")) return "down";
  if (text.includes("left")) return "left";
  if (text.includes("right")) return "right";
  return text;
}

function MoveBallGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [round, setRound] = useState(1);
  const [ball, setBall] = useState({ row: 2, col: 2 });
  const [target, setTarget] = useState({ row: 0, col: 4 });
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("move-ball-fun-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Say up, down, left, or right");
  const [history, setHistory] = useState([]);
  const [voiceError, setVoiceError] = useState("");

  const boardCells = useMemo(
    () => Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => index),
    []
  );

  const finishGame = useCallback(() => {
    setScreen("review");
    setBestScore((prev) => {
      const next = Math.max(prev, score);
      localStorage.setItem("move-ball-fun-best", String(next));
      return next;
    });
  }, [score]);

  const resetRound = useCallback((nextRound = 1) => {
    const nextBall = { row: 2, col: 2 };
    setRound(nextRound);
    setBall(nextBall);
    setTarget(getRandomTarget(nextBall));
    setSpokenText("");
    setVoiceError("");
    setFeedback("Say up, down, left, or right");
  }, []);

  const moveBall = useCallback(
    (direction) => {
      setBall((prevBall) => {
        let nextBall = prevBall;

        if (direction === "up") {
          nextBall = { ...prevBall, row: Math.max(0, prevBall.row - 1) };
        } else if (direction === "down") {
          nextBall = { ...prevBall, row: Math.min(BOARD_SIZE - 1, prevBall.row + 1) };
        } else if (direction === "left") {
          nextBall = { ...prevBall, col: Math.max(0, prevBall.col - 1) };
        } else if (direction === "right") {
          nextBall = { ...prevBall, col: Math.min(BOARD_SIZE - 1, prevBall.col + 1) };
        }

        const reachedTarget =
          nextBall.row === target.row && nextBall.col === target.col;

        if (reachedTarget) {
          const nextScore = score + 1;
          setScore(nextScore);
          setFeedback("Target reached ✅");

          const nextRound = round + 1;
          setHistory((prev) => [
            ...prev,
            {
              round,
              result: "Reached target"
            }
          ]);

          window.setTimeout(() => {
            if (nextRound > TOTAL_ROUNDS) {
              finishGame();
            } else {
              resetRound(nextRound);
            }
          }, 700);
        }

        return nextBall;
      });
    },
    [target, score, round, finishGame, resetRound]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalized = normalizeDirection(transcript);
      setSpokenText(normalized || transcript);
      setVoiceError("");

      if (["up", "down", "left", "right"].includes(normalized)) {
        moveBall(normalized);
      } else {
        setFeedback("Say up, down, left, or right");
      }
    },
    [moveBall]
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

  const startGame = () => {
    setScreen("playing");
    setScore(0);
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    resetRound(1);
  };

  const getCellClass = (row, col) => {
    if (ball.row === row && ball.col === col) return "ball";
    if (target.row === row && target.col === col) return "target";
    return "";
  };

  if (!isSupported) {
    return (
      <div className="move-screen">
        <div className="move-simple-card">
          <h2>Move the Ball Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="move-screen">
        <div className="move-card">
          <button className="move-back-btn" onClick={() => navigate("/user")}>
            Back
          </button>

          <h1>Move the Ball</h1>
          <p className="move-subtext">Fun game only</p>

          <div className="move-preview-board">
            <div className="preview-ball"></div>
            <div className="preview-target"></div>
          </div>

          <div className="move-stats">
            <div>
              <span>Highest Score</span>
              <strong>{bestScore}</strong>
            </div>
            <div>
              <span>Control</span>
              <strong>Voice</strong>
            </div>
          </div>

          <p className="move-description">
            Move the ball with voice and reach the target.
          </p>

          <button className="move-start-btn" onClick={startGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="move-screen">
        <div className="move-card review">
          <button className="move-back-btn" onClick={() => navigate("/user")}>
            Back
          </button>

          <h2>Game Over</h2>
          <p className="move-score">Score: {score}</p>
          <p className="move-score">Highest Score: {bestScore}</p>

          <button className="move-start-btn" onClick={startGame}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="move-screen">
      <div className="move-top-bar">
        <button className="move-pause-btn" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="move-progress-bar">
          <span>{String(timeLeft).padStart(2, "0")}s</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>
      </div>

      <div className="move-stage">
        <div className="move-grid">
          {boardCells.map((cell) => {
            const row = Math.floor(cell / BOARD_SIZE);
            const col = cell % BOARD_SIZE;
            return (
              <div
                key={cell}
                className={`move-cell ${getCellClass(row, col)}`}
              ></div>
            );
          })}
        </div>
      </div>

      <div className="move-voice-panel">
        <div className="move-spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="move-voice-actions">
          <button
            className={`move-voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? "Listening..." : "Speak Direction"}
          </button>

          <button
            className="move-secondary-btn"
            onClick={() => {
              setSpokenText("");
              setVoiceError("");
              setFeedback("Try again");
            }}
          >
            Retry
          </button>
        </div>

        <div className="move-feedback">{feedback}</div>
        {voiceError && <div className="move-error">{voiceError}</div>}
      </div>
    </div>
  );
}

export default MoveBallGame;
