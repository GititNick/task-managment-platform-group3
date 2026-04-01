-- Drop existing tables if they exist (for development/reset)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  auth0_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing
INSERT INTO users (name, email, password) VALUES
  ('John Doe', 'john@example.com', 'hashedpassword123'),
  ('Jane Smith', 'jane@example.com', 'hashedpassword456');

INSERT INTO tasks (user_id, title, description, status, due_date) VALUES
  (1, 'Complete project proposal', 'Write and submit the Q2 project proposal', 'pending', '2026-04-15'),
  (1, 'Review code changes', 'Review pull requests from team members', 'in-progress', '2026-04-05'),
  (2, 'Update documentation', 'Update API documentation for v2.0', 'pending', '2026-04-20'),
  (2, 'Bug fix: Login issue', 'Fix authentication issue on mobile', 'completed', '2026-03-28');

-- Create index on user_id for faster queries
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
