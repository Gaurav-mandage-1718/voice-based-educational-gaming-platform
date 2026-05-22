package in.game.main.exception;

public class GameNotFoundException extends RuntimeException {
    public GameNotFoundException(String msg) {
        super(msg);
    }
}