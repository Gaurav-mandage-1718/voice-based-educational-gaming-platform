package in.game.main.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import in.game.main.repository.GameRepository;
import in.game.main.repository.UserRepository;

@RestController
public class StatsController {

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/api/games/count")
    public long getGamesCount() {
        return gameRepository.count();
    }

    @GetMapping("/api/users/count")
    public long getUsersCount() {
        return userRepository.count();
    }
}
