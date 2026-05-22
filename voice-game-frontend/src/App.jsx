import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import ProtectedRoute from "./pages/ProtectedRoute";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import VoiceWordMatch from "./pages/games/VoiceWordMatch";
import BasicMathGame from "./pages/games/BasicMathGame";
import GlobalLeaderboard from "./pages/GlobalLeaderboard";
import FindOperatorGame from "./pages/games/FindOperatorGame";
import TastyFractionsGame from "./pages/games/TastyFractionsGame";
import TrickyPercentagesGame from "./pages/games/TrickyPercentagesGame";
import QuizGame from "./pages/games/QuizGame";
import OddOneOutGame from "./pages/games/OddOneOutGame";
import SpellingGame from "./pages/games/SpellingGame";
import RhymeWordsGame from "./pages/games/RhymeWordsGame";
import FindMissingNumberGame from "./pages/games/FindMissingNumberGame";
import PhoneNumberMemoryGame from "./pages/games/PhoneNumberGame";
import SnakeVoiceGame from "./pages/games/SnakeVoiceGame";
import FanCountGame from "./pages/games/FanCountGame";
import LogicalPuzzleGame from "./pages/games/LogicalPuzzleGame";
import ColorChangeGame from "./pages/games/ColorChangeGame";
import MoveBallGame from "./pages/games/MoveBallGame";
import AdminDashboard from "./pages/admin/AdminDashboard";






function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/basic-math" element={<BasicMathGame />} />
        <Route path="/global-leaderboard" element={<GlobalLeaderboard />} />
        <Route path="/operator" element={<FindOperatorGame />} />
        <Route path="/Fractions" element={<TastyFractionsGame />} />
        <Route path="/Percentages" element={<TrickyPercentagesGame />} />
        <Route path="/quiz" element={<QuizGame />} />
        <Route path="/odd-one-out" element={<OddOneOutGame />} />
        <Route path="/spelling" element={<SpellingGame />} />
        <Route path="/rhyme-words" element={<RhymeWordsGame />} />
        <Route path="/find-missing-number" element={<FindMissingNumberGame />} />
        <Route path="/phone-number-memory" element={<PhoneNumberMemoryGame />} />
        <Route path="/snake-voice" element={<SnakeVoiceGame />} />
        <Route path="/fan-count" element={<FanCountGame />} />
        <Route path="/logical-puzzle" element={<LogicalPuzzleGame />} />
        <Route path="/color-change" element={<ColorChangeGame />} />
        <Route path="/move-ball" element={<MoveBallGame />} />
  
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRole="USER">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/voice-word-match"
          element={
            <ProtectedRoute allowedRole="USER">
              <VoiceWordMatch />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
