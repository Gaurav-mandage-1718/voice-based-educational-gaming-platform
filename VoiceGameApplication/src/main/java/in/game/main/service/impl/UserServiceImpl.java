package in.game.main.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import in.game.main.dto.*;
import in.game.main.entity.*;
import in.game.main.repository.UserRepository;
import in.game.main.service.UserService;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository repo;

    @Autowired
    private PasswordEncoder encoder;

    public User register(RegisterRequest req) {
        User u = new User();
        u.setUsername(req.getUsername());
        u.setEmail(req.getEmail());
        u.setPassword(encoder.encode(req.getPassword()));
        u.setRole(Role.USER);
        return repo.save(u);
    }

    public User login(LoginRequest req) {
        User u = repo.findByEmail(req.getEmail());
        if(u != null && encoder.matches(req.getPassword(), u.getPassword()))
            return u;

        return null;
    }

    @Override
    public User adminLogin(LoginRequest req) {

        User user = repo.findByEmail(req.getEmail());

        if(user != null &&
           encoder.matches(req.getPassword(), user.getPassword()) &&
           user.getRole() == Role.ADMIN) {

            return user;
        }

        return null;
    }
}