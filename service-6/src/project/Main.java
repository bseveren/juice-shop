package project;

public class Main {
    public static void main(String[] args) {
        String input = (String) Util.sanitizeSqlInput(args[0]);
        Database.query(input);
    }
}