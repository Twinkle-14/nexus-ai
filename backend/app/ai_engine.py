import ollama


def analyze_incident(description: str, error_rate_before: str, error_rate_after: str,
                      latency_before: str, latency_after: str, notes: str = ""):
    """
    Sends incident details to the local Llama 3 model and asks it to
    determine a likely root cause, based on the pattern of symptoms.
    """

    prompt = f"""You are an expert Site Reliability Engineer analyzing a production incident.

INCIDENT DETAILS:
Description: {description}
Error Rate: {error_rate_before} -> {error_rate_after}
Latency: {latency_before} -> {latency_after}
Additional Notes: {notes}

Based on this information, provide:
1. A likely ROOT CAUSE (one clear sentence)
2. Your CONFIDENCE level (as a percentage)
3. A RECOMMENDED FIX (one or two sentences)

Format your response EXACTLY like this:
Root Cause: <your answer>
Confidence: <percentage>%
Recommended Fix: <your answer>
"""

    response = ollama.chat(
        model="llama3",
        messages=[{"role": "user", "content": prompt}]
    )

    return {
        "ai_response": response["message"]["content"]
    }
