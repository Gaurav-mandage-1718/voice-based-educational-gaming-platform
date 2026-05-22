package in.game.main.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    private String username;

    @Email
    private String email;

    @Size(min = 6)
    private String password;
}