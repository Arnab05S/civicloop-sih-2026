import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

const speechLocales = { en: 'en-IN', hi: 'hi-IN', or: 'or-IN', ta: 'ta-IN', bn: 'bn-IN', mr: 'mr-IN', kn: 'kn-IN', te: 'te-IN', gu: 'gu-IN' };
const languageNames = { en: 'English', hi: 'Hindi', or: 'Odia', ta: 'Tamil', bn: 'Bengali', mr: 'Marathi', kn: 'Kannada', te: 'Telugu', gu: 'Gujarati' };

export default function VoiceNote({ language, detail, setForm }) {
  const recognitionRef = useRef(null);
  const baseDetailRef = useRef('');
  const confirmedRef = useRef([]);
  const interimRef = useRef('');
  const [voiceState, setVoiceState] = useState('idle');
  const locale = speechLocales[language] || 'en-IN';

  const updateDescription = () => {
    const spokenText = [...confirmedRef.current, interimRef.current].filter(Boolean).join(' ').trim();
    setForm(current => ({ ...current, detail: [baseDetailRef.current.trim(), spokenText].filter(Boolean).join(baseDetailRef.current.trim() && spokenText ? ' ' : '') }));
  };

  const start = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setVoiceState('unsupported');
    recognitionRef.current?.abort();
    baseDetailRef.current = detail;
    confirmedRef.current = [];
    interimRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.lang = locale;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setVoiceState('listening');
    recognition.onresult = event => {
      let interim = '';
      const completed = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) completed.push(text);
        else interim += `${interim ? ' ' : ''}${text}`;
      }
      if (completed.length) confirmedRef.current.push(...completed);
      interimRef.current = interim;
      updateDescription();
    };
    recognition.onerror = event => setVoiceState(['not-allowed', 'service-not-allowed'].includes(event.error) ? 'permission' : 'error');
    recognition.onend = () => {
      if (interimRef.current) {
        confirmedRef.current.push(interimRef.current);
        interimRef.current = '';
        updateDescription();
      }
      setVoiceState(current => ['permission', 'error'].includes(current) ? current : 'idle');
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stop = () => recognitionRef.current?.stop();
  useEffect(() => () => recognitionRef.current?.abort(), []);
  const listening = voiceState === 'listening';
  const label = listening ? 'Listening… tap to stop' : 'Record voice note';
  const help = voiceState === 'unsupported' ? 'Voice transcription is not available in this browser. You can still type your report.' : voiceState === 'permission' ? 'Microphone access was blocked. Allow it in your browser settings, then try again.' : voiceState === 'error' ? 'We could not transcribe that recording. Please try again or type your report.' : listening ? 'Your words are appearing live in the description box. Tap again when you are done.' : `Speech is transcribed in ${languageNames[language] || 'English'} (${locale}) and added to the description. Audio is not stored.`;
  return <div className="voice-note"><div><b>Prefer speaking?</b><small>{help}</small></div><button type="button" className={`voice-button ${listening ? 'recording' : ''}`} onClick={listening ? stop : start} aria-pressed={listening}><Mic size={17}/>{label}</button></div>;
}
