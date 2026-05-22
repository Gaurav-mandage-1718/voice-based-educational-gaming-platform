package in.game.main.service.impl;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import in.game.main.dto.GlobalLeaderboardDTO;
import in.game.main.dto.LeaderboardDTO;
import in.game.main.dto.ScoreRequest;
import in.game.main.entity.Game;
import in.game.main.entity.Score;
import in.game.main.entity.User;
import in.game.main.repository.GameRepository;
import in.game.main.repository.ScoreRepository;
import in.game.main.repository.UserRepository;
import in.game.main.service.ScoreService;

@Service
public class ScoreServiceImpl implements ScoreService {

    @Autowired
    private ScoreRepository scoreRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private GameRepository gameRepo;

    @Override
    public String saveScore(ScoreRequest req, Authentication auth) {
        String email = auth.getName();
        User user = userRepo.findByEmail(email);

        if (user == null) {
            return "User not found";
        }

        Game game = gameRepo.findById(req.getGameId()).orElse(null);
        if (game == null) {
            return "Game not found";
        }

        Score score = new Score();
        score.setScoreValue(req.getScore());
        score.setPlayedAt(LocalDateTime.now());
        score.setUser(user);
        score.setGame(game);

        scoreRepo.save(score);

        return "Score Saved Successfully";
    }

    @Override
    public List<LeaderboardDTO> getLeaderboard(Long gameId) {
        return scoreRepo.getLeaderboard(gameId);
    }

    @Override
    public List<GlobalLeaderboardDTO> getGlobalLeaderboard() {
        List<Object[]> rows = scoreRepo.getGlobalLeaderboardRaw();

        return rows.stream()
                .map(row -> new GlobalLeaderboardDTO(
                        String.valueOf(row[0]),
                        ((Number) row[1]).longValue()
                ))
                .toList();
    }
}
