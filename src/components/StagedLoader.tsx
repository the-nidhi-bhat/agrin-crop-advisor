import React from "react";

interface StagedLoaderProps {
  currentStep: number;
}

const steps = [
  "Uploading photo...",
  "Analyzing disease...",
  "Preparing local advice...",
  "Generating audio..."
];

export const StagedLoader: React.FC<StagedLoaderProps> = ({ currentStep }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="text-3xl animate-bounce">🌱</div>
      <div className="w-full max-w-sm space-y-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <div 
              key={index} 
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-300 ${isActive ? 'bg-green-100 border border-green-300' : isDone ? 'opacity-50' : 'opacity-30'}`}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full ${isDone ? 'bg-green-600 text-white' : isActive ? 'bg-green-400 animate-pulse text-white' : 'bg-gray-200'}`}>
                {isDone ? '✓' : index + 1}
              </div>
              <span className={`text-lg font-medium ${isActive ? 'text-green-800' : 'text-gray-700'}`}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
