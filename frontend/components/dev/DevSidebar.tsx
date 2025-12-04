"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Play,
  RotateCcw,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Copy,
  Sparkles,
  Loader2,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { InterviewConfig, Question, QuestionType, InterviewSetup } from "@/lib/types";

// =============================================================================
// TYPES
// =============================================================================

interface DevSidebarProps {
  config: InterviewConfig;
  onConfigChange: (config: InterviewConfig) => void;
  onRestart: () => void;
  onTriggerNode?: (node: string) => void;
  currentQuestion?: Question | null;
  interviewState?: {
    currentQuestionIndex: number;
    isComplete: boolean;
    messagesCount: number;
  };
}

interface TestScenario {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "number_scale", label: "Number Scale (1-10)" },
  { value: "long_answer", label: "Long Answer" },
  { value: "short_answer", label: "Short Answer" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_select", label: "Single Select" },
  { value: "phone_number", label: "Phone Number" },
];

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "short_valid",
    label: "Valid Short Answer",
    description: "Brief, direct response",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-green-400",
  },
  {
    id: "long_detailed",
    label: "Detailed Answer",
    description: "Thoughtful, multi-sentence response",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-blue-400",
  },
  {
    id: "vague_incomplete",
    label: "Vague/Incomplete",
    description: "Tests follow-up logic",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-yellow-400",
  },
  {
    id: "skip_request",
    label: "Skip Request",
    description: "Politely decline to answer",
    icon: <ChevronRight className="h-4 w-4" />,
    color: "text-slate-400",
  },
  {
    id: "eeoc_concern",
    label: "EEOC Concern",
    description: "Mentions discrimination",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-400",
  },
  {
    id: "incident_report",
    label: "Incident Report",
    description: "Safety/harassment concern",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-orange-400",
  },
  {
    id: "emotional",
    label: "Emotional Response",
    description: "Shows strong feelings",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-pink-400",
  },
  {
    id: "off_topic",
    label: "Off Topic",
    description: "Unrelated response",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-400",
  },
  {
    id: "multilingual",
    label: "Multilingual",
    description: "Contains non-English text",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-cyan-400",
  },
  {
    id: "invalid_format",
    label: "Invalid Format",
    description: "Wrong format for question type",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-400",
  },
];

// =============================================================================
// API FUNCTION
// =============================================================================

