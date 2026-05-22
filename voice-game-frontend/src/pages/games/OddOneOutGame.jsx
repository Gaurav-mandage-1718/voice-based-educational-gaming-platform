import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseChoiceAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./OddOneOutGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 16;

const QUESTION_BANK = [
  { category: "Fruits", options: ["Apple", "Banana", "Orange", "Car"], answer: "Car" },
  { category: "Animals", options: ["Dog", "Cat","Table", "Tiger", ], answer: "Table" },
  { category: "Colors", options: [ "Bread","Red", "Blue", "Green"], answer: "Bread" },
  { category: "Body Parts", options: ["Hand", "Chair", "Leg", "Eye"], answer: "Chair" },
  { category: "Transport", options: ["Bus", "Car", "Train", "Potato"], answer: "Potato" },
  { category: "School", options: ["Pen", "Book","Lion", "Eraser"], answer: "Lion" },
  { category: "Kitchen", options: ["Elephant","Plate", "Spoon", "Glass"], answer: "Elephant" },
  { category: "Clothes", options: ["Shirt", "Pants", "Socks", "Banana"], answer: "Banana" },
  { category: "Shapes", options: ["Circle", "Square",  "Dog","Triangle"], answer: "Dog" },
  { category: "Nature", options: ["Tree", "Laptop","River", "Mountain"], answer: "Laptop" }
];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

function OddOneOutGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(Number(localStorage.getItem("odd-one-out-best") || 0));
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState("Say or tap the odd one out");
  const [history, setHistory] = useState([]);
  const [voiceError, setVoiceError] = useState("");
  const [selectedOption, setSelectedOption] = useState("");

  const question = questions[index];
  const round = index + 1;

  const rankLabel = useMemo(() => {
    if (score >= 70) return "A";
    if (score >= 50) return "B";
    if (score >= 30) return "C";
    return "-";
  }, [score]);

  const startGame = () => {
    setQuestions(shuffle(QUESTION_BANK).slice(0, TOTAL_ROUNDS));
    setIndex(0);
    setScore(0);
    setScreen("playing");
    setTimeLeft(ROUND_TIME);
    setHistory([]);
    setScoreSaved(false);
    setSpokenText("");
    setFeedback("Say or tap the odd one out");
    setVoiceError("");
    setSelectedOption("");
  };

  const finishGame = useCallback(() => {
    speakText("Game over");
    setScreen("review");
  }, []);

  const goNext = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      finishGame();
      return;
    }
    setIndex((p) => p + 1);
    setSpokenText("");
    setFeedback("Next question ready");
    setVoiceError("");
    setSelectedOption("");
  }, [round, finishGame]);

  const checkAnswer = useCallback(
    (rawAnswer) => {
      if (!question) return;

      const matchedChoice = parseChoiceAnswer(rawAnswer, question.options);
      const isCorrect = matchedChoice === question.answer;

      if (isCorrect) {
        setHistory((prev) => [
          ...prev,
          {
            category: question.category,
            options: question.options.join(", "),
            correctAnswer: question.answer,
            userAnswer: matchedChoice || String(rawAnswer),
            isCorrect: true
          }
        ]);
        setFeedback("Correct ✅");
        speakText("Correct");
        setScore((prev) => prev + 10);
        window.setTimeout(goNext, 700);
      } else {
        setFeedback("Wrong ❌ Try again");
        speakText("Wrong. Please try again.");
      }
    },
    [question, goNext]
  );

  const handleVoiceResult = useCallback(
    (transcript) => {
      const matchedChoice = parseChoiceAnswer(transcript, question?.options || []);
      setSpokenText(matchedChoice || transcript);
      setVoiceError("");
      checkAnswer(matchedChoice || transcript);
    },
    [checkAnswer, question]
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


  const { isSupported, isListening, startListening, stopListening } = useSpeechRecognition({
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
    const t = window.setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => window.clearTimeout(t);
  }, [screen, timeLeft, finishGame]);

  useEffect(() => {
    if (screen === "review" && score > bestScore) {
      setBestScore(score);
      localStorage.setItem("odd-one-out-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    const save = async () => {
      if (screen !== "review" || scoreSaved || score <= 0) return;
      try {
        await api.post("/user/play", { gameId: GAME_ID, score });
        setScoreSaved(true);
      } catch (e) {
        console.error("Failed to save score:", e);
      }
    };
    save();
  }, [screen, score, scoreSaved]);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setSpokenText(option);
    checkAnswer(option);
  };

  if (screen === "intro") {
    return (
      <div className="odd-screen">
        <div className="odd-topbar">
          <button className="odd-btn" onClick={() => navigate("/user")}>Back</button>
        </div>

        <div className="odd-card">
          <p className="odd-kicker">LEARNING & MEMORY</p>
          <h1>Odd One Out</h1>
          <p>Pick the word that does not belong to the group.</p>
          {!isSupported && <p className="odd-note">Voice not supported. You can still play with tap options.</p>}

          <div className="odd-stats">
            <div><span>BEST</span><strong>{bestScore || "-"}</strong></div>
            <div><span>RANK</span><strong>{rankLabel}</strong></div>
          </div>

          <button className="odd-start" onClick={startGame}>Start</button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="odd-screen">
        <div className="odd-review">
          <button className="odd-back" onClick={() => navigate("/user")}>←</button>
          <h2>Review Performance</h2>
          <div className="odd-pills">
            <span>Score: {score}</span>
            <span>Correct: {history.filter((h) => h.isCorrect).length}</span>
            <span>Rounds: {history.length}</span>
          </div>

          <div className="odd-list">
            {history.map((item, i) => (
              <div key={i} className="odd-row">
                <div className="odd-mark ok">✓</div>
                <div>
                  <p><strong>Category:</strong> {item.category}</p>
                  <p><strong>Options:</strong> {item.options}</p>
                  <p><strong>Answer:</strong> {item.correctAnswer}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="odd-start" onClick={startGame}>Play Again</button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="odd-screen">
      <div className="odd-topbar">
        <button className="odd-btn" onClick={() => navigate("/user")}>❚❚</button>
        <div className="odd-progress">
          <span>{String(timeLeft).padStart(2, "0")}s</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>
      </div>

      <div className="odd-card play">
        <p className="odd-kicker">Find the different word</p>
        <h1>{question.category}</h1>

        <div className="odd-voice">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>

        <div className="odd-actions">
          <button
            className={`odd-voice-btn ${isListening ? "active" : ""}`}
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
          >
            {!isSupported ? "Voice Unavailable" : isListening ? "Listening..." : "Speak"}
          </button>

          <button
            className="odd-btn"
            onClick={() => {
              setSpokenText("");
              setVoiceError("");
              setSelectedOption("");
              setFeedback("Try again");
            }}
          >
            Retry
          </button>
        </div>

        <p className={`odd-feedback ${feedback.includes("Correct") ? "good" : "warn"}`}>{feedback}</p>
        {voiceError && <p className="odd-error">{voiceError}</p>}

        <div className="odd-grid">
          {question.options.map((option) => (
            <button
              key={option}
              className={`odd-option ${selectedOption === option ? "selected" : ""}`}
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OddOneOutGame;
