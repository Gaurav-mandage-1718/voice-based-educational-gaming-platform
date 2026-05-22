package in.game.main.controller;

import in.game.main.dto.ApiResponse;
import in.game.main.dto.LoginRequest;
import in.game.main.dto.admin.*;
import in.game.main.entity.Role;
import in.game.main.entity.User;
import in.game.main.service.AdminService;
import in.game.main.service.UserService;
import in.game.main.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminController {

    @Autowired private AdminService adminService;
    @Autowired private UserService userService;
    @Autowired private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ApiResponse adminLogin(@RequestBody LoginRequest req) {
        User admin = userService.adminLogin(req);

        if (admin != null && admin.getRole() == Role.ADMIN) {
            String token = jwtUtil.generateToken(admin.getEmail());
            return new ApiResponse("Admin Login Successful", token);
        }

        return new ApiResponse("Invalid Admin Credentials", null);
    }


    @GetMapping("/users")
    public ApiResponse getUsers() {
        return new ApiResponse("User List", adminService.getAllUsers());
    }

    @PostMapping("/users")
    public ApiResponse addUser(@RequestBody UserCreateRequest req) {
        return new ApiResponse("User Added Successfully", adminService.addUser(req));
    }

    @PutMapping("/users/{id}")
    public ApiResponse updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest req) {
        return new ApiResponse("User Updated Successfully", adminService.updateUser(id, req));
    }

    @DeleteMapping("/users/{id}")
    public ApiResponse deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return new ApiResponse("User Deleted Successfully", null);
    }

    @GetMapping("/games")
    public ApiResponse getGames() {
        return new ApiResponse("Game List", adminService.getAllGames());
    }

    @PutMapping("/games/{id}")
    public ApiResponse updateGame(@PathVariable Long id, @RequestBody GameUpdateRequest req) {
        return new ApiResponse("Game Updated Successfully", adminService.updateGame(id, req));
    }

    @PutMapping("/games/{id}/visibility")
    public ApiResponse updateVisibility(@PathVariable Long id, @RequestBody GameVisibilityRequest req) {
        return new ApiResponse("Game Visibility Updated", adminService.updateVisibility(id, req));
    }
}
