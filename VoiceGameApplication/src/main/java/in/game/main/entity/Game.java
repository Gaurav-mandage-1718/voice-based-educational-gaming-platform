package in.game.main.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    
    @Column(name = "is_active")
    private Boolean isActive = true;

}