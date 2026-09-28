"""
IP-SAKTI Voice Service
======================
Standalone voice input/output helper for the Streamlit UI.

Mandatory MVP languages:
- English (en)
- Hindi (hi)
- Marathi (mr)

This module only handles speech I/O.
It does NOT perform IP/RAG reasoning.
"""

from __future__ import annotations

import io
from typing import Dict


SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
}

STT_LANGUAGE_CODES = {
    "en": "en-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
}


def language_name(language_code: str) -> str:
    """Return the display name for a supported language."""
    code = (language_code or "en").strip().lower()
    return SUPPORTED_LANGUAGES.get(code, "English")


def is_language_supported(language_code: str) -> bool:
    """Check whether a language is supported."""
    return (language_code or "").strip().lower() in SUPPORTED_LANGUAGES


def speech_to_text(
    audio_bytes: bytes,
    language_code: str = "en",
) -> str:
    """
    Convert recorded WAV/AIFF/FLAC audio bytes to text.

    Default provider: SpeechRecognition + Google Speech Recognition.
    The provider is isolated here so it can later be replaced with
    Bhashini without changing the IP-SAKTI reasoning pipeline.
    """
    code = (language_code or "en").strip().lower()

    if not is_language_supported(code):
        raise ValueError(
            f"Unsupported language '{language_code}'. "
            f"Supported: {', '.join(SUPPORTED_LANGUAGES)}"
        )

    if not audio_bytes:
        raise ValueError("No audio data was provided.")

    try:
        import speech_recognition as sr
    except ImportError as exc:
        raise RuntimeError(
            "SpeechRecognition is not installed. "
            "Run: pip install SpeechRecognition"
        ) from exc

    recognizer = sr.Recognizer()

    try:
        with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
            audio = recognizer.record(source)
    except Exception as exc:
        raise RuntimeError(
            "Could not read the recorded audio. "
            "Use WAV, AIFF, or FLAC audio."
        ) from exc

    try:
        return recognizer.recognize_google(
            audio,
            language=STT_LANGUAGE_CODES[code],
        ).strip()
    except sr.UnknownValueError as exc:
        raise RuntimeError(
            f"Could not understand the {language_name(code)} speech."
        ) from exc
    except sr.RequestError as exc:
        raise RuntimeError(
            "Speech recognition service is unavailable. "
            "Check the network connection."
        ) from exc


def text_to_speech(
    text: str,
    language_code: str = "en",
) -> bytes:
    """
    Convert grounded answer text to MP3 audio.

    Default provider: gTTS.
    The returned bytes can be passed directly to Streamlit st.audio().
    """
    code = (language_code or "en").strip().lower()

    if not is_language_supported(code):
        raise ValueError(
            f"Unsupported language '{language_code}'. "
            f"Supported: {', '.join(SUPPORTED_LANGUAGES)}"
        )

    text = str(text or "").strip()

    if not text:
        raise ValueError("No text was provided for speech synthesis.")

    try:
        from gtts import gTTS
    except ImportError as exc:
        raise RuntimeError(
            "gTTS is not installed. "
            "Run: pip install gTTS"
        ) from exc

    audio_buffer = io.BytesIO()

    try:
        gTTS(
            text=text,
            lang=code,
            tld="co.in",
            slow=False,
        ).write_to_fp(audio_buffer)
    except Exception as exc:
        raise RuntimeError(
            "Text-to-speech generation failed."
        ) from exc

    audio_buffer.seek(0)
    return audio_buffer.read()
