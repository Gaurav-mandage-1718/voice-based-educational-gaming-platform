import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseWordAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./SpellingGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 10;

const wordBank = [
  { word: "TREE", clue: "It has leaves and branches" },
  { word: "BOOK", clue: "You read it" },
  { word: "FISH", clue: "It swims in water" },
  { word: "STAR", clue: "It twinkles at night" },
  { word: "BALL", clue: "You can throw and catch it" },
  { word: "DOG", clue: "It barks" },
  { word: "CAT", clue: "It says meow" },
  { word: "SUN", clue: "It shines in the sky" }
];

function getRandomWord() {
  return wordBank[Math.floor(Math.random() * wordBank.length)];
}

function SpellingGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [question, setQuestion] = useState(getRandomWord());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("spelling-game-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Tap the mic and spell the word");
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

    const nextQuestion = getRandomWord();
    setRound((prev) => prev + 1);
    setQuestion(nextQuestion);
    setSpokenText("");
    setFeedback("Tap the mic and spell the word");
    setVoiceError("");
  }, [round, finishGame]);

  const checkAnswer = useCallback(
    (rawAnswer) => {
      const normalizedUser = parseWordAnswer(rawAnswer);
      const normalizedCorrect = question.word;
      const isCorrect = normalizedUser === normalizedCorrect;

      setHistory((prev) => [
        ...prev,
        {
          clue: question.clue,
          targetWord: question.word,
          userAnswer: normalizedUser,
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
    [question, goToNextQuestion]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const normalizedTranscript = parseWordAnswer(transcript);
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
      localStorage.setItem("spelling-game-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    if (screen === "review") {
      saveGameScore();
    }
  }, [screen, saveGameScore]);

  const handleStartGame = () => {
    const firstQuestion = getRandomWord();
    setScreen("playing");
    setQuestion(firstQuestion);
    setRound(1);
    setScore(0);
    setScoreSaved(false);
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setFeedback("Tap the mic and spell the word");
    setVoiceError("");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  if (!isSupported) {
    return (
      <div className="spelling-screen">
        <div className="spelling-card-simple">
          <h2>Spelling Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="spelling-screen intro-screen">
        <div className="overlay"></div>

        <div className="top-icons">
          <button className="circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="intro-card spelling-intro-card">
          <div className="board-icon-wrap">
            <div className="board-icon spelling-board-icon">
              <div className="mini-board spelling-mini-board">ABC</div>
            </div>
          </div>

          <p className="section-label">LEARNING GAME</p>
          <h1 className="game-title">Spelling Game</h1>

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
                <h3>Voice spelling</h3>
                <p>See the word and spell it aloud using your voice</p>
              </div>
            </div>
          </div>

          <button className="start-btn spelling-start-btn" onClick={handleStartGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="spelling-screen review-screen">
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
            <div className="review-row" key={`${item.clue}-${index}`}>
              <div className={`review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="review-content">
                <p className="review-question">{item.clue}</p>
                <p className="review-answer-line">
                  <span className="correct-answer">{item.targetWord} ✓</span>
                  {!item.isCorrect && (
                    <span className="wrong-answer"> {item.userAnswer} ✕</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button className="start-btn spelling-start-btn review-btn" onClick={handleRetryGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="spelling-screen play-screen">
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

      <div className="spelling-clue-card">
        <p className="section-label">CLUE</p>
        <h2 className="spelling-clue">{question.clue}</h2>
      </div>

      <div className="spelling-show-word">
        {question.word.split("").map((letter, index) => (
          <span key={`${letter}-${index}`} className="spelling-show-letter">
            {letter}
          </span>
        ))}
      </div>

      <div className="spelling-answer-box">
        {question.word.split("").map((_, index) => (
          <span key={index} className="spelling-letter-slot">
            {spokenText[index] || ""}
          </span>
        ))}
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
            {isListening ? "Listening..." : "Speak Spelling"}
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

        <div className={`feedback-text ${feedback.includes("Correct") ? "good" : "warn"}`}>
          {feedback}
        </div>

        {voiceError && <div className="voice-error">{voiceError}</div>}
      </div>
    </div>
  );
}

export default SpellingGame;
