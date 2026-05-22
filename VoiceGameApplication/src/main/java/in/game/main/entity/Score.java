package in.game.main.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int scoreValue;

    private LocalDateTime playedAt;

    @ManyToOne
    private User user;

    @ManyToOne
    private Game game;
}
