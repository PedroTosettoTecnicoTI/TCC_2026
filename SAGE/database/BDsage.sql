
CREATE DATABASE IF NOT EXISTS sage_db;
USE sage_db;



CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Store hashed passwords
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_role (role)
);



CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL, -- Format: 000.000.000-00
    email VARCHAR(100),
    telefone VARCHAR(15), -- Format: (00) 00000-0000
    data_nascimento DATE,
    endereco TEXT,
    responsavel VARCHAR(100),
    telefone_responsavel VARCHAR(15),
    responsavel_falecido ENUM('sim', 'não') DEFAULT 'não',
    created_by INT, -- User who created the record
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_nome (nome),
    INDEX idx_cpf (cpf),
    INDEX idx_responsavel (responsavel),
    INDEX idx_data_nascimento (data_nascimento),
    INDEX idx_is_active (is_active)
);



CREATE TABLE IF NOT EXISTS audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT'),
    table_name VARCHAR(50),
    record_id INT,
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_record (table_name, record_id)
);



CREATE TABLE IF NOT EXISTS backup_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    backup_file VARCHAR(255),
    backup_size BIGINT,
    record_count INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_created_at (created_at)
);



CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'int', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
);



INSERT INTO users (username, password, role) 
VALUES ('admin', '$2y$10$YourHashedPasswordHere', 'admin')
ON DUPLICATE KEY UPDATE id = id;



INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('system_name', 'EduArchiv', 'string', 'System display name'),
('system_version', '2.0', 'string', 'Current system version'),
('default_theme', 'light', 'string', 'Default theme (light/dark)'),
('items_per_page', '20', 'int', 'Number of items per page in tables'),
('backup_enabled', 'true', 'boolean', 'Enable automatic backups'),
('backup_frequency', 'daily', 'string', 'Backup frequency (daily/weekly/monthly)'),
('session_timeout', '30', 'int', 'Session timeout in minutes')
ON DUPLICATE KEY UPDATE setting_key = setting_key;



CREATE INDEX idx_students_search ON students(nome, cpf, responsavel);
CREATE INDEX idx_audit_user_date ON audit_log(user_id, created_at);



CREATE OR REPLACE VIEW vw_active_students AS
SELECT 
    id,
    nome,
    cpf,
    email,
    telefone,
    DATE_FORMAT(data_nascimento, '%d/%m/%Y') AS data_nascimento_formatada,
    endereco,
    responsavel,
    telefone_responsavel,
    responsavel_falecido,
    created_at,
    updated_at
FROM students
WHERE is_active = TRUE;


CREATE OR REPLACE VIEW vw_students_by_responsible AS
SELECT 
    responsavel_falecido AS status,
    COUNT(*) AS total,
    CASE 
        WHEN responsavel_falecido = 'sim' THEN 'Responsável Falecido'
        ELSE 'Responsável Vivo'
    END AS status_descricao
FROM students
WHERE is_active = TRUE
GROUP BY responsavel_falecido;


CREATE OR REPLACE VIEW vw_recent_students AS
SELECT 
    s.*,
    u.username AS created_by_username
FROM students s
LEFT JOIN users u ON s.created_by = u.id
WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY s.created_at DESC;


CREATE PROCEDURE sp_search_students(
    IN p_nome VARCHAR(100),
    IN p_cpf VARCHAR(14),
    IN p_responsavel VARCHAR(100),
    IN p_data_nascimento DATE
)
BEGIN
    SELECT * FROM vw_active_students
    WHERE (p_nome IS NULL OR nome LIKE CONCAT('%', p_nome, '%'))
      AND (p_cpf IS NULL OR cpf LIKE CONCAT('%', p_cpf, '%'))
      AND (p_responsavel IS NULL OR responsavel LIKE CONCAT('%', p_responsavel, '%'))
      AND (p_data_nascimento IS NULL OR data_nascimento = p_data_nascimento)
    ORDER BY nome;
END 


CREATE PROCEDURE sp_audit_log(
    IN p_user_id INT,
    IN p_action VARCHAR(20),
    IN p_table_name VARCHAR(50),
    IN p_record_id INT,
    IN p_old_data JSON,
    IN p_new_data JSON,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT
)
BEGIN
    INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data, p_ip_address, p_user_agent);
END 


