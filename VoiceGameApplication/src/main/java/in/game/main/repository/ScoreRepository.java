package in.game.main.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import in.game.main.dto.LeaderboardDTO;
import in.game.main.entity.Score;

public interface ScoreRepository extends JpaRepository<Score, Long> {

    @Query("""
        SELECT new in.game.main.dto.LeaderboardDTO(u.username, MAX(s.scoreValue))
        FROM Score s
        JOIN s.user u
        WHERE (:gameId IS NULL OR s.game.id = :gameId)
        GROUP BY u.id, u.username
        ORDER BY MAX(s.scoreValue) DESC
    """)
    List<LeaderboardDTO> getLeaderboard(Long gameId);

    @Query(value = """
        SELECT u.username AS username, SUM(best_scores.best_score) AS totalScore
        FROM user u
        JOIN (
            SELECT s.user_id, s.game_id, MAX(s.score_value) AS best_score
            FROM score s
            GROUP BY s.user_id, s.game_id
        ) best_scores ON u.id = best_scores.user_id
        GROUP BY u.id, u.username
        ORDER BY totalScore DESC
    """, nativeQuery = true)
    List<Object[]> getGlobalLeaderboardRaw();
}
