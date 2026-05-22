package in.game.main.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import in.game.main.entity.Game;

public interface GameRepository extends JpaRepository<Game, Long> {

    List<Game> findByIsActiveTrue();

    long countByIsActiveTrue();
}