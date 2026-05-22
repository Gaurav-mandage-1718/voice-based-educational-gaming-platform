import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import { parseNumberAnswer } from "../../utils/speech/parsers";
import { speakText } from "../../utils/speakText";
import api from "../../api/axios";
import "./TrickyPercentagesGame.css";

const TOTAL_ROUNDS = 7;
const ROUND_TIME = 60;
const GAME_ID = 9;

function generateQuestion() {
  const percentages = [10, 20, 25, 50, 75];
  const percent = percentages[Math.floor(Math.random() * percentages.length)];

  let number = 0;

  if (percent === 10) number = (Math.floor(Math.random() * 9) + 2) * 10;
  if (percent === 20) number = (Math.floor(Math.random() * 9) + 2) * 5;
  if (percent === 25) number = (Math.floor(Math.random() * 9) + 2) * 4;
  if (percent === 50) number = Math.floor(Math.random() * 40) + 10;
  if (percent === 75) number = (Math.floor(Math.random() * 9) + 2) * 4;

  const answer = String((percent * number) / 100);

  return {
    percent,
    number,
    answer,
    label: `${percent}% of ${number}`
  };
}

function TrickyPercentagesGame() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState("intro");
  const [question, setQuestion] = useState(generateQuestion());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [bestScore, setBestScore] = useState(
    Number(localStorage.getItem("tricky-percentages-best") || 0)
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [spokenText, setSpokenText] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [feedback, setFeedback] = useState("Say or type the answer");
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
    setTypedAnswer("");
    setFeedback("Say or type the answer");
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
      setTypedAnswer(normalizedTranscript || "");
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
      localStorage.setItem("tricky-percentages-best", String(score));
    }
  }, [screen, score, bestScore]);

  useEffect(() => {
    if (screen === "review") {
      saveGameScore();
    }
  }, [screen, saveGameScore]);

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
    setTypedAnswer("");
    setFeedback("Say or type the answer");
    setVoiceError("");
  };

  const handleRetryGame = () => {
    handleStartGame();
  };

  const handleSubmit = () => {
    if (!typedAnswer) return;
    setSpokenText(typedAnswer);
    checkAnswer(typedAnswer);
  };

  if (!isSupported) {
    return (
      <div className="percent-screen">
        <div className="percent-card-simple">
          <h2>Tricky Percentages</h2>
          <p>Your browser does not support speech recognition.</p>
        </div>
      </div>
    );
  }

  if (screen === "intro") {
    return (
      <div className="percent-screen intro-screen">
        <div className="percent-topbar intro-topbar">
          <button className="percent-icon-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="percent-intro-card">
          <div className="percent-note-card">
            <div className="percent-note-lines"></div>
            <div className="percent-note-content">
              <div className="percent-problem">
                <span className="percent-value">{question.percent}%</span>
                <span className="percent-of">of</span>
                <span className="percent-number">{question.number}</span>
              </div>
            </div>
          </div>

          <p className="percent-instruction">
            Calculate the percentage of the given number
          </p>

          <div className="percent-intro-stats">
            <div>
              <span>BEST SCORE</span>
              <strong>{bestScore || "-"}</strong>
            </div>
            <div>
              <span>RANK</span>
              <strong>{rankLabel}</strong>
            </div>
          </div>

          <div className="skills-box">
            <p className="section-label">SKILLS TRAINED</p>

            <div className="skill-item">
              <div className="skill-icon">✎</div>
              <div>
                <h3>Quick percentage calculation</h3>
                <p>Solve percentage questions using voice or typed answer</p>
              </div>
            </div>
          </div>

          <button className="percent-start-btn" onClick={handleStartGame}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (screen === "review") {
    return (
      <div className="percent-screen review-screen">
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

        <button className="percent-start-btn review-btn" onClick={handleRetryGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="percent-screen play-screen">
      <div className="percent-topbar">
        <button className="percent-icon-btn" onClick={() => navigate("/user")}>
          ❚❚
        </button>

        <div className="percent-progress">
          <span>{String(timeLeft).padStart(2, "0")}</span>
          <span>{round}/{TOTAL_ROUNDS}</span>
          <span>{score}</span>
        </div>

        <button className="percent-icon-btn" onClick={handleSubmit}>
          ✓
        </button>
      </div>

      <div className="percent-note-card play-note">
        <div className="percent-note-lines"></div>
        <div className="percent-note-content">
          <div className="percent-problem">
            <span className="percent-value">{question.percent}%</span>
            <span className="percent-of">of</span>
            <span className="percent-number">{question.number}</span>
          </div>
        </div>
      </div>

      <div className="percent-answer-box">{typedAnswer || " "}</div>

      <div className="voice-panel">
        <div className="spoken-bubble">
          <span>You said</span>
          <strong>{spokenText || "..."}</strong>
        </div>
      </div>

      <div className="percent-voice-panel">
        <button
          className={`voice-btn ${isListening ? "active" : ""}`}
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? "Listening..." : "Speak Answer"}
        </button>

        <button
          className="retry-btn"
          onClick={() => {
            setTypedAnswer("");
            setSpokenText("");
            setVoiceError("");
            setFeedback("Try again");
          }}
        >
          Retry
        </button>
      </div>

      <div
        className={`feedback-text ${feedback.includes("Correct") ? "good" : "warn"}`}
      >
        {feedback}
      </div>

      {voiceError && <div className="voice-error">{voiceError}</div>}
    </div>
  );
}

export default TrickyPercentagesGame;
