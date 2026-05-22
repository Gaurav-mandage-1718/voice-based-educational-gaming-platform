package in.game.main.dto;

import lombok.Data;

@Data
public class ScoreRequest {
    private Long gameId;
    private int score;
}
