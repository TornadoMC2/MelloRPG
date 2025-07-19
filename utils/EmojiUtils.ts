export class EmojiUtils {
    // Added index signature [key: string]: string for type safety
    public static nums: { [key: string]: string; } = {
        "1": ":one:", // Note: Blackjack doesn't use '1', but included for completeness if needed elsewhere
        "2": ":two:",
        "3": ":three:",
        "4": ":four:",
        "5": ":five:",
        "6": ":six:",
        "7": ":seven:",
        "8": ":eight:",
        "9": ":nine:",
        "10": ":keycap_ten:",
        "A": ":regional_indicator_a:",
        "J": ":regional_indicator_j:",
        "Q": ":regional_indicator_q:",
        "K": ":regional_indicator_k:",
        "?": "❓" // Added a fallback
    };

    // Added index signature [key: string]: string for type safety
    public static suits: { [key: string]: string; } = {
        "spades": ":spades:",
        "hearts": ":hearts:",
        "diamonds": ":diamonds:",
        "clubs": ":clubs:",
        "unknown": "❓" // Added a fallback
    };
}