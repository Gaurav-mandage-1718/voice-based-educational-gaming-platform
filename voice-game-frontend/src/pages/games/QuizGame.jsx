import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseChoiceAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./QuizGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 5;

const quizQuestions = [
  {
    question: "Which animal says meow?",
    options: ["Dog", "Cat", "Cow", "Duck"],
    answer: "Cat"
  },
  {
    question: "What color is a banana?",
    options: ["Blue", "Yellow", "Pink", "Black"],
    answer: "Yellow"
  },
  {
    question: "How many days are in a week?",
    options: ["5", "6", "7", "8"],
    answer: "7"
  },
  {
    question: "Which shape has 3 sides?",
    options: ["Square", "Circle", "Triangle", "Rectangle"],
    answer: "Triangle"
  },
  {
    question: "What do we use to write on paper?",
    options: ["Spoon", "Pencil", "Plate", "Shoe"],
    answer: "Pencil"
  },
  {
    question: "Which one can fly?",
    options: ["Bird", "Fish", "Lion", "Elephant"],
    answer: "Bird"
  },
  {
    question: "What comes after 9?",
    options: ["8", "10", "11", "12"],
    answer: "10"
  },
  {
    question: "Which fruit is red?",
    options: ["Apple", "Banana", "Grapes", "Coconut"],
    answer: "Apple"
  }
];

function getRandomQuestion() {
  return quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
}

function normalizeQuizAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ");
}

function QuizGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [question, setQuestion] = useState(getRandomQuestion());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("quiz-game-best") || 0)
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Say the correct answer or tap an option");
  const [history, setHistory] = useState([]);
  const [voiceError, setVoiceError] = useState("");
  const [selectedOption, setSelectedOption] = useState("");

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
    setQuestion(getRandomQuestion());
    setSpokenText("");
    setSelectedOption("");
    setFeedback("Say the correct answer");
    setVoiceError("");
  }, [round, finishGame]);

  const checkAnswer = useCallback(
    (rawAnswer) => {
      const matchedChoice = parseChoiceAnswer(rawAnswer, question.options);
      const normalizedUser = matchedChoice || normalizeQuizAnswer(rawAnswer);
      const normalizedCorrect = question.answer;
      const isCorrect = matchedChoice === normalizedCorrect;

      setHistory((prev) => [
        ...prev,
        {
          question: question.question,
          correctAnswer: question.answer,
          userAnswer: matchedChoice || String(rawAnswer).trim(),
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
      const matchedChoice = parseChoiceAnswer(transcript, question.options);
      setSpokenText(matchedChoice || transcript);
      setVoiceError("");
      checkAnswer(matchedChoice || transcript);
    },
    [checkAnswer, question.options]
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
      localStorage.setItem("quiz-game-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    if (screen === "review") {
      saveGameScore();
    }
  }, [screen, saveGameScore]);

  const handleStartGame = () => {
    setScreen("playing");
    setQuestion(getRandomQuestion());
    setRound(1);
    setScore(0);
    setScoreSaved(false);
    setSaveStatus("");
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setSpokenText("");
    setSelectedOption("");
    setFeedback("Say the correct answer or tap an option");
    setVoiceError("");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setSpokenText(option);
    checkAnswer(option);
  };

  if (!isSupported) {
    return (
      <div className="quiz-screen">
        <div className="quiz-simple-card">
          <h2>Quiz Game</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="quiz-screen quiz-intro-screen">
        <div className="quiz-bg-orb quiz-orb-one"></div>
        <div className="quiz-bg-orb quiz-orb-two"></div>

        <div className="quiz-topbar">
          <button className="quiz-icon-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="quiz-intro-card">
          <h1 className="quiz-title">Quiz Game</h1>
         

          <div className="quiz-intro-stats">
            <div className="quiz-stat">
              <span>BEST SCORE</span>
              <strong>{bestScore || "-"}</strong>
            </div>

            <div className="quiz-stat">
              <span>RANK</span>
              <strong>{rankLabel}</strong>
            </div>
          </div>

          <div className="quiz-skill-box">
            <div>
              <h3>Skills trained</h3>
              <p>Listening, memory, vocabulary, and quick thinking</p>
            </div>
          </div>

          <button className="quiz-start-btn" onClick={handleStartGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="quiz-screen quiz-review-screen">
        <div className="quiz-review-header">
          <button className="quiz-back-text-btn" onClick={() => navigate("/user")}>
            ←
          </button>
          <h2>Review performance</h2>
        </div>

        <div className="quiz-review-summary">
          <div className="quiz-summary-pill">Score: {score}</div>
          <div className="quiz-summary-pill">
            Correct: {history.filter((item) => item.isCorrect).length}
          </div>
          <div className="quiz-summary-pill">Rounds: {history.length}</div>
        </div>

        {saveStatus && <div className="quiz-save-status">{saveStatus}</div>}

        <div className="quiz-review-list">
          {history.map((item, index) => (
            <div className="quiz-review-row" key={`${item.question}-${index}`}>
              <div className={`quiz-review-status ${item.isCorrect ? "ok" : "bad"}`}>
                {item.isCorrect ? "✓" : "✕"}
              </div>

              <div className="quiz-review-content">
                <p className="quiz-review-question">{item.question}</p>
                <p className="quiz-review-answer-line">
                  <span className="quiz-correct-answer">{item.correctAnswer} ✓</span>
                  {!item.isCorrect && (
                    <span className="quiz-wrong-answer"> {item.userAnswer} ✕</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button className="quiz-start-btn quiz-review-btn" onClick={handleRetryGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-screen quiz-play-screen">
      <div className="quiz-topbar">
        <button className="quiz-icon-btn" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="quiz-progress">
          <span>{String(timeLeft).padStart(2, "0")}s</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>

        <button className="quiz-icon-btn">?</button>
      </div>

      <div className="quiz-question-card">
        <h2>{question.question}</h2>
      </div>

      <div className="quiz-speech-card">
        <span>You said</span>
        <strong>{spokenText || "..."}</strong>
      </div>

      <div className="quiz-voice-row">
        <button
          className={`quiz-voice-btn ${isListening ? "active" : ""}`}
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? "Listening..." : "Speak Answer"}
        </button>

        <button
          className="quiz-retry-btn"
          onClick={() => {
            setSpokenText("");
            setSelectedOption("");
            setVoiceError("");
            setFeedback("Try again");
          }}
        >
          Retry
        </button>
      </div>

      <div className={`quiz-feedback ${feedback.includes("Correct") ? "good" : "warn"}`}>
        {feedback}
      </div>

      {voiceError && <div className="quiz-voice-error">{voiceError}</div>}

      <div className="quiz-options-grid">
        {question.options.map((option) => (
          <button
            key={option}
            className={`quiz-option-card ${
              selectedOption === option ? "selected" : ""
            }`}
            onClick={() => handleOptionClick(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuizGame;