CREATE PROCEDURE sp_update_student(
    IN p_student_id INT,
    IN p_nome VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_telefone VARCHAR(15),
    IN p_endereco TEXT,
    IN p_responsavel VARCHAR(100),
    IN p_telefone_responsavel VARCHAR(15),
    IN p_responsavel_falecido ENUM('sim', 'não'),
    IN p_user_id INT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT
)
BEGIN
    DECLARE v_old_data JSON;
    DECLARE v_new_data JSON;
    
    
    SELECT JSON_OBJECT(
        'nome', nome,
        'email', email,
        'telefone', telefone,
        'endereco', endereco,
        'responsavel', responsavel,
        'telefone_responsavel', telefone_responsavel,
        'responsavel_falecido', responsavel_falecido
    ) INTO v_old_data
    FROM students WHERE id = p_student_id;
    
    
    UPDATE students 
    SET 
        nome = p_nome,
        email = p_email,
        telefone = p_telefone,
        endereco = p_endereco,
        responsavel = p_responsavel,
        telefone_responsavel = p_telefone_responsavel,
        responsavel_falecido = p_responsavel_falecido
    WHERE id = p_student_id;
    
    
    SET v_new_data = JSON_OBJECT(
        'nome', p_nome,
        'email', p_email,
        'telefone', p_telefone,
        'endereco', p_endereco,
        'responsavel', p_responsavel,
        'telefone_responsavel', p_telefone_responsavel,
        'responsavel_falecido', p_responsavel_falecido
    );
    
    
    CALL sp_audit_log(p_user_id, 'UPDATE', 'students', p_student_id, v_old_data, v_new_data, p_ip_address, p_user_agent);
END //


CREATE PROCEDURE sp_delete_student(
    IN p_student_id INT,
    IN p_user_id INT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT
)
BEGIN
    DECLARE v_old_data JSON;
    
    
    SELECT JSON_OBJECT('nome', nome, 'cpf', cpf) INTO v_old_data
    FROM students WHERE id = p_student_id;
    
   
    UPDATE students SET is_active = FALSE WHERE id = p_student_id;
    
   
    CALL sp_audit_log(p_user_id, 'DELETE', 'students', p_student_id, v_old_data, NULL, p_ip_address, p_user_agent);
END 


CREATE PROCEDURE sp_dashboard_stats()
BEGIN
    
    SELECT COUNT(*) AS total_students FROM students WHERE is_active = TRUE;
    
   
    SELECT responsavel_falecido, COUNT(*) AS count 
    FROM students 
    WHERE is_active = TRUE 
    GROUP BY responsavel_falecido;
    

    SELECT DATE(created_at) AS date, COUNT(*) AS count
    FROM students
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
    
    SELECT COUNT(*) AS active_users FROM users WHERE is_active = TRUE;
END 

CREATE TRIGGER tr_students_before_update 
BEFORE UPDATE ON students
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END 

CREATE TRIGGER tr_users_before_delete
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
    DECLARE admin_count INT;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' AND is_active = TRUE;
    IF OLD.role = 'admin' AND admin_count <= 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot delete the last admin user';
    END IF;
END 


CREATE FUNCTION fn_calculate_age(p_birth_date DATE) 
RETURNS INT
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_birth_date, CURDATE());
END 


CREATE FUNCTION fn_format_cpf(p_cpf VARCHAR(14))
RETURNS VARCHAR(14)
DETERMINISTIC
BEGIN
    IF p_cpf IS NULL OR p_cpf = '' THEN
        RETURN NULL;
    END IF;
    

    SET p_cpf = REGEXP_REPLACE(p_cpf, '[^0-9]', '');
    
    -- Format CPF
    IF LENGTH(p_cpf) = 11 THEN
        RETURN CONCAT(
            SUBSTRING(p_cpf, 1, 3), '.',
            SUBSTRING(p_cpf, 4, 3), '.',
            SUBSTRING(p_cpf, 7, 3), '-',
            SUBSTRING(p_cpf, 10, 2)
        );
    END IF;
    
    RETURN p_cpf;
END //


CREATE FUNCTION fn_get_user_name(p_user_id INT)
RETURNS VARCHAR(50)
DETERMINISTIC
BEGIN
    DECLARE v_username VARCHAR(50);
    SELECT username INTO v_username FROM users WHERE id = p_user_id;
    RETURN v_username;
END 