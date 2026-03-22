import { GoogleGenAI, Modality } from "@google/genai";
import { toast } from "sonner";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class VoiceService {
  private static recognition: any = null;
  private static synth = window.speechSynthesis;
  private static isListeningState = false;
  private static audioContext: AudioContext | null = null;
  private static onResultCallback: ((text: string) => void) | null = null;
  private static onEndCallback: (() => void) | null = null;

  static initSTT(onResult: (text: string) => void, onEnd: () => void) {
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;

    if (this.recognition) return; // Already initialized

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListeningState = true;
    };

    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (this.onResultCallback) this.onResultCallback(text);
    };

    this.recognition.onend = () => {
      this.isListeningState = false;
      if (this.onEndCallback) this.onEndCallback();
    };

    this.recognition.onerror = (event: any) => {
      this.isListeningState = false;
      if (event.error !== 'no-speech') {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please click the mic icon to grant permission.");
        }
      }
      if (this.onEndCallback) this.onEndCallback();
    };
  }

  static async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately, we just wanted the permission
      return true;
    } catch (err) {
      console.error("Microphone permission denied", err);
      return false;
    }
  }

  static async startListening() {
    if (this.recognition && !this.isListeningState) {
      try {
        // Check permission state if possible
        if (navigator.permissions && (navigator.permissions as any).query) {
          const status = await navigator.permissions.query({ name: 'microphone' as any });
          if (status.state === 'denied') {
            toast.error("Microphone access is blocked. Please enable it in your browser settings.");
            return;
          }
        }

        this.recognition.start();
      } catch (e: any) {
        if (e.name === 'NotAllowedError' || e.message?.includes('not-allowed')) {
          const granted = await this.requestPermission();
          if (granted) {
            try {
              this.recognition.start();
            } catch (retryErr) {
              console.error("Retry failed", retryErr);
            }
          }
        }
      }
    }
  }

  static stopListening() {
    if (this.recognition && this.isListeningState) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Silently handle stop errors
      }
      this.isListeningState = false;
    }
  }

  /**
   * S+ Voice OS - Text-to-Speech using Gemini 2.5 Flash TTS
   * Decodes raw PCM data from Gemini and plays it using Web Audio API
   */
  static async speak(text: string): Promise<void> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say naturally and professionally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        await this.playPcmAudio(base64Audio);
      } else {
        this.fallbackSpeak(text);
      }
    } catch (error) {
      console.error("Gemini TTS error, falling back to Web Speech API", error);
      this.fallbackSpeak(text);
    }
  }

  private static async playPcmAudio(base64: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Int16Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      // Assuming 16-bit PCM Little Endian
      const low = binaryString.charCodeAt(i);
      const high = binaryString.charCodeAt(i + 1);
      bytes[i / 2] = (high << 8) | low;
    }

    // Convert Int16 to Float32 for Web Audio API
    const float32Data = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      float32Data[i] = bytes[i] / 32768;
    }

    const buffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  }

  private static fallbackSpeak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    this.synth.speak(utterance);
  }
}
