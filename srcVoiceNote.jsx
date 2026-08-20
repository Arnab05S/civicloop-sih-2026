import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

const speechLocales = { en: 'en-IN', hi: 'hi-IN', or: 'or-IN', ta: 'ta-IN', bn: 'bn-IN', mr: 'mr-IN', kn: 'kn-IN', te: 'te-IN', gu: 'gu-IN' };
const languageNames = { en: 'English', hi: 'Hindi', or: 'Odia', ta: 'Tamil', bn: 'Bengali', mr: 'Marathi', kn: 'Kannada', te: 'Telugu', gu: 'Gujarati' };

export default function VoiceNote({ language, setForm }) {
    const recognitionRef = useRef(null);
    const [voiceState, setVoiceState] = useState('idle');
    const locale = speechLocales[language] || 'en-IN';
    const start = () => {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) return setVoiceState('unsupported');
          recognitionRef.current?.abort();
          const recognition = new SpeechRecognition();
          recognition.lang = locale;
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.onstart = () => setVoiceState('listening');
          recognition.onresult = event => {
                  const transcript = Array.from(event.results).slice(event.resultIndex).filter(result => result.isFinal).map(result => result[0].transcript.trim()).join(' ');
                  if (transcript) setForm(current => ({ ...current, detail: `${current.detail}${current.detail ? ' ' : ''}${transcript}` }));
          };
          recognition.onerror = event => setVoiceState(['not-allowed', 'service-not-allowed'].includes(event.error) ? 'permission' : 'error');
          recognition.onend = () => setVoiceState(current => ['permission', 'error'].includes(current) ? current : 'idle');
          recognitionRef.current = recognition;
          recognition.start();
    };
    const stop = () => recognitionRef.current?.stop();
    useEffect(() => () => recognitionRef.current?.abort(), []);
    const listening = voiceState === 'listening';
    const label = listening ? 'Listening… tap to stop' : 'Record voice note';
    const help = voiceState === 'unsupported' ? 'Voice transcription is not available in this browser. You can still type your report.' : voiceState === 'permission' ? 'Microphone access was blocked. Allow it in your browser settings, then try again.' : voiceState === 'error' ? 'We could not transcribe that recording. Please try again or type your report.' : `Speech is transcribed in ${languageNames[language] || 'English'} (${locale}). Audio is not stored.`;
    return <div className="voice-note"><div><b>Prefer speaking?</b>b><small>{help}</small>small></div>div><button type="button" className={`voice-button ${listening ? 'recording' : ''}`} onClick={listening ? stop : start} aria-pressed={listening}><Mic size={17}/>{label}</button>button></div>div>;
}
</div>
