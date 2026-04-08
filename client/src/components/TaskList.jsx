import TaskCard from "./TaskCard";

export default function TaskList({
  tasks,
  onDelete,
  onStatusChange,
  onAssignChange
}) {
  return (
    <div>
      <h3>Your Tasks</h3>

      {tasks.length === 0 ? (
        <p>No tasks yet</p>
      ) : (
        tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onAssignChange={onAssignChange}
          />
        ))
      )}
    </div>
  );
}