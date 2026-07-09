import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface OnboardingProgressTrackerProps {
  steps: OnboardingStep[];
  className?: string;
}

export function OnboardingProgressTracker({ steps, className }: OnboardingProgressTrackerProps) {
  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className={cn("bg-burgundy-800 rounded-lg p-6 border border-burgundy-700", className)}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Event Planning Progress</h3>
          <span className="text-sm text-burgundy-200">
            {completedSteps} of {totalSteps} steps completed
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-burgundy-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-white to-gray-100 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="text-sm text-burgundy-200 mt-1">
          {Math.round(progressPercentage)}% complete
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={cn(
              "flex items-start space-x-3 p-3 rounded-lg transition-all duration-200",
              step.current && "bg-burgundy-700 border border-burgundy-600",
              step.completed && "bg-burgundy-900/50"
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : step.current ? (
                <Clock className="w-5 h-5 text-white" />
              ) : (
                <Circle className="w-5 h-5 text-burgundy-400" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className={cn(
                  "text-sm font-medium",
                  step.completed ? "text-contrast-light" : step.current ? "text-contrast-light" : "text-burgundy-300"
                )}>
                  {step.title}
                </h4>
                {step.current && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                    Current Step
                  </span>
                )}
              </div>
              <p className={cn(
                "text-xs mt-1",
                step.completed ? "text-burgundy-200" : step.current ? "text-burgundy-200" : "text-burgundy-400"
              )}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps Hint */}
      {completedSteps < totalSteps && (
        <div className="mt-6 p-4 bg-burgundy-900/50 rounded-lg border border-burgundy-600">
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">What's Next?</p>
              <p className="text-xs text-burgundy-200 mt-1">
                Complete the current step to continue your event planning journey. Our team will review your information and assign a dedicated planner.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {completedSteps === totalSteps && (
        <div className="mt-6 p-4 bg-white/10 rounded-lg border border-white/30">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Congratulations!</p>
              <p className="text-xs text-burgundy-200 mt-1">
                You've completed all steps. A dedicated Event Perfekt planner will be assigned to bring your vision to life.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}