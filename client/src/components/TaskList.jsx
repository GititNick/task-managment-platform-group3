import TaskCard from "./TaskCard";

export default function TaskList({
  tasks,
  onDelete,
  onStatusChange,
  onAssignChange,
  onAddSubtask
}) {
  const topLevelTasks = tasks.filter((task) => task.parent_task_id == null);
  const subtasksByParent = tasks.reduce((acc, task) => {
    if (task.parent_task_id == null) return acc;
    const parentId = String(task.parent_task_id);
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(task);
    return acc;
  }, {});

  return (
    <div>
      <h3>Your Tasks</h3>

      {tasks.length === 0 ? (
        <p>No tasks yet</p>
      ) : (
        topLevelTasks.map((task) => (
          <div key={task.id} style={{ marginBottom: "16px" }}>
            <TaskCard
              task={task}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onAssignChange={onAssignChange}
              onAddSubtask={onAddSubtask}
            />
            {(subtasksByParent[String(task.id)] || []).map((subtask) => (
              <div key={subtask.id} style={{ marginLeft: "24px", marginTop: "10px" }}>
                <TaskCard
                  task={subtask}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onAssignChange={onAssignChange}
                  onAddSubtask={onAddSubtask}
                  isSubtask
                />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
