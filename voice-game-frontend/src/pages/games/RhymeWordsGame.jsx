import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseWordAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./RhymeWordsGame.css";

const TOTAL_ROUNDS = 5;
const ROUND_TIME = 60;
const GAME_ID = 11;

const rhymeBank = [
  { word: "CAT", rhymes: ["BAT", "HAT", "MAT", "RAT"] },
  { word: "SUN", rhymes: ["FUN", "RUN", "BUN", "GUN"] },
  { word: "DOG", rhymes: ["FOG", "LOG"] },
  { word: "BALL", rhymes: ["TALL", "CALL", "SMALL"] },
  { word: "BOOK", rhymes: ["LOOK", "COOK", "HOOK", "TOOK"] },
  { word: "STAR", rhymes: ["CAR", "FAR"] },
  { word: "TREE", rhymes: ["BEE", "SEE", "FREE"] },
  { word: "MOON", rhymes: ["SOON", "NOON"] }
];

function getRandomRhyme() {
  return rhymeBank[Math.floor(Math.random() * rhymeBank.length)];
}

function RhymeWordsGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [question, setQuestion] = useState(getRandomRhyme());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("rhyme-words-best") || 0)
  );
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Say a rhyming word");
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

    setRound((prev) => prev + 1);
    setQuestion(getRandomRhyme());
    setSpokenText("");
    setFeedback("Say a rhyming word");
    setVoiceError("");
  }, [round, finishGame]);

  const checkAnswer = useCallback(
    (rawAnswer) => {
      const normalizedUser = parseWordAnswer(rawAnswer);
      const allowedAnswers = question.rhymes.map((item) => parseWordAnswer(item));
      const isCorrect = allowedAnswers.includes(normalizedUser);

      setHistory((prev) => [
        ...prev,
        {
          question: question.word,
          correctAnswer: question.rhymes.join(", "),
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
      localStorage.setItem("rhyme-words-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    if (screen === "review") {
      saveGameScore();
    }
  }, [screen, saveGameScore]);

  const handleStartGame = () => {
    setScreen("playing");
    setQuestion(getRandomRhyme());
    setRound(1);
    setScore(0);
    setScoreSaved(false);
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setFeedback("Say a rhyming word");
    setVoiceError("");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  if (!isSupported) {
    return (
      <div className="rhyme-screen">
        <div className="rhyme-card-simple">
          <h2>Rhyme Words Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="rhyme-screen intro-screen">
        <div className="overlay"></div>

        <div className="top-icons">
          <button className="circle-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="intro-card">
          <div className="board-icon-wrap">
            <div className="board-icon">
              <div className="mini-board">A-A</div>
            </div>
          </div>

          <p className="section-label">RHYME GAME</p>
          <h1 className="game-title">Rhyme words</h1>

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
              <div className="skill-icon">♪</div>
              <div>
                <h3>Rhyming</h3>
                <p>Say a word that sounds similar at the end</p>
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
      <div className="rhyme-screen review-screen">
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
                <p className="review-question">Word: {item.question}</p>
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
    <div className="rhyme-screen play-screen">
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

      <div className="rhyme-chalkboard-wrap">
        <div className="rhyme-chalkboard">
          <div className="rhyme-chalk-label">Say a word that rhymes with</div>
          <div className="rhyme-chalk-text">{question.word}</div>
        </div>
        <div className="rhyme-chalk-shelf">
          <div className="rhyme-chalk-piece"></div>
          <div className="rhyme-eraser"></div>
        </div>
      </div>

      <div className="rhyme-voice-panel">
        <div className="rhyme-spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="voice-actions">
          <button
            className={`voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? "Listening..." : "Speak Rhyme"}
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
    </div>
  );
}

export default RhymeWordsGame;
