package in.game.main.service;

import in.game.main.dto.*;
import in.game.main.entity.User;

public interface UserService {
	    User register(RegisterRequest req);
	    User login(LoginRequest req);
	    User adminLogin(LoginRequest req);
	}
