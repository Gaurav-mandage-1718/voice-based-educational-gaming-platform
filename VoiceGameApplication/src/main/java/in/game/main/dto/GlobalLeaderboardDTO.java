package in.game.main.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GlobalLeaderboardDTO {
    private String username;
    private Long totalScore;
}
