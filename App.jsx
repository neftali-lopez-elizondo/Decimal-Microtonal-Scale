import React, { useState, useRef } from "react";

const DecimalKeyboard = () => {
  // Las bases matemáticas del sistema
  const OCTAVE_RATIO = Math.pow(2, 1 / 10);
  const A4_FREQ = 440; // Frecuencia de referencia La 440 Hz
  const LA_TONE = 8;
  const LA_SCALE = 5;

  const [scale, setScale] = useState(LA_SCALE);
  const [waveform, setWaveform] = useState("sine");
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 10 notas por octava, 10 = 100 notas
  const audioCtx = useRef(null);
  const oscillators = useRef({});
  const initialTouch = useRef(null);
  const slidingTone = useRef(null);

  // Función para calcular la frecuencia de cualquier nota
  const getFrequency = (tone, currentScale) => {
    // Calcular la frecuencia base de la escala de referencia (Escala 5)
    const baseFreqScale5 = A4_FREQ / Math.pow(OCTAVE_RATIO, LA_TONE - 1);
    
    // Ajustar la frecuencia base a la escala actual
    const adjustedBase = baseFreqScale5 * Math.pow(2, currentScale - LA_SCALE);
    
    // Calcular la frecuencia final del tono
    return adjustedBase * Math.pow(OCTAVE_RATIO, tone - 1);
  };

  // Lógica para generar las notas basadas en el nivel de zoom
  const generateNotes = (level) => {
    const noteArray = [];
    const totalNotes = 10 * level; 
    for (let i = 0; i < totalNotes; i++) {
      const tone = 1 + (i / level);
      noteArray.push(parseFloat(tone.toFixed(2)));
    }
    return noteArray;
  };

  const playNote = (note) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Evita reproducir si ya hay un oscilador activo para esa nota
    if (oscillators.current[note]) return;

    const osc = audioCtx.current.createOscillator();
    const gainNode = audioCtx.current.createGain();
    
    osc.type = waveform;
    osc.frequency.setValueAtTime(getFrequency(note, scale), audioCtx.current.currentTime);
    osc.connect(gainNode).connect(audioCtx.current.destination);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.current.currentTime);
    osc.start();
    
    oscillators.current[note] = { osc, gainNode };
  };

  const stopNote = (note) => {
    const oscData = oscillators.current[note];
    if (oscData) {
      oscData.gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.current.currentTime + 0.3
      );
      oscData.osc.stop(audioCtx.current.currentTime + 0.3);
      delete oscillators.current[note];
    }
  };

  // Funciones para el deslizamiento microtonal
  const handleTouchStart = (e, note) => {
    e.preventDefault();
    initialTouch.current = {
      x: e.touches[0].pageX,
      tone: note,
    };
    playNote(note);
    slidingTone.current = note;
  };

  const handleTouchMove = (e) => {
    if (!initialTouch.current || !slidingTone.current) return;
    const currentX = e.touches[0].pageX;
    const initialX = initialTouch.current.x;
    const initialTone = initialTouch.current.tone;

    // Calcular la nueva nota basada en la posición horizontal
    const keyWidth = e.target.offsetWidth;
    const slideRatio = (currentX - initialX) / keyWidth;
    const newTone = initialTone + slideRatio;
    
    // Actualizar la frecuencia del oscilador en tiempo real
    const newFreq = getFrequency(newTone, scale);
    const oscData = oscillators.current[initialTone]; // Usamos la nota inicial para la referencia del oscilador
    if (oscData) {
      oscData.osc.frequency.setValueAtTime(newFreq, audioCtx.current.currentTime);
    }
  };

  const handleTouchEnd = () => {
    if (initialTouch.current && slidingTone.current) {
      stopNote(initialTouch.current.tone);
    }
    initialTouch.current = null;
    slidingTone.current = null;
  };

  const notes = generateNotes(zoomLevel);
  const keyWidth = `w-${100 / notes.length}%`; // Ajuste dinámico del ancho de las teclas
  
  return (
    <div className="p-4 bg-gray-100 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Sistema Musical Decimal</h1>
      <div className="mb-4 flex justify-between items-center w-full max-w-sm">
        <button
          onClick={() => setScale((s) => Math.max(1, s - 1))}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors"
        >
          &lt; Escala Anterior
        </button>
        <span className="text-lg font-semibold">Escala {scale}</span>
        <button
          onClick={() => setScale((s) => Math.min(10, s + 1))}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors"
        >
          Escala Siguiente &gt;
        </button>
      </div>
      <div className="mb-4">
        <label className="mr-2 text-gray-700">Onda:</label>
        <select
          value={waveform}
          onChange={(e) => setWaveform(e.target.value)}
          className="px-2 py-1 border border-gray-400 rounded-md"
        >
          <option value="sine">Senoidal</option>
          <option value="square">Cuadrada</option>
          <option value="triangle">Triangular</option>
          <option value="sawtooth">Diente de Sierra</option>
        </select>
        <label className="ml-4 mr-2 text-gray-700">Zoom:</label>
        <select
          value={zoomLevel}
          onChange={(e) => setZoomLevel(parseInt(e.target.value))}
          className="px-2 py-1 border border-gray-400 rounded-md"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
      </div>
      <div 
        className="flex relative bg-white border border-gray-400 rounded-lg shadow-lg"
        style={{ width: '90%', maxWidth: '1000px' }}
      >
        {notes.map((note) => {
          const isLa440 = scale === LA_SCALE && Math.round(note) === LA_TONE && zoomLevel === 1;
          return (
            <div
              key={note}
              onMouseDown={() => playNote(note)}
              onMouseUp={() => stopNote(note)}
              onTouchStart={(e) => handleTouchStart(e, note)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`relative h-48 border-r border-gray-300 flex items-end justify-center select-none cursor-pointer bg-white hover:bg-gray-200 active:bg-gray-300 transition-colors flex-grow`}
              style={{ width: `${100 / notes.length}%` }}
            >
              <span className="mb-2 text-lg font-medium text-gray-700">{note}</span>
              {isLa440 && (
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-gray-600">
        **Toca** una tecla para escuchar una nota. <br/>
        **Desliza** el dedo para un glissando microtonal. <br/>
        **El punto rojo** indica el A440 Hz, el punto central de tu sistema.
      </p>
    </div>
  );
};

export default DecimalKeyboard;