async function generateTestResponse(
  scenario: string,
  question: Question
): Promise<string> {
  const response = await fetch("/api/generate-test-response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenario,
      questionType: question.type,
      questionText: question.text,
      options: question.options,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate response");
  }

  const data = await response.json();
  return data.response;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DevSidebar({
  config,
  onConfigChange,
  onRestart,
  onTriggerNode,
  currentQuestion,
  interviewState,
}: DevSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("setup");
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  
  // Generate Question state
  const [showGenerateQuestion, setShowGenerateQuestion] = useState(false);
  const [generateType, setGenerateType] = useState<QuestionType>("short_answer");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // New question state
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    type: "short_answer",
    text: "",
    max_followups: 0,
  });

  // =============================================================================
  // RESIZE HANDLERS
  // =============================================================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.min(Math.max(e.clientX, 280), 600);
    setSidebarWidth(newWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const updateConfig = (updates: Partial<InterviewConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const updateSetup = (updates: Partial<InterviewSetup>) => {
    const currentSetup = config.setup || { companyName: "", jobTitle: "" };
    updateConfig({ setup: { ...currentSetup, ...updates } });
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...config.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    updateConfig({ questions: newQuestions });
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = config.questions.filter((_, i) => i !== index);
    updateConfig({ questions: newQuestions });
    setExpandedQuestion(null);
  };

  const addQuestion = () => {
    if (!newQuestion.text || !newQuestion.type) return;
    const question: Question = {
      type: newQuestion.type as QuestionType,
      text: newQuestion.text,
      max_followups: newQuestion.max_followups || 0,
      group: newQuestion.group,
      options: newQuestion.type === "single_select" ? newQuestion.options || [] : undefined,
    };
    updateConfig({ questions: [...config.questions, question] });
    setNewQuestion({ type: "short_answer", text: "", max_followups: 0 });
    setShowAddQuestion(false);
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.questions.length) return;
    const newQuestions = [...config.questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    updateConfig({ questions: newQuestions });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Only update if changed to prevent twitching
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the container, not entering a child
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;
    
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newQuestions = [...config.questions];
    const [draggedItem] = newQuestions.splice(dragIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);
    
    updateConfig({ questions: newQuestions });
    setDraggedIndex(null);
    setDragOverIndex(null);
    setExpandedQuestion(null);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        onConfigChange(imported);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  };

  // Generate a question using AI
  const handleGenerateQuestion = async () => {
    if (!generatePrompt.trim()) {
      alert("Please enter a description of what you want to ask");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: generateType,
          prompt: generatePrompt,
          interviewType: config.interview_type,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate question");

      const data = await response.json();
      
      // Add the generated question
      const question: Question = {
        type: generateType,
        text: data.questionText,
        max_followups: generateType === "long_answer" || generateType === "number_scale" ? 1 : 0,
        options: data.options,
      };
      
      updateConfig({ questions: [...config.questions, question] });
      
      // Reset the form
      setGeneratePrompt("");
      setShowGenerateQuestion(false);
    } catch (error) {
      console.error("Failed to generate question:", error);
      alert("Failed to generate question. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate and inject AI response
  const handleGenerateAndInject = async (scenarioId: string) => {
    if (!currentQuestion) {
      alert("No active question to generate response for");
      return;
    }

    setLoadingScenario(scenarioId);
    setGeneratedPreview(null);
    setPreviewExpanded(false);

    try {
      const response = await generateTestResponse(scenarioId, currentQuestion);
      setGeneratedPreview(response);
      setPreviewExpanded(false);
      // Automatically inject after showing preview
      onTriggerNode?.(`inject:${response}`);
    } catch (error) {
      console.error("Failed to generate response:", error);
      alert("Failed to generate test response. Check console for details.");
    } finally {
      setLoadingScenario(null);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[9999] bg-slate-900 text-white p-2 rounded-r-lg shadow-lg hover:bg-slate-800 transition-colors"
        title="Open Dev Panel"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed left-0 top-0 bottom-0 bg-slate-900 text-slate-100 shadow-2xl z-[9999] flex flex-col"
      style={{ fontSize: "13px", width: `${sidebarWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-purple-500 transition-colors ${
          isResizing ? "bg-purple-500" : "bg-transparent hover:bg-purple-500/50"
        }`}
      />
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-400" />
          <span className="font-semibold">Dev Panel</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-800 rounded"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Interview State */}
      {interviewState && (
        <div className="p-3 bg-slate-800/50 border-b border-slate-700 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Question</span>
            <span>{interviewState.currentQuestionIndex + 1} / {config.questions.length}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-slate-400">Messages</span>
            <span>{interviewState.messagesCount}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-slate-400">Status</span>
            <span className={interviewState.isComplete ? "text-green-400" : "text-yellow-400"}>
              {interviewState.isComplete ? "Complete" : "In Progress"}
            </span>
          </div>
          {currentQuestion && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <span className="text-slate-400">Current Type:</span>
              <span className="ml-1 text-purple-400">{currentQuestion.type}</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { id: "setup", label: "Setup" },
          { id: "questions", label: "Questions" },
          { id: "triggers", label: "Actions" },
          { id: "settings", label: "Settings" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeSection === tab.id
                ? "bg-slate-800 text-white border-b-2 border-purple-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Setup Tab */}
        {activeSection === "setup" && (
          <div className="p-3 space-y-4">
            <div className="text-xs text-slate-400 mb-4">
              Configure the basic interview information that will be used in prompts and messages.
            </div>

            {/* Company Name */}
            <div>
              <Label className="text-xs text-slate-400">Company Name *</Label>
              <Input
                value={config.setup?.companyName || ""}
                onChange={(e) => updateSetup({ companyName: e.target.value })}
                placeholder="e.g., Acme Inc."
                className="mt-1 bg-slate-700 border-slate-600 text-sm"
              />
            </div>

            {/* Job Title */}
            <div>
              <Label className="text-xs text-slate-400">Job Title / Position *</Label>
              <Input
                value={config.setup?.jobTitle || ""}
                onChange={(e) => updateSetup({ jobTitle: e.target.value })}
                placeholder="e.g., Senior Software Engineer"
                className="mt-1 bg-slate-700 border-slate-600 text-sm"
              />
            </div>

            {/* Interviewer Name */}
            <div>
              <Label className="text-xs text-slate-400">Interviewer Name (optional)</Label>
              <Input
                value={config.setup?.interviewerName || ""}
                onChange={(e) => updateSetup({ interviewerName: e.target.value || undefined })}
                placeholder="e.g., Alex"
                className="mt-1 bg-slate-700 border-slate-600 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">The AI interviewer&apos;s name</p>
            </div>

            {/* Candidate Name */}
            <div>
              <Label className="text-xs text-slate-400">Candidate Name (optional)</Label>
              <Input
                value={config.setup?.candidateName || ""}
                onChange={(e) => updateSetup({ candidateName: e.target.value || undefined })}
                placeholder="e.g., Jordan"
                className="mt-1 bg-slate-700 border-slate-600 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">Will personalize the interview if provided</p>
            </div>

            {/* Setup Status */}
            <div className="pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                {config.setup?.companyName && config.setup?.jobTitle ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">Setup complete</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400">Please fill in required fields</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeSection === "questions" && (
          <div className="p-3 space-y-2">
            {/* Question List */}
            {config.questions.map((q, index) => (
              <div key={index} className="relative">
                {/* Drop zone indicator - shows above when dragging from below (moving up) */}
                {draggedIndex !== null && draggedIndex !== index && dragOverIndex === index && draggedIndex > index && (
                  <div className="mb-2 h-12 rounded-lg border-2 border-dashed border-purple-500 bg-purple-500/10 flex items-center justify-center animate-pulse">
                    <span className="text-xs text-purple-400 font-medium">Drop here</span>
                  </div>
                )}
                
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-slate-800 rounded-lg overflow-hidden transition-all duration-150 ${
                    draggedIndex === index ? "opacity-40 scale-[0.98] ring-2 ring-purple-500/50" : ""
                  } ${
                    dragOverIndex === index && draggedIndex !== index ? "transform scale-[1.01]" : ""
                  }`}
                >
                {/* Question Header */}
                <div
                  className="p-3 flex items-center gap-2 cursor-pointer hover:bg-slate-700/50"
                  onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                >
                  <GripVertical className="h-4 w-4 text-slate-500 cursor-grab active:cursor-grabbing" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-purple-400 mb-0.5">{q.type}</div>
                    <div className="truncate text-sm">{q.text}</div>
                  </div>
                  {expandedQuestion === index ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>

                {/* Expanded Edit Form */}
                {expandedQuestion === index && (
                  <div className="p-3 pt-0 space-y-3 border-t border-slate-700">
                    {/* Type */}
                    <div>
                      <Label className="text-xs text-slate-400">Type</Label>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(index, { type: e.target.value as QuestionType })}
                        className="w-full mt-1 bg-slate-700 border-slate-600 rounded text-sm p-2"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Text */}
                    <div>
                      <Label className="text-xs text-slate-400">Question Text</Label>
                      <Textarea
                        value={q.text}
                        onChange={(e) => updateQuestion(index, { text: e.target.value })}
                        className="mt-1 bg-slate-700 border-slate-600 text-sm min-h-[60px]"
                      />
                    </div>

                    {/* Max Followups */}
                    <div>
                      <Label className="text-xs text-slate-400">Max Follow-ups</Label>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={q.max_followups}
                        onChange={(e) => updateQuestion(index, { max_followups: parseInt(e.target.value) || 0 })}
                        className="mt-1 bg-slate-700 border-slate-600 text-sm"
                      />
                    </div>

                    {/* Group */}
                    <div>
                      <Label className="text-xs text-slate-400">Group (optional)</Label>
                      <Input
                        value={q.group || ""}
                        onChange={(e) => updateQuestion(index, { group: e.target.value || undefined })}
                        placeholder="e.g., Leadership"
                        className="mt-1 bg-slate-700 border-slate-600 text-sm"
                      />
                    </div>

                    {/* Options for single_select */}
                    {q.type === "single_select" && (
                      <div>
                        <Label className="text-xs text-slate-400">Options (one per line)</Label>
                        <Textarea
                          value={(q.options || []).join("\n")}
                          onChange={(e) => updateQuestion(index, { 
                            options: e.target.value.split("\n").filter(Boolean) 
                          })}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          className="mt-1 bg-slate-700 border-slate-600 text-sm min-h-[80px]"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => moveQuestion(index, "up")}
                        disabled={index === 0}
                        className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ↑ Up
                      </button>
                      <button
                        onClick={() => moveQuestion(index, "down")}
                        disabled={index === config.questions.length - 1}
                        className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ↓ Down
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => deleteQuestion(index)}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                </div>
                
                {/* Drop zone indicator - shows below when dragging from above (moving down) */}
                {draggedIndex !== null && draggedIndex !== index && dragOverIndex === index && draggedIndex < index && (
                  <div className="mt-2 h-12 rounded-lg border-2 border-dashed border-purple-500 bg-purple-500/10 flex items-center justify-center animate-pulse">
                    <span className="text-xs text-purple-400 font-medium">Drop here</span>
                  </div>
                )}
              </div>
            ))}

            {/* Add Question */}
            {showAddQuestion ? (
              <div className="bg-slate-800 rounded-lg p-3 space-y-3">
                <div className="font-medium text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-400" />
                  Add Question
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Type</Label>
                  <select
                    value={newQuestion.type}
                    onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value as QuestionType })}
                    className="w-full mt-1 bg-slate-700 border-slate-600 rounded text-sm p-2"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Question Text</Label>
                  <Textarea
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                    placeholder="Enter your question..."
                    className="mt-1 bg-slate-700 border-slate-600 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Max Follow-ups</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={newQuestion.max_followups}
                    onChange={(e) => setNewQuestion({ ...newQuestion, max_followups: parseInt(e.target.value) || 0 })}
                    className="mt-1 bg-slate-700 border-slate-600 text-sm"
                  />
                </div>

                {newQuestion.type === "single_select" && (
                  <div>
                    <Label className="text-xs text-slate-400">Options (one per line)</Label>
                    <Textarea
                      value={(newQuestion.options || []).join("\n")}
                      onChange={(e) => setNewQuestion({ 
                        ...newQuestion, 
                        options: e.target.value.split("\n").filter(Boolean) 
                      })}
                      placeholder="Option 1&#10;Option 2"
                      className="mt-1 bg-slate-700 border-slate-600 text-sm"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={addQuestion}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddQuestion(false)}
                    className="px-3 py-2 text-sm rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddQuestion(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-dashed border-slate-600 text-slate-400 hover:text-slate-100 hover:border-slate-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            )}

            {/* Generate Question with AI */}
            {showGenerateQuestion ? (
              <div className="bg-gradient-to-br from-purple-900/30 to-slate-800 rounded-lg p-3 space-y-3 border border-purple-700/30">
                <div className="font-medium text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Generate Question with AI
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Question Type</Label>
                  <select
                    value={generateType}
                    onChange={(e) => setGenerateType(e.target.value as QuestionType)}
                    className="w-full mt-1 bg-slate-700 border-slate-600 rounded text-sm p-2"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">What do you want to ask?</Label>
                  <Textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="e.g., ask for email address, rate their manager, years of experience..."
                    className="mt-1 bg-slate-700 border-slate-600 text-sm min-h-[60px]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateQuestion}
                    disabled={isGenerating || !generatePrompt.trim()}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowGenerateQuestion(false);
                      setGeneratePrompt("");
                    }}
                    className="px-3 py-2 text-sm rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowGenerateQuestion(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-purple-700/50 bg-purple-900/20 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30 hover:border-purple-600/50 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Generate Question with AI
              </button>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeSection === "settings" && (
          <div className="p-3 space-y-4">
            {/* Interview Type */}
            <div>
              <Label className="text-xs text-slate-400">Interview Type</Label>
              <select
                value={config.interview_type}
                onChange={(e) => updateConfig({ interview_type: e.target.value as "screener" | "exit" })}
                className="w-full mt-1 bg-slate-700 border-slate-600 rounded text-sm p-2"
              >
                <option value="screener">Screener</option>
                <option value="exit">Exit Interview</option>
              </select>
            </div>

            {/* LLM Fallback */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">LLM Fallback Mode</Label>
                <p className="text-xs text-slate-400 mt-0.5">Skip LLM calls, use canned responses</p>
              </div>
              <button
                onClick={() => updateConfig({ llm_fallback: !config.llm_fallback })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  config.llm_fallback ? "bg-purple-600" : "bg-slate-600"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    config.llm_fallback ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Import/Export */}
            <div className="pt-4 border-t border-slate-700 space-y-2">
              <Label className="text-xs text-slate-400">Import / Export</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportConfig}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-md border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <label className="cursor-pointer">
                  <span className="flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-md border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors">
                    <Upload className="h-4 w-4" />
                    Import
                  </span>
                  <input type="file" accept=".json" onChange={importConfig} className="hidden" />
                </label>
              </div>
              <button
                onClick={copyConfig}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <Copy className="h-4 w-4" />
                Copy JSON to Clipboard
              </button>
            </div>
          </div>
        )}

        {/* AI Triggers Tab */}
        {activeSection === "triggers" && (
          <div className="p-3 space-y-3">
            {/* Header with AI badge */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-slate-400">
                Claude generates contextual responses based on the current question
              </span>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Quick Actions</Label>
              
              <button
                onClick={onRestart}
                className="w-full flex items-center justify-start gap-2 px-3 py-2 text-sm rounded-md border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4 text-blue-400" />
                Restart Interview
              </button>

              <button
                onClick={() => onTriggerNode?.("skip")}
                className="w-full flex items-center justify-start gap-2 px-3 py-2 text-sm rounded-md border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors"
              >
                <Play className="h-4 w-4 text-green-400" />
                Skip to Next Question
              </button>
            </div>

            {/* Current Question Context */}
            {currentQuestion && (
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Current Question:</div>
                <div className="text-sm text-slate-200 line-clamp-2">{currentQuestion.text}</div>
                <div className="mt-1 text-xs text-purple-400">{currentQuestion.type}</div>
              </div>
            )}

            {/* Generated Preview */}
            {generatedPreview && (
              <div className="p-2 bg-purple-900/20 rounded-lg border border-purple-700/50">
                <button
                  onClick={() => setPreviewExpanded(!previewExpanded)}
                  className="w-full text-left"
                >
                  <div className="text-xs text-purple-400 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Generated & Sent
                    </span>
                    <span className="text-purple-500">
                      {previewExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                  <div className={`text-xs text-slate-300 ${previewExpanded ? "" : "line-clamp-2"}`}>
                    {generatedPreview}
                  </div>
                </button>
              </div>
            )}

            {/* AI Test Scenarios */}
            <div className="space-y-2 pt-4 border-t border-slate-700">
              <Label className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-400" />
                AI-Generated Test Responses
              </Label>

              {!currentQuestion ? (
                <div className="text-xs text-slate-500 p-3 bg-slate-800/50 rounded text-center">
                  Start an interview to generate contextual test responses
                </div>
              ) : (
                <div className="space-y-1">
                  {TEST_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => handleGenerateAndInject(scenario.id)}
                      disabled={loadingScenario !== null}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingScenario === scenario.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      ) : (
                        <span className={scenario.color}>{scenario.icon}</span>
                      )}
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{scenario.label}</div>
                        <div className="text-xs text-slate-400">{scenario.description}</div>
                      </div>
                      <Sparkles className="h-3 w-3 text-purple-400/50" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Input */}
            <div className="space-y-2 pt-4 border-t border-slate-700">
              <Label className="text-xs text-slate-400">Manual Input</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-input"
                  placeholder="Type a custom response..."
                  className="flex-1 bg-slate-800 border-slate-600 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      if (input.value.trim()) {
                        onTriggerNode?.(`inject:${input.value}`);
                        input.value = "";
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById("manual-input") as HTMLInputElement;
                    if (input?.value.trim()) {
                      onTriggerNode?.(`inject:${input.value}`);
                      input.value = "";
                    }
                  }}
                  className="px-3 py-2 text-sm rounded-md bg-slate-700 text-slate-100 hover:bg-slate-600 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-500 transition-colors"
        >
          <Play className="h-4 w-4" />
          Apply & Restart Interview
        </button>
      </div>
    </div>
  );
}
