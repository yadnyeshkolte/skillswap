-- Database schema for Skill Swap Platform

-- Users table
CREATE TABLE users (
  id VARCHAR2(36) PRIMARY KEY,
  name VARCHAR2(100) NOT NULL,
  email VARCHAR2(100) UNIQUE NOT NULL,
  password VARCHAR2(100) NOT NULL,
  location VARCHAR2(100),
  availability VARCHAR2(100),
  profile_photo VARCHAR2(255),
  is_public NUMBER(1) DEFAULT 1,
  is_banned NUMBER(1) DEFAULT 0,
  ban_reason VARCHAR2(255),
  role VARCHAR2(20) DEFAULT 'user',
  reset_password_token VARCHAR2(100),
  reset_password_expire DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
  id VARCHAR2(36) PRIMARY KEY,
  name VARCHAR2(100) UNIQUE NOT NULL,
  status VARCHAR2(20) DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason VARCHAR2(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User skills (offered) table
CREATE TABLE user_skills_offered (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(36) NOT NULL,
  skill_id VARCHAR2(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_skills_offered_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_offered_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CONSTRAINT uk_user_skills_offered UNIQUE (user_id, skill_id)
);

-- User skills (wanted) table
CREATE TABLE user_skills_wanted (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(36) NOT NULL,
  skill_id VARCHAR2(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_skills_wanted_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_wanted_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CONSTRAINT uk_user_skills_wanted UNIQUE (user_id, skill_id)
);

-- Swap requests table
CREATE TABLE swap_requests (
  id VARCHAR2(36) PRIMARY KEY,
  sender_id VARCHAR2(36) NOT NULL,
  receiver_id VARCHAR2(36) NOT NULL,
  offered_skill_id VARCHAR2(36) NOT NULL,
  wanted_skill_id VARCHAR2(36) NOT NULL,
  message VARCHAR2(500),
  status VARCHAR2(20) DEFAULT 'pending', -- pending, accepted, rejected, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_swap_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_offered_skill FOREIGN KEY (offered_skill_id) REFERENCES skills(id),
  CONSTRAINT fk_swap_wanted_skill FOREIGN KEY (wanted_skill_id) REFERENCES skills(id)
);

-- Feedback table
CREATE TABLE feedback (
  id VARCHAR2(36) PRIMARY KEY,
  swap_id VARCHAR2(36) NOT NULL,
  user_id VARCHAR2(36) NOT NULL,
  rating NUMBER(1) NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment VARCHAR2(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_swap FOREIGN KEY (swap_id) REFERENCES swap_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_feedback_user_swap UNIQUE (user_id, swap_id)
);

-- Platform messages table
CREATE TABLE platform_messages (
  id VARCHAR2(36) PRIMARY KEY,
  title VARCHAR2(100) NOT NULL,
  message VARCHAR2(1000) NOT NULL,
  type VARCHAR2(20) NOT NULL, -- info, warning, alert
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR2(36),
  CONSTRAINT fk_message_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- User message status table (to track which users have read which messages)
CREATE TABLE user_message_status (
  id VARCHAR2(36) PRIMARY KEY,
  user_id VARCHAR2(36) NOT NULL,
  message_id VARCHAR2(36) NOT NULL,
  is_read NUMBER(1) DEFAULT 0,
  read_at TIMESTAMP,
  CONSTRAINT fk_message_status_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_status_message FOREIGN KEY (message_id) REFERENCES platform_messages(id) ON DELETE CASCADE,
  CONSTRAINT uk_user_message UNIQUE (user_id, message_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_user_skills_offered_user ON user_skills_offered(user_id);
CREATE INDEX idx_user_skills_wanted_user ON user_skills_wanted(user_id);
CREATE INDEX idx_swap_requests_sender ON swap_requests(sender_id);
CREATE INDEX idx_swap_requests_receiver ON swap_requests(receiver_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_feedback_swap ON feedback(swap_id);
CREATE INDEX idx_platform_messages_type ON platform_messages(type);

-- Initial admin user (password should be hashed in application code)
-- INSERT INTO users (id, name, email, password, role, is_public)
-- VALUES (SYS_GUID(), 'Admin User', 'admin@skillswap.com', 'change_this_password', 'admin', 0);

-- Initial skills
-- INSERT INTO skills (id, name, status)
-- VALUES (SYS_GUID(), 'JavaScript', 'approved');
-- INSERT INTO skills (id, name, status)
-- VALUES (SYS_GUID(), 'Python', 'approved');
-- INSERT INTO skills (id, name, status)
-- VALUES (SYS_GUID(), 'Graphic Design', 'approved');
-- INSERT INTO skills (id, name, status)
-- VALUES (SYS_GUID(), 'Video Editing', 'approved');
-- INSERT INTO skills (id, name, status)
-- VALUES (SYS_GUID(), 'Photography', 'approved');
-- INSERT INTO skills (id, name, status)
-- VALUES (SYS_GUID(), 'Content Writing', 'approved');