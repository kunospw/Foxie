import React, { useState, useEffect } from "react";

const Pomodoro = () => {
  const [time, setTime] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setInterval(() => {
        setTime((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setTime(25 * 60);
    setIsRunning(false);
  };

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="text-center">
      <h3 className="text-lg font-bold text-white mb-2">Pomodoro Timer</h3>
      <p className="text-xl text-[#f06937]">
        {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      </p>
      <div className="mt-4 space-x-2">
        <button
          onClick={toggleTimer}
          className="bg-[#f06937] text-white px-4 py-2 rounded hover:bg-opacity-90"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Pomodoro;
