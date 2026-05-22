import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import "./SnakeVoiceGame.css";

const GRID_SIZE = 16;
const CELL_SIZE = 22;
const INITIAL_SNAKE = [
  { x: 7, y: 8 },
  { x: 6, y: 8 },
  { x: 5, y: 8 }
];
const INITIAL_DIRECTION = "RIGHT";
const GAME_SPEED = 1000;

function getRandomEgg(snake) {
  while (true) {
    const egg = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };

    const overlapsSnake = snake.some(
      (segment) => segment.x === egg.x && segment.y === egg.y
    );

    if (!overlapsSnake) {
      return egg;
    }
  }
}

function isOppositeDirection(current, next) {
  return (
    (current === "UP" && next === "DOWN") ||
    (current === "DOWN" && next === "UP") ||
    (current === "LEFT" && next === "RIGHT") ||
    (current === "RIGHT" && next === "LEFT")
  );
}

function normalizeCommand(value) {
  return String(value || "").toLowerCase().trim();
}

function moveHead(head, direction) {
  if (direction === "UP") return { x: head.x, y: head.y - 1 };
  if (direction === "DOWN") return { x: head.x, y: head.y + 1 };
  if (direction === "LEFT") return { x: head.x - 1, y: head.y };
  return { x: head.x + 1, y: head.y };
}

function SnakeVoiceGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [queuedDirection, setQueuedDirection] = useState(INITIAL_DIRECTION);
  const [egg, setEgg] = useState(getRandomEgg(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("snake-voice-high-score") || 0)
  );
  const [spokenText, setSpokenText] = useState("");
  const [statusText, setStatusText] = useState("Say up, down, left, or right");
  const [voiceError, setVoiceError] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  const directionRef = useRef(INITIAL_DIRECTION);
  const queuedDirectionRef = useRef(INITIAL_DIRECTION);
  const scoreRef = useRef(0);

  const boardSize = useMemo(() => GRID_SIZE * CELL_SIZE, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setQueuedDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    queuedDirectionRef.current = INITIAL_DIRECTION;
    setEgg(getRandomEgg(INITIAL_SNAKE));
    setScore(0);
    scoreRef.current = 0;
    setSpokenText("");
    setVoiceError("");
    setStatusText("Say up, down, left, or right");
    setIsPaused(false);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setScreen("playing");
  }, [resetGame]);

  const endGame = useCallback(
    (finalScore) => {
      setScreen("gameover");
      setIsPaused(true);
      setStatusText("Game over");

      if (finalScore > bestScore) {
        setBestScore(finalScore);
        localStorage.setItem("snake-voice-high-score", String(finalScore));
      }
    },
    [bestScore]
  );

  const updateDirection = useCallback((nextDirection) => {
    if (isOppositeDirection(directionRef.current, nextDirection)) return;

    queuedDirectionRef.current = nextDirection;
    setQueuedDirection(nextDirection);
  }, []);

  const handleVoiceCommand = useCallback(
    (transcript) => {
      const command = normalizeCommand(transcript);
      setSpokenText(command || transcript);
      setVoiceError("");

      if (command.includes("up")) {
        updateDirection("UP");
        setStatusText("Moving up");
        return;
      }

      if (command.includes("down")) {
        updateDirection("DOWN");
        setStatusText("Moving down");
        return;
      }

      if (command.includes("left")) {
        updateDirection("LEFT");
        setStatusText("Moving left");
        return;
      }

      if (command.includes("right")) {
        updateDirection("RIGHT");
        setStatusText("Moving right");
        return;
      }

      if (command.includes("pause")) {
        setIsPaused(true);
        setStatusText("Paused");
        return;
      }

      if (command.includes("resume") || command.includes("start")) {
        setIsPaused(false);
        setStatusText("Game resumed");
        return;
      }

      if (command.includes("restart")) {
        resetGame();
        return;
      }

      setStatusText("Say up, down, left, or right");
    },
    [resetGame, updateDirection]
  );

  const handleVoiceError = useCallback((errorMessage) => {
    setVoiceError(errorMessage);
    setStatusText("Voice not clear. Try again.");
  }, []);

  const { isSupported, isListening, startListening, stopListening } =
    useSpeechRecognition({
      onResult: handleVoiceCommand,
      onError: handleVoiceError,
      autoRestart: true
    });

  useEffect(() => {
    if (screen !== "playing" || isPaused) return;

    const timer = window.setTimeout(() => {
      setSnake((prevSnake) => {
        const activeDirection = queuedDirectionRef.current;
        directionRef.current = activeDirection;
        setDirection(activeDirection);

        const nextHead = moveHead(prevSnake[0], activeDirection);

        const hitsWall =
          nextHead.x < 0 ||
          nextHead.x >= GRID_SIZE ||
          nextHead.y < 0 ||
          nextHead.y >= GRID_SIZE;

        const hitsSelf = prevSnake.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y
        );

        if (hitsWall || hitsSelf) {
          window.setTimeout(() => endGame(scoreRef.current), 0);
          return prevSnake;
        }

        const ateEgg = nextHead.x === egg.x && nextHead.y === egg.y;
        const newSnake = [nextHead, ...prevSnake];

        if (!ateEgg) {
          newSnake.pop();
        } else {
          setScore((prevScore) => {
            const nextScore = prevScore + 1;
            scoreRef.current = nextScore;
            return nextScore;
          });
          setEgg(getRandomEgg(newSnake));
          setStatusText("Yum! Egg eaten");
        }

        return newSnake;
      });
    }, GAME_SPEED);

    return () => window.clearTimeout(timer);
  }, [screen, isPaused, egg, endGame]);

  useEffect(() => {
    if (screen === "playing" && isSupported) {
      startListening();
      return () => stopListening();
    }
  }, [screen, isSupported, startListening, stopListening]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (screen !== "playing") return;

      if (event.key === "ArrowUp") updateDirection("UP");
      if (event.key === "ArrowDown") updateDirection("DOWN");
      if (event.key === "ArrowLeft") updateDirection("LEFT");
      if (event.key === "ArrowRight") updateDirection("RIGHT");
      if (event.key === " ") {
        event.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, updateDirection]);

  if (!isSupported) {
    return (
      <div className="snake-screen">
        <div className="snake-simple-card">
          <h2>Snake Voice Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="snake-screen snake-intro-screen">
        <div className="snake-overlay"></div>

        <div className="snake-top-icons">
          <button className="snake-circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="snake-intro-card">
          <div className="snake-icon-board">
            <div className="snake-mini-grid">
              <span className="snake-mini-head"></span>
              <span className="snake-mini-egg"></span>
            </div>
          </div>

          <p className="snake-section-label">FUN GAME</p>
          <h1 className="snake-title">Snake voice game</h1>

          <div className="snake-stats-row">
            <div className="snake-info-box">
              <span className="snake-info-label">BEST SCORE</span>
              <strong>{bestScore}</strong>
            </div>

            <div className="snake-info-box">
              <span className="snake-info-label">CONTROL</span>
              <strong>VOICE</strong>
            </div>
          </div>

          <div className="snake-skills-box">
            <div className="snake-skill-item">
              <div className="snake-skill-icon">🎤</div>
              <div>
                <h3>Voice control</h3>
                <p>Say up, down, left, and right to move the snake.</p>
              </div>
            </div>

            <div className="snake-skill-item">
              <div className="snake-skill-icon">🥚</div>
              <div>
                <h3>Eat eggs</h3>
                <p>Each egg increases snake length by 1 and gives 1 score.</p>
              </div>
            </div>
          </div>

          <button className="snake-start-btn" onClick={startGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "gameover") {
    return (
      <div className="snake-screen snake-gameover-screen">
        <div className="snake-gameover-card">
          <h2>Game Over</h2>
          <p className="snake-gameover-score">Score: {score}</p>
          <p className="snake-gameover-best">Highest Score: {bestScore}</p>
          <p className="snake-gameover-note">This fun game uses local score only.</p>

          <button className="snake-start-btn" onClick={startGame}>
            Play Again
          </button>

          <button
            className="snake-secondary-btn"
            onClick={() => navigate("/user")}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="snake-screen snake-play-screen">
      <div className="snake-top-bar">
        <button
          className="snake-circle-btn small"
          onClick={() => setIsPaused((prev) => !prev)}
        >
          {isPaused ? "▶" : "❚❚"}
        </button>

        <div className="snake-progress-bar">
          <span>{isPaused ? "Paused" : "Playing"}</span>
          <span>Score: {score}</span>
          <span>Best: {bestScore}</span>
        </div>
      </div>

      <div className="snake-board-wrap">
        <div
          className="snake-board"
          style={{
            width: `${boardSize}px`,
            height: `${boardSize}px`
          }}
        >
          {snake.map((segment, index) => (
            <div
              key={`${segment.x}-${segment.y}-${index}`}
              className={`snake-cell ${index === 0 ? "snake-head" : "snake-body"}`}
              style={{
                left: `${segment.x * CELL_SIZE}px`,
                top: `${segment.y * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`
              }}
            />
          ))}

          <div
            className="snake-egg"
            style={{
              left: `${egg.x * CELL_SIZE}px`,
              top: `${egg.y * CELL_SIZE}px`,
              width: `${CELL_SIZE}px`,
              height: `${CELL_SIZE}px`
            }}
          />
        </div>
      </div>

      <div className="snake-voice-panel">
        <div className="snake-spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="snake-voice-actions">
          <button
            className={`snake-voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? "Listening..." : "Start Voice"}
          </button>

          <button
            className="snake-secondary-btn"
            onClick={() => setIsPaused((prev) => !prev)}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>

          <button
            className="snake-secondary-btn"
            onClick={resetGame}
          >
            Restart
          </button>
        </div>

        <div className="snake-status-text">{statusText}</div>
        {voiceError && <div className="snake-voice-error">{voiceError}</div>}
      </div>
    </div>
  );
}

export default SnakeVoiceGame;
