import React from "react";

/**
 * Props:
 * - task, onTaskChange
 * - mode, onModeChange
 * - fontScale (0|1|2), onFontScale(newVal)
 * - tasksMap (object like { key: {key,label,...} })
 * - disabled: boolean (usually isSubmitted || isRunning)
 */
export default function Controls({
  task,
  onTaskChange,
  mode,
  onModeChange,
  fontScale,
  onFontScale,
  tasksMap,
  disabled,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <label className="flex flex-col">
        <span className="text-sm font-medium mb-1">Task</span>
        <select
          className="rounded-md border bg-background px-3 py-2"
          value={task}
          onChange={(e) => onTaskChange(e.target.value)}
          disabled={disabled}
        >
          {Object.values(tasksMap).map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="text-sm font-medium mb-1">Mode</span>
        <select
          className="rounded-md border bg-background px-3 py-2"
          value={mode}
          onChange={(e) => onModeChange(e.target.value)}
          disabled={disabled}
        >
          <option value="practice">Practice</option>
          <option value="exam">Exam</option>
        </select>
      </label>

      <div className="flex flex-col">
        <span className="text-sm font-medium mb-1">Font size</span>
        <div className="inline-flex rounded-md border overflow-hidden">
          <button
            type="button"
            className="px-3 py-2 disabled:opacity-50"
            onClick={() => onFontScale(Math.max(0, fontScale - 1))}
            disabled={fontScale === 0}
          >
            A-
          </button>
          <div className="px-3 py-2 border-l border-r">
            {fontScale === 0 ? "Base" : fontScale === 1 ? "Large" : "XL"}
          </div>
          <button
            type="button"
            className="px-3 py-2 disabled:opacity-50"
            onClick={() => onFontScale(Math.min(2, fontScale + 1))}
            disabled={fontScale === 2}
          >
            A+
          </button>
        </div>
      </div>
    </div>
  );
}
