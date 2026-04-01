export default function TaskCard({ task }) {
  return (
    <div style={{
      border: "1px solid #ccc",
      padding: "10px",
      marginBottom: "10px",
      borderRadius: "8px"
    }}>
      <h4>{task.title}</h4>
      <p>Status: {task.status}</p>
    </div>
  );
}
