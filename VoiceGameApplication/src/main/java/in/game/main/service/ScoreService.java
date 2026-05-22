package in.game.main.service;

import java.util.List;

import org.springframework.security.core.Authentication;

import in.game.main.dto.GlobalLeaderboardDTO;
import in.game.main.dto.LeaderboardDTO;
import in.game.main.dto.ScoreRequest;

public interface ScoreService {

    String saveScore(ScoreRequest req, Authentication auth);

    List<LeaderboardDTO> getLeaderboard(Long gameId);

    List<GlobalLeaderboardDTO> getGlobalLeaderboard();
}
