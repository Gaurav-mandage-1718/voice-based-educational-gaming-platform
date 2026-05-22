package in.game.main.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LeaderboardDTO {
    private String username;
    private int score;
}
