package in.game.main.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import in.game.main.dto.*;
import in.game.main.entity.User;
import in.game.main.service.UserService;
import in.game.main.util.JwtUtil;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService service;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ApiResponse register(@RequestBody RegisterRequest req)
    {
        return new ApiResponse("User Registered Successfully", service.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req)
    {
        User user = service.login(req);

        if(user != null) {

            String token = jwtUtil.generateToken(user.getEmail());

            return ResponseEntity.ok(
                new ApiResponse("Login Successful", Map.of(
                    "token", token,
                    "role", user.getRole()
                ))
            );
        }

        return ResponseEntity.status(401)
                .body(new ApiResponse("Invalid Credentials", null));
    }
}