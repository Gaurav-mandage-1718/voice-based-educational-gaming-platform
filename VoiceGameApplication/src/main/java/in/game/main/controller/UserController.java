package in.game.main.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import in.game.main.dto.ApiResponse;
import in.game.main.dto.ScoreRequest;
import in.game.main.entity.User;
import in.game.main.repository.GameRepository;
import in.game.main.repository.UserRepository;
import in.game.main.service.ScoreService;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private ScoreService service;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private GameRepository gameRepo;

    @GetMapping("/games/active")
    public ApiResponse activeGames() {
        return new ApiResponse("Active Games", gameRepo.findByIsActiveTrue());
    }

    @GetMapping("/games/active/count")
    public ApiResponse activeGameCount() {
        return new ApiResponse("Active Games Count", gameRepo.countByIsActiveTrue());
    }

    @PostMapping("/play")
    public ApiResponse play(@RequestBody ScoreRequest req, Authentication auth) {
        String msg = service.saveScore(req, auth);
        return new ApiResponse(msg, null);
    }

    @GetMapping("/leaderboard")
    public ApiResponse leaderboard(@RequestParam(required = false) Long gameId) {
        return new ApiResponse("Leaderboard Data", service.getLeaderboard(gameId));
    }

    @GetMapping("/global-leaderboard")
    public ApiResponse globalLeaderboard() {
        return new ApiResponse("Global Leaderboard Data", service.getGlobalLeaderboard());
    }

    @GetMapping("/profile")
    public ApiResponse getProfile(Authentication auth) {
        String email = auth.getName();
        User user = userRepo.findByEmail(email);

        if (user == null) {
            return new ApiResponse("User not found", null);
        }

        return new ApiResponse("Profile fetched successfully", user);
    }
}