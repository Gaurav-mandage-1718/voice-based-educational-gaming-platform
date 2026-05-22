package in.game.main.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import in.game.main.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
    User findByEmail(String email);
    boolean existsByEmail(String email);
}