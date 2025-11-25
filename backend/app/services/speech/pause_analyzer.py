from typing import List, Dict, Any

def analyze_pauses(word_timestamps: List[Any]) -> Dict[str, Any]:
    """
    Analyze pauses between words based on Whisper timestamps.
    word_timestamps is a list of TranscriptionWord objects with .word, .start, .end attributes
    """
    if not word_timestamps or len(word_timestamps) < 2:
        return {
            "avg_pause_duration": 0.0,
            "max_pause": 0.0,
            "long_pause_count": 0,
            "pause_locations": []
        }

    pauses = []
    pause_locations = []

    for i in range(len(word_timestamps) - 1):
        current_word = word_timestamps[i]
        next_word = word_timestamps[i+1]

        # Access attributes, not dictionary keys
        # TranscriptionWord objects have .word, .start, .end attributes
        try:
            end_time = current_word.end
            start_time = next_word.start
            word_text = current_word.word
        except AttributeError:
            # Fallback to dictionary access if needed
            end_time = current_word.get('end', 0)
            start_time = next_word.get('start', 0)
            word_text = current_word.get('word', '')

        gap = start_time - end_time

        if gap > 0:
            pauses.append(gap)

            # Record significant pauses (> 0.5s)
            if gap > 0.5:
                pause_locations.append({
                    "after_word": word_text,
                    "duration": gap
                })

    if not pauses:
        return {
            "avg_pause_duration": 0.0,
            "max_pause": 0.0,
            "long_pause_count": 0,
            "pause_locations": []
        }

    avg_pause = sum(pauses) / len(pauses)
    max_pause = max(pauses)
    long_pause_count = len([p for p in pauses if p > 0.8]) # Threshold for "long" pause

    return {
        "avg_pause_duration": avg_pause,
        "max_pause": max_pause,
        "long_pause_count": long_pause_count,
        "pause_locations": pause_locations
    }

