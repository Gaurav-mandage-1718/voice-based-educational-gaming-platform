import { useCallback, useEffect, useRef, useState } from "react";

function useSpeechRecognition({
  onResult,
  onError,
  autoRestart = false,
  maxListeningTime = 4000
} = {}) {
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const hasCapturedSpeechRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const timeoutRef = useRef(null);

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText("");
      hasCapturedSpeechRef.current = false;

      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        recognition.stop();
      }, maxListeningTime);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim() || "";

        if (!transcript) continue;

        hasCapturedSpeechRef.current = true;

        if (result.isFinal) {
          finalTranscript += ` ${transcript}`;
        } else {
          interimTranscript += ` ${transcript}`;
        }
      }

      const cleanedFinal = finalTranscript.trim();
      const cleanedInterim = interimTranscript.trim();

      if (cleanedInterim) {
        setInterimText(cleanedInterim);
      }

      if (cleanedFinal) {
        window.clearTimeout(timeoutRef.current);
        setInterimText("");
        shouldRestartRef.current = false;
        recognition.stop();

        onResultRef.current?.(cleanedFinal, {
          isFinal: true
        });
      }
    };

    recognition.onerror = (event) => {
      window.clearTimeout(timeoutRef.current);
      setIsListening(false);

      if (event.error === "aborted") return;

      if (event.error === "no-speech") {
        if (!hasCapturedSpeechRef.current) {
          onErrorRef.current?.("No speech detected. Please speak a little louder and try again.");
        }
        return;
      }

      if (event.error === "audio-capture") {
        onErrorRef.current?.("Microphone is not available.");
        return;
      }

      if (event.error === "not-allowed") {
        onErrorRef.current?.("Microphone permission denied.");
        return;
      }

      if (event.error === "network") {
        onErrorRef.current?.("Speech recognition network issue.");
        return;
      }

      onErrorRef.current?.(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      window.clearTimeout(timeoutRef.current);
      setIsListening(false);
      setInterimText("");

      if (autoRestart && shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (error) {
          console.error("Recognition restart failed:", error);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      window.clearTimeout(timeoutRef.current);
      shouldRestartRef.current = false;
      recognition.onend = null;
      recognition.stop();
    };
  }, [autoRestart, maxListeningTime]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    shouldRestartRef.current = autoRestart;
    hasCapturedSpeechRef.current = false;
    setInterimText("");

    try {
      recognition.start();
    } catch (error) {
      console.error("Recognition start failed:", error);
    }
  }, [autoRestart]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    window.clearTimeout(timeoutRef.current);
    shouldRestartRef.current = false;
    recognition.stop();
    setIsListening(false);
    setInterimText("");
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    startListening,
    stopListening
  };
}

export default useSpeechRecognition;
