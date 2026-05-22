package in.game.main.service;

import in.game.main.dto.admin.*;
import in.game.main.entity.Game;
import in.game.main.entity.Role;
import in.game.main.entity.User;
import in.game.main.repository.GameRepository;
import in.game.main.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private GameRepository gameRepo;

    @Autowired
    private PasswordEncoder encoder;

    public List<User> getAllUsers() {
        return userRepo.findAll();
    }

    public List<Game> getAllGames() {
        return gameRepo.findAll();
    }

    public User addUser(UserCreateRequest req) {
        if (userRepo.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(req.getName());
        user.setEmail(req.getEmail());
        user.setPassword(encoder.encode(req.getPassword()));

        String roleValue =
            (req.getRole() == null || req.getRole().isBlank()) ? "USER" : req.getRole();

        user.setRole(Role.valueOf(roleValue.toUpperCase()));

        return userRepo.save(user);
    }

    public User updateUser(Long id, UserUpdateRequest req) {
        User user = userRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setUsername(req.getName());
        user.setEmail(req.getEmail());

        if (req.getRole() != null && !req.getRole().isBlank()) {
            user.setRole(Role.valueOf(req.getRole().toUpperCase()));
        }

        return userRepo.save(user);
    }

    public void deleteUser(Long id) {
        userRepo.deleteById(id);
    }

    public Game updateGame(Long id, GameUpdateRequest req) {
        Game game = gameRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Game not found"));

        game.setName(req.getName());
        game.setDescription(req.getDescription());

        return gameRepo.save(game);
    }

    public Game updateVisibility(Long id, GameVisibilityRequest req) {
        Game game = gameRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Game not found"));

        game.setIsActive(req.getIsActive());

        return gameRepo.save(game);
    }
}
