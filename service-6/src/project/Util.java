package project;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

public class Util {
    private static final Pattern ALLOWED_PATTERN = Pattern.compile("^[a-zA-Z0-9\\s.]+$");
    private static final int MAX_LENGTH = 100;
    private static final List<String> ALLOWED_STRING_VALUES = Arrays.asList(
            "admin", "user", "guest", "public", "private", "active", "inactive",
            "pending", "approved", "rejected", "draft", "published"
    );

    public static String sanitizeSqlInput(String userInput) {
        // Add comment
        if (userInput == null) {
            throw new IllegalArgumentException("Input cannot be null");
        }

        String trimmed = userInput.trim();

        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Input cannot be empty");
        }

        if (trimmed.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Input exceeds maximum length of " + MAX_LENGTH);
        }

        if (!ALLOWED_PATTERN.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("Input contains disallowed characters");
        }

        if (!ALLOWED_STRING_VALUES.contains(trimmed)) {
            throw new IllegalArgumentException("Input not in allowed values list");
        }

        List<String> dangerousKeywords = Arrays.asList(
                "select", "insert", "update", "delete", "drop", "create",
                "alter", "exec", "execute", "union", "where", "from", "into",
                "values", "table", "database", "schema", "grant", "revoke",
                "script", "declare", "cast", "convert"
        );

        String lowerInput = trimmed.toLowerCase();
        for (String keyword : dangerousKeywords) {
            if (lowerInput.contains(keyword)) {
                throw new IllegalArgumentException("Input contains disallowed SQL keyword: " + keyword);
            }
        }

        return trimmed;
    }
}